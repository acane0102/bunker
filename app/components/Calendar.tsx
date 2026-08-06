"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface CalendarProps {
  filteredTrades: any[];
  selectedMonth: string;
  onTradeUpdated: () => void;
}

export default function Calendar({ filteredTrades, selectedMonth, onTradeUpdated }: CalendarProps) {
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<number | null>(null);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const { daysArray, monthLabel } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthLabel = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const tradesByDate: Record<string, any[]> = {};
    filteredTrades.forEach(trade => {
      const safeDateStr = trade.created_at ? trade.created_at.replace(' ', 'T') : new Date().toISOString();
      const d = new Date(safeDateStr);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!tradesByDate[dateStr]) tradesByDate[dateStr] = [];
      tradesByDate[dateStr].push(trade);
    });

    const daysArray = [];
    for (let i = 0; i < 42; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      
      let displayDay = dayNumber;
      if (dayNumber < 1) displayDay = daysInPrevMonth + dayNumber;
      else if (dayNumber > daysInMonth) displayDay = dayNumber - daysInMonth;

      let dateStr = "";
      let dayTrades: any[] = [];
      let net = 0;
      let status = 'none';
      
      let wins = 0, losses = 0, be = 0;
      let bestSetup = "N/A";

      if (isCurrentMonth) {
        dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        dayTrades = tradesByDate[dateStr] || [];
        
        let setupsMap: Record<string, number> = {};

        dayTrades.forEach(t => {
          const netTrade = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
          net += netTrade;
          
          if (netTrade > 0) wins++;
          else if (netTrade < 0) losses++;
          else be++;

          const sType = t.setup_type || 'Sin Setup';
          setupsMap[sType] = (setupsMap[sType] || 0) + netTrade;
        });

        if (dayTrades.length > 0) {
          status = net >= 0 ? 'win' : 'loss';
          
          let maxPnl = -Infinity;
          for (const [s, pnl] of Object.entries(setupsMap)) {
            if (pnl > maxPnl) { maxPnl = pnl; bestSetup = s; }
          }
        }
      }

      daysArray.push({ displayDay, isCurrentMonth, dateStr, trades: dayTrades, net, status, wins, losses, be, bestSetup });
    }
    
    return { daysArray, monthLabel };
  }, [currentDate, filteredTrades]);

  const activeDayTrades = activeDateStr ? filteredTrades.filter(t => {
    const safeDateStr = t.created_at ? t.created_at.replace(' ', 'T') : new Date().toISOString();
    const d = new Date(safeDateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === activeDateStr;
  }).sort((a, b) => {
    const aDate = new Date(a.created_at ? a.created_at.replace(' ', 'T') : new Date().toISOString());
    const bDate = new Date(b.created_at ? b.created_at.replace(' ', 'T') : new Date().toISOString());
    return bDate.getTime() - aDate.getTime();
  }) : [];

  const confirmDelete = async () => {
    if (!tradeToDelete) return;
    const { error } = await supabase.from('trades').delete().eq('id', tradeToDelete);
    if (!error) {
      setTradeToDelete(null);
      onTradeUpdated(); 
    } else {
      alert("Error al eliminar: " + error.message);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & { rr_achieved: { value: string } };
    const newNet = parseFloat(target.rr_achieved.value);
    
    const { error } = await supabase.from('trades')
      .update({ rr_achieved: newNet, status: newNet >= 0 ? 'WIN' : 'LOSS' })
      .eq('id', editingTrade.id);
      
    if (!error) {
      setEditingTrade(null);
      onTradeUpdated(); 
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  return (
   <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-full overflow-hidden flex flex-col font-sans relative transition-colors duration-300">
      
      {/* HEADER CALENDARIO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Calendario de Desempeño</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Resumen diario de pérdidas y ganancias netas</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-1 shadow-sm bg-white dark:bg-slate-800 w-full sm:w-auto justify-between sm:justify-start">
          <button onClick={handlePrevMonth} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all">
            <span className="material-symbols-outlined text-sm font-bold">arrow_back_ios_new</span>
          </button>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 min-w-[100px] text-center capitalize">{monthLabel}</span>
          <button onClick={handleNextMonth} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all">
            <span className="material-symbols-outlined text-sm font-bold">arrow_forward_ios</span>
          </button>
        </div>
      </div>

      {/* SOLUCIÓN CALENDARIO MÓVIL: Contenedor con overflow-x-auto */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
       <div className="w-full min-w-0">
          
          {/* DÍAS DE LA SEMANA */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-3 mb-3">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500">{d}</div>
            ))}
          </div>

          {/* CUADRÍCULA DE DÍAS */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-3 flex-grow">
            {daysArray.map((data, idx) => (
              <div 
                key={idx} 
                onClick={() => { if(data.isCurrentMonth && data.trades.length > 0) setActiveDateStr(data.dateStr) }}
                className={`
                  relative flex flex-col justify-between min-h-[75px] md:min-h-[110px] p-1.5 md:p-3 rounded-xl md:rounded-2xl border transition-all group
                  ${!data.isCurrentMonth ? 'bg-slate-50/30 dark:bg-slate-800/30 border-transparent opacity-40 pointer-events-none' : 
                    data.status === 'win' ? 'bg-[#ecfdf5] dark:bg-emerald-500/10 border-[#d1fae5] dark:border-emerald-500/20 cursor-pointer hover:shadow-md dark:hover:shadow-emerald-500/5 hover:-translate-y-0.5' : 
                    data.status === 'loss' ? 'bg-[#fef2f2] dark:bg-rose-500/10 border-[#fee2e2] dark:border-rose-500/20 cursor-pointer hover:shadow-md dark:hover:shadow-rose-500/5 hover:-translate-y-0.5' : 
                    'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}
                `}
              >
                {/* Cabecera del día */}
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] md:text-sm font-bold ${!data.isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : data.status === 'win' ? 'text-emerald-700 dark:text-emerald-400' : data.status === 'loss' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {data.displayDay}
                  </span>
                  {data.trades.length > 0 && (
                    <span className={`text-[8px] md:text-[10px] font-bold px-1 py-0.5 rounded-md ${data.status === 'win' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'}`}>
                      {data.trades.length}
                    </span>
                  )}
                </div>

                {/* Total Neto del día */}
                {data.trades.length > 0 && (
                  <div className="text-center mt-auto mb-0.5 md:mb-1">
                    <div className={`text-[11px] md:text-lg font-black tracking-tight ${data.status === 'win' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                      {data.net > 0 ? '+' : ''}${Math.abs(data.net).toFixed(2)}
                    </div>
                    <div className={`text-[8px] md:text-[9px] font-semibold mt-0.5 hidden sm:block ${data.status === 'win' ? 'text-emerald-400 dark:text-emerald-500/70' : 'text-rose-400 dark:text-rose-500/70'}`}>
                      Neto diario
                    </div>
                  </div>
                )}

                {/* INICIO TOOLTIP DETALLADO */}
                {data.isCurrentMonth && data.trades.length > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden lg:group-hover:block z-50 w-56 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
                    <div className="bg-slate-900 dark:bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-4 text-left relative">
                      
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-300">{data.displayDay} de {monthLabel.split(' ')[0]}</span>
                        <span className={`text-sm font-black ${data.status === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {data.net > 0 ? '+' : ''}${data.net.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operaciones</span>
                          <div className="flex gap-1.5 text-[10px] font-bold">
                            <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">{data.wins} W</span>
                            <span className="text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded border border-rose-400/20">{data.losses} L</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mejor Setup</span>
                          <span className="text-[10px] font-bold text-indigo-400 truncate max-w-[100px]" title={data.bestSetup}>{data.bestSetup}</span>
                        </div>
                      </div>

                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 dark:bg-slate-950 border-b border-r border-slate-700 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LEYENDA DEL CALENDARIO */}
      <div className="mt-4 md:mt-6 pt-4 flex flex-col md:flex-row justify-between items-center gap-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap gap-3 md:gap-5 w-full md:w-auto justify-center md:justify-start">
          <div className="flex items-center gap-1.5 md:gap-2"><div className="w-3 md:w-3.5 h-3 md:h-3.5 rounded bg-[#ecfdf5] dark:bg-emerald-500/10 border border-[#d1fae5] dark:border-emerald-500/20"></div><span className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400">Día Ganador</span></div>
          <div className="flex items-center gap-1.5 md:gap-2"><div className="w-3 md:w-3.5 h-3 md:h-3.5 rounded bg-[#fef2f2] dark:bg-rose-500/10 border border-[#fee2e2] dark:border-rose-500/20"></div><span className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400">Día Perdedor</span></div>
          <div className="flex items-center gap-1.5 md:gap-2"><div className="w-3 md:w-3.5 h-3 md:h-3.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div><span className="text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500">Sin Operaciones</span></div>
        </div>
        <span className="text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-500 text-center">Hacer clic en un día para ver detalles</span>
      </div>

      {/* INICIO POPUP PRINCIPAL DE TRADES */}
      {activeDateStr && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => { setActiveDateStr(null); setEditingTrade(null); }}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base md:text-lg">Trades del {activeDateStr}</h3>
              <button onClick={() => { setActiveDateStr(null); setEditingTrade(null); }} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-8 h-8 flex items-center justify-center rounded-full transition-colors">
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>
            
            <div className="p-4 md:p-6 max-h-[400px] overflow-y-auto relative">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/50 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="pb-3">Activo</th>
                    <th className="pb-3">Estrategia</th>
                    <th className="pb-3 text-right">Neto ($)</th>
                    <th className="pb-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {activeDayTrades.map((t: any) => {
                    const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
                    const isEditing = editingTrade?.id === t.id;

                    if (isEditing) {
                      return (
                        <tr key={t.id} className="bg-indigo-50/50 dark:bg-indigo-900/20">
                          <td colSpan={4} className="py-3 px-2 md:px-4">
                            <form onSubmit={handleEditSave} className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{t.asset}</span>
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nuevo Neto ($):</label>
                                <input name="rr_achieved" type="number" step="0.01" defaultValue={t.rr_achieved} className="w-24 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-500" required />
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto justify-end">
                                <button type="button" onClick={() => setEditingTrade(null)} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded">Cancelar</button>
                                <button type="submit" className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded shadow-sm">Guardar</button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={t.id} className="text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 md:py-4"><span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md font-extrabold text-[10px] md:text-xs">{t.asset}</span></td>
                        <td className="py-3 md:py-4 text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold">{t.setup_type}</td>
                        <td className={`py-3 md:py-4 text-right font-black text-xs md:text-sm ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {net > 0 ? '+' : ''}${net.toFixed(2)}
                        </td>
                        <td className="py-3 md:py-4 text-center">
                          <div className="flex justify-center gap-2 md:gap-3">
                            <button onClick={() => setEditingTrade(t)} className="text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" title="Editar Neto">
                              <span className="material-symbols-outlined text-[16px] md:text-[18px]">edit</span>
                            </button>
                            <button onClick={() => setTradeToDelete(t.id)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors" title="Eliminar Trade">
                              <span className="material-symbols-outlined text-[16px] md:text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* MODAL SECUNDARIO DE CONFIRMACIÓN */}
              {tradeToDelete && (
                <div className="absolute inset-0 z-[250] flex items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-[2px]">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 w-[90%] max-w-sm text-center">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-rose-500">warning</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Eliminar operación?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Esta acción es permanente y recalculará todas tus estadísticas. ¿Deseas continuar?</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => setTradeToDelete(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors">
                        Cancelar
                      </button>
                      <button onClick={confirmDelete} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow-md transition-colors">
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}