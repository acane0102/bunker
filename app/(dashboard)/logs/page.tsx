"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Topbar from "../../components/Topbar";

// HELPER: Parche Anti-Safari para evitar el error "Invalid Date"
const getSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  return new Date(dateStr.replace(' ', 'T'));
};

export default function TradeLogs() {
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // SOLUCIÓN HYDRATION ERROR: Inicia en "ALL" y se actualiza después de montar
  const [selectedAccount, setSelectedAccount] = useState("ALL");

  const [displayUnit, setDisplayUnit] = useState("$");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const [filters, setFilters] = useState({ month: "ALL", asset: "ALL", direction: "ALL", result: "ALL", mentor: "ALL" });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const savedAccount = localStorage.getItem("bunker_account");
    if (savedAccount) setSelectedAccount(savedAccount);
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem("bunker_account", selectedAccount);
  }, [selectedAccount, isMounted]);

  // Carga segura: Filtramos estrictamente por user_id
  const fetchData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (data) setTrades(data);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const uniqueMonths = Array.from(new Set(trades.map(t => {
    const d = getSafeDate(t.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))).sort().reverse();
  const uniqueAssets = Array.from(new Set(trades.map(t => t.asset).filter(Boolean))).sort();
  const uniqueMentors = Array.from(new Set(trades.map(t => t.mentor).filter(Boolean))).sort();

  let processedTrades = trades.filter(t => {
    const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
    const d = getSafeDate(t.created_at);
    const tMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const matchAccount = selectedAccount === "ALL" || t.account === selectedAccount;
    const matchMonth = filters.month === "ALL" || tMonth === filters.month;
    const matchAsset = filters.asset === "ALL" || t.asset === filters.asset;
    const matchDir = filters.direction === "ALL" || t.direction === filters.direction;
    const matchResult = filters.result === "ALL" || (filters.result === "WIN" && net > 0) || (filters.result === "LOSS" && net < 0) || (filters.result === "BE" && net === 0);
    const matchMentor = filters.mentor === "ALL" || t.mentor === filters.mentor;
    
    const matchSearch = searchQuery === "" || 
      (t.notes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.tags?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.setup_type?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.asset?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchAccount && matchMonth && matchAsset && matchDir && matchResult && matchMentor && matchSearch;
  });

  processedTrades.sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'created_at') {
      aVal = getSafeDate(a.created_at).getTime();
      bVal = getSafeDate(b.created_at).getTime();
    } else if (sortConfig.key === 'net') {
      aVal = (Number(a.rr_achieved) || 0) - (Number(a.commission) || 0);
      bVal = (Number(b.rr_achieved) || 0) - (Number(b.commission) || 0);
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0; 
  });

  const totalPages = Math.ceil(processedTrades.length / itemsPerPage) || 1;
  const currentTrades = processedTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'asc' ? 'desc' : 'asc' }));
  const toggleSelectAll = () => selectedTrades.length === currentTrades.length ? setSelectedTrades([]) : setSelectedTrades(currentTrades.map(t => t.id));
  const toggleSelectTrade = (id: string) => setSelectedTrades(p => p.includes(id) ? p.filter(tId => tId !== id) : [...p, id]);

  const handleBulkDelete = async () => {
    await supabase.from('trades').delete().in('id', selectedTrades);
    setSelectedTrades([]);
    setIsDeleteModalOpen(false); 
    fetchData();
  };

  const toggleRow = (id: string) => setExpandedRow(prev => prev === id ? null : id);

  const exportToCSV = () => {
    const headers = ['Fecha', 'Sesión', 'Activo', 'Dirección', 'Cuenta', 'Mentor', 'Estrategia', 'Comisión ($)', 'Neto ($)', 'Resultado', 'Etiquetas Psicológicas', 'Notas'];
    const rows = processedTrades.map(t => {
      const netProfit = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      const session = getSession(t.created_at).label;
      const dateStr = getSafeDate(t.created_at).toLocaleString();
      const statusStr = netProfit > 0 ? 'WIN' : netProfit < 0 ? 'LOSS' : 'BE';
      return [
        `"${dateStr}"`, `"${session}"`, `"${t.asset}"`, `"${t.direction || 'BUY'}"`, `"${t.account}"`, `"${t.mentor || 'Propia'}"`, 
        `"${t.setup_type}"`, `"${t.commission || 0}"`, `"${netProfit.toFixed(2)}"`, `"${statusStr}"`, `"${t.tags || ''}"`, `"${t.notes?.replace(/"/g, '""') || ''}"`
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bitacora_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSession = (dateStr: string) => {
    const h = getSafeDate(dateStr).getHours();
    if (h >= 3 && h < 8) return { label: 'LON', color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' };
    if (h >= 8 && h < 16) return { label: 'NY', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' };
    return { label: 'ASIA', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' };
  };

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(m)-1]} ${y}`;
  };

  const totalNet = processedTrades.reduce((acc, t) => acc + ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)), 0);
  const totalCommissions = processedTrades.reduce((acc, t) => acc + (Number(t.commission) || 0), 0);
  const wins = processedTrades.filter(t => ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)) > 0).length;
  const losses = processedTrades.filter(t => ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)) < 0).length;
  const be = processedTrades.filter(t => ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)) === 0).length;
  const winRate = processedTrades.length > 0 ? Math.round((wins / processedTrades.length) * 100) : 0;

  if (!isMounted) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-700 dark:text-slate-300 font-sans pb-10 pl-[250px] relative transition-colors duration-300">
      
      {/* Botón superior disparando evento global (Modo Creación) */}
      <Topbar title="Trade Logs" icon="receipt_long" displayUnit={displayUnit} setDisplayUnit={setDisplayUnit} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} onAddTradeClick={() => window.dispatchEvent(new Event('open-add-trade'))} />

      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl w-full h-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-rose-400 bg-slate-800/50 hover:bg-slate-800 p-2 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">close</span>
            </button>
            <img src={selectedImage} alt="Evidencia" className="w-full h-auto max-h-[85vh] object-contain rounded-xl border border-slate-700 shadow-2xl" />
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] rounded-2xl w-full max-w-md shadow-2xl border border-slate-800/60 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-800/60 flex justify-between items-center">
              <h2 className="font-bold text-white text-base">Eliminar {selectedTrades.length > 1 ? 'operaciones' : 'operación'}</h2>
              <button onClick={() => setIsDeleteModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1.5 rounded-xl transition-colors"><span className="material-symbols-outlined text-sm block">close</span></button>
            </div>
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6"><span className="material-symbols-outlined text-rose-500 text-3xl">warning</span></div>
              <h3 className="text-2xl font-black text-white mb-3">¿Eliminar {selectedTrades.length > 1 ? 'operaciones?' : 'operación?'}</h3>
              <p className="text-sm font-medium text-slate-400 mb-8 max-w-[300px]">Esta acción es permanente y recalculará todas tus estadísticas. ¿Deseas continuar?</p>
              <div className="flex gap-4 w-full justify-center">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-8 py-3 bg-[#1e293b] hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleBulkDelete} className="px-8 py-3 bg-[#ff004d] hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-rose-500/20">Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="pt-24 px-6 max-w-[1200px] mx-auto space-y-4">
        {/* TARJETAS RESUMEN SUPERIOR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex justify-between items-center transition-colors duration-300">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Resumen de Operativa</h2>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">Filtro activo: {processedTrades.length} trades</p>
          </div>
          <div className="flex gap-8 items-center">
            <div className="text-right border-r border-slate-200 dark:border-slate-800 pr-8 hidden md:block">
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Comisiones</div>
              <div className="text-xl font-black text-rose-500">-${totalCommissions.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Neto Total</div>
              <div className={`text-xl font-black ${totalNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalNet > 0 ? '+' : ''}${totalNet.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Win Rate</div>
              <div className="text-xl font-black text-slate-800 dark:text-slate-100">{winRate}%</div>
            </div>
            <div className="flex gap-1.5 text-[10px] font-bold">
              <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20"><span className="text-sm font-black">{wins}</span><span className="text-[8px] uppercase">Wins</span></div>
              <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"><span className="text-sm font-black">{be}</span><span className="text-[8px] uppercase">BE</span></div>
              <div className="flex flex-col items-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20"><span className="text-sm font-black">{losses}</span><span className="text-[8px] uppercase">Loss</span></div>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS Y BÚSQUEDA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center transition-colors duration-300">
          <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-indigo-500 text-lg">tune</span>
          </div>
          <div className="relative group"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">calendar_month</span><select value={filters.month} onChange={e => {setFilters({...filters, month: e.target.value}); setCurrentPage(1);}} className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer shadow-sm"><option value="ALL">Histórico</option>{uniqueMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}</select></div>
          <div className="relative group"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">candlestick_chart</span><select value={filters.asset} onChange={e => {setFilters({...filters, asset: e.target.value}); setCurrentPage(1);}} className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer shadow-sm"><option value="ALL">Activos</option>{uniqueAssets.map(a => <option key={a as string} value={a as string}>{a}</option>)}</select></div>
          <div className="relative group"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">swap_vert</span><select value={filters.direction} onChange={e => {setFilters({...filters, direction: e.target.value}); setCurrentPage(1);}} className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer shadow-sm"><option value="ALL">L & S</option><option value="BUY">Long</option><option value="SELL">Short</option></select></div>
          <div className="relative group"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">offline_bolt</span><select value={filters.result} onChange={e => {setFilters({...filters, result: e.target.value}); setCurrentPage(1);}} className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer shadow-sm"><option value="ALL">Resultados</option><option value="WIN">Ganadores</option><option value="LOSS">Perdedores</option></select></div>
          <div className="relative group"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">school</span><select value={filters.mentor} onChange={e => {setFilters({...filters, mentor: e.target.value}); setCurrentPage(1);}} className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer shadow-sm"><option value="ALL">Todos los Mentores</option>{uniqueMentors.map(m => <option key={m as string} value={m as string}>{m}</option>)}</select></div>

          <div className="relative group ml-auto flex-grow max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">search</span>
            <input type="text" placeholder="Buscar notas, tags, setup..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-indigo-300 dark:hover:border-indigo-500/50 focus:border-indigo-500 shadow-sm transition-all" />
          </div>

          <button onClick={exportToCSV} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-colors ml-2">
            <span className="material-symbols-outlined text-[16px]">download</span> Exportar CSV
          </button>
        </div>

        {selectedTrades.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400"><span className="material-symbols-outlined">delete_sweep</span><span className="text-sm font-black">{selectedTrades.length} operaciones seleccionadas</span></div>
            <div className="flex gap-3"><button onClick={() => setSelectedTrades([])} className="px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors">Cancelar</button><button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg shadow-sm transition-colors">Eliminar Definitivamente</button></div>
          </div>
        )}

        {/* TABLA PRINCIPAL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800/50">
                  <th className="py-4 px-6 w-12 text-center"><input type="checkbox" checked={currentTrades.length > 0 && selectedTrades.length === currentTrades.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleSort('created_at')}>Fecha / Sesión</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleSort('asset')}>Activo</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cuenta / Mentor</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Setup & Evidencia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => handleSort('net')}>Resultado Neto</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {isLoading ? (<tr><td colSpan={7} className="py-12 text-center text-sm font-bold text-slate-400">Cargando...</td></tr>) 
                : currentTrades.length === 0 ? (<tr><td colSpan={7} className="py-12 text-center text-sm font-bold text-slate-400">Sin operaciones.</td></tr>) 
                : currentTrades.map(trade => {
                    const netProfit = (Number(trade.rr_achieved) || 0) - (Number(trade.commission) || 0);
                    const isWin = netProfit > 0;
                    const isBE = netProfit === 0;
                    const session = getSession(trade.created_at);
                    const d = getSafeDate(trade.created_at);
                    const isSelected = selectedTrades.includes(trade.id);
                    const isExpanded = expandedRow === trade.id;
                    const tagsArray = trade.tags ? trade.tags.split(',') : [];

                    return (
                      <React.Fragment key={trade.id}>
                        {/* FILA PRINCIPAL */}
                        <tr onClick={() => toggleRow(trade.id)} className={`transition-colors group relative cursor-pointer ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'} ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/30' : ''}`}>
                          <td className="absolute left-0 top-0 bottom-0 w-1"><div className={`w-full h-full ${isWin ? 'bg-emerald-500' : isBE ? 'bg-slate-400' : 'bg-rose-500'} ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}></div></td>
                          
                          <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectTrade(trade.id)} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{`${d.getDate()}/${d.getMonth() + 1}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border w-max ${session.color}`}>{session.label}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-black text-slate-800 dark:text-slate-100">{trade.asset}</span>
                              <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${trade.direction === 'SELL' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div><span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{trade.direction || 'BUY'}</span></div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">{trade.account}</span><span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{trade.mentor || 'Propia'}</span></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{trade.setup_type || 'Sin definir'}</span>
                              {trade.image_url ? (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedImage(trade.image_url); }} className="text-indigo-400 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/30 p-1 rounded-md transition-all shadow-sm border border-indigo-100 dark:border-indigo-500/20" title="Ver captura"><span className="material-symbols-outlined text-[13px] block">visibility</span></button>
                              ) : (
                                <button disabled className="text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-md cursor-not-allowed opacity-60" title="Sin captura"><span className="material-symbols-outlined text-[13px] block">visibility_off</span></button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-sm font-black ${isWin ? 'text-emerald-500' : netProfit < 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>{isWin ? '+' : ''}${netProfit.toFixed(2)}</span>
                              <div className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest border ${isWin ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' : netProfit < 0 ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30'}`}>{isWin ? 'TARGET' : netProfit < 0 ? 'STOP' : 'BE'}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-add-trade', { detail: trade })); }} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"><span className="material-symbols-outlined text-[18px] block">edit</span></button>
                            <button onClick={() => toggleRow(trade.id)} className="text-slate-400 dark:text-slate-500 p-1.5 ml-1 transition-transform"><span className={`material-symbols-outlined text-[18px] block transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span></button>
                          </td>
                        </tr>

                        {/* ACORDEÓN DESPLEGABLE (NOTAS Y EVIDENCIA) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0 border-b border-slate-200 dark:border-slate-800">
                              <div className="bg-slate-100/50 dark:bg-[#0B1120] p-6 shadow-inner flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex-1 space-y-4">
                                  <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">psychology</span> Etiquetas Mentales</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {tagsArray.length > 0 ? tagsArray.map((tag:string, i:number) => (
                                        <span key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{tag}</span>
                                      )) : <span className="text-xs text-slate-400 italic">Sin etiquetas asignadas.</span>}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit_note</span> Notas del Trade</h4>
                                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                      {trade.notes || <span className="text-slate-400 italic">No dejaste notas para esta operación.</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col">
                                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">image</span> Evidencia Gráfica</h4>
                                  {trade.image_url ? (
                                    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md h-[200px] cursor-pointer group relative" onClick={(e) => { e.stopPropagation(); setSelectedImage(trade.image_url); }}>
                                      <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><span className="material-symbols-outlined text-white text-3xl drop-shadow-md">zoom_in</span></div>
                                      <img src={trade.image_url} alt="Trade" className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 h-[200px] flex flex-col items-center justify-center text-slate-400"><span className="material-symbols-outlined text-3xl mb-2 opacity-50">image_not_supported</span><span className="text-xs font-bold uppercase tracking-widest">Sin Captura</span></div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
             <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedTrades.length)} de {processedTrades.length} trades</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><span className="material-symbols-outlined text-sm block">chevron_left</span></button>
                <div className="px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><span className="material-symbols-outlined text-sm block">chevron_right</span></button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}