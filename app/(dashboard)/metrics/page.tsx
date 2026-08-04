"use client";

/* INICIO IMPORTACIONES */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Topbar from "../../components/Topbar";
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie
} from 'recharts';
/* FIN IMPORTACIONES */

/* INICIO COMPONENTE PRINCIPAL: MetricsPage */
export default function MetricsPage() {
  
  /* INICIO ESTADOS */
  const [trades, setTrades] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  const [selectedAccount, setSelectedAccount] = useState("ALL");
  const [displayUnit, setDisplayUnit] = useState("$");
  /* FIN ESTADOS */

  /* INICIO EFECTOS */
  useEffect(() => {
    setIsMounted(true);
    const savedAccount = localStorage.getItem("bunker_account");
    if (savedAccount) setSelectedAccount(savedAccount);
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem("bunker_account", selectedAccount);
  }, [selectedAccount, isMounted]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const [tradesRes, mentorsRes] = await Promise.all([
          supabase.from('trades').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
          supabase.from('mentors').select('broker, notes').eq('user_id', user.id)
        ]);
          
        if (tradesRes.data) setTrades(tradesRes.data);
        if (mentorsRes.data) setMentors(mentorsRes.data);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);
  /* FIN EFECTOS */

  /* INICIO FILTROS */
  const filteredTrades = selectedAccount === "ALL" 
    ? trades 
    : trades.filter(t => t.account === selectedAccount);
  /* FIN FILTROS */

  /* =====================================================================
     INICIO MOTORES DE CÁLCULO
     ===================================================================== */
     
  // 1. EXTRAER RIESGO DINÁMICO DEL BÚNKER
  const currentRisk = useMemo(() => {
    if (mentors.length === 0) return 1;
    if (selectedAccount === "ALL") {
       const validRisks = mentors.map(m => parseFloat(m.notes) || 0).filter(r => r > 0);
       if (validRisks.length === 0) return 1;
       const totalRisk = validRisks.reduce((acc, val) => acc + val, 0);
       return totalRisk / validRisks.length;
    } else {
       const activeMentor = mentors.find(m => m.broker === selectedAccount);
       return activeMentor ? (parseFloat(activeMentor.notes) || 1) : 1;
    }
  }, [mentors, selectedAccount]);

  // 2. CALCULAR WIN RATE Y RATIO R:B REALES
  const { winRate, rrRatio } = useMemo(() => {
    if (filteredTrades.length === 0) return { winRate: 0.5, rrRatio: 1 };
    let wins = 0, grossWin = 0, grossLoss = 0, lossCount = 0;
    
    filteredTrades.forEach(t => {
       const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
       if (net > 0) { wins++; grossWin += net; }
       else if (net < 0) { lossCount++; grossLoss += Math.abs(net); }
    });
    
    const wr = wins / filteredTrades.length;
    const avgWin = wins > 0 ? grossWin / wins : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const calcRR = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 2 : 1);
    
    return { winRate: wr, rrRatio: calcRR };
  }, [filteredTrades]);

  // 3. MOTOR MONTE CARLO (RIESGO DE RUINA)
  const riskMatrix = useMemo(() => {
    const levels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const simulations = 1000;
    const tradesToSimulate = 100;
    const riskDec = currentRisk / 100;

    let maxDrawdowns: number[] = [];

    for (let i = 0; i < simulations; i++) {
       let peak = 1.0;
       let current = 1.0;
       let maxDD = 0;
       
       for (let t = 0; t < tradesToSimulate; t++) {
          const isWin = Math.random() <= winRate;
          if (isWin) current += current * (riskDec * rrRatio);
          else current -= current * riskDec;

          if (current > peak) peak = current;
          const dd = (peak - current) / peak;
          if (dd > maxDD) maxDD = dd;
          if (current <= 0) { maxDD = 1; break; }
       }
       maxDrawdowns.push(maxDD);
    }

    return levels.map(level => {
       const targetDD = level / 100;
       const hits = maxDrawdowns.filter(dd => dd >= targetDD).length;
       const prob = (hits / simulations) * 100;

       return {
          levelNum: level,
          levelStr: `${level}%`,
          probRaw: prob,
          probStr: prob === 0 ? "<0.01%" : `${prob.toFixed(2)}%`,
          consecutive: Math.ceil(level / currentRisk) 
       };
    });
  }, [currentRisk, winRate, rrRatio]);

  // 4. CALCULAR DRAWDOWN ACTUAL REAL (Para el marcador "Tu Estado")
  const actualDrawdown = useMemo(() => {
    if (filteredTrades.length === 0) return 0;
    let peak = 1.0;
    let current = 1.0;
    const riskDec = currentRisk / 100;
    
    filteredTrades.forEach(t => {
      const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      if (net > 0) current += current * (riskDec * rrRatio);
      else if (net < 0) current -= current * riskDec;
      if (current > peak) peak = current;
    });
    
    const currentDD = peak > 0 ? (peak - current) / peak : 0;
    return currentDD * 100;
  }, [filteredTrades, currentRisk, rrRatio]);

  const activeLevel = actualDrawdown > 0 ? Math.max(10, Math.ceil(actualDrawdown / 10) * 10) : 0;

  // Resto de cálculos originales (Dona, Histograma, etc.)
  const rankingData = useMemo(() => {
    const setupStats: Record<string, any> = {};
    filteredTrades.forEach(t => {
      const setupName = t.setup_type || 'Sin Setup';
      const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      if (!setupStats[setupName]) setupStats[setupName] = { name: setupName, totalTrades: 0, wins: 0, pnl: 0 };
      setupStats[setupName].totalTrades += 1;
      setupStats[setupName].wins += net > 0 ? 1 : 0;
      setupStats[setupName].pnl += net;
    });
    return Object.values(setupStats).map(setup => ({
      ...setup, winRate: Math.round((setup.wins / setup.totalTrades) * 100)
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  const assetPieData = useMemo(() => {
    const assetWins: Record<string, number> = {};
    filteredTrades.forEach(t => {
      const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      if (net > 0) assetWins[t.asset || 'Otro'] = (assetWins[t.asset || 'Otro'] || 0) + net;
    });
    return Object.keys(assetWins).map(key => ({ name: key, value: Number(assetWins[key].toFixed(2)) })).sort((a, b) => b.value - a.value);
  }, [filteredTrades]);
  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

  const dailyBarData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dailyStats: Record<string, number> = { 'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0 };
    filteredTrades.forEach(t => {
      const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      const safeDateStr = t.created_at ? t.created_at.replace(' ', 'T') : new Date().toISOString();
      const dayName = days[new Date(safeDateStr).getDay()];
      if (dailyStats[dayName] !== undefined) dailyStats[dayName] += net;
    });
    return Object.keys(dailyStats).map(key => ({ name: key, pnl: Number(dailyStats[key].toFixed(2)) }));
  }, [filteredTrades]);

  const directionData = useMemo(() => {
    let stats = { BUY: { pnl: 0, wins: 0, total: 0 }, SELL: { pnl: 0, wins: 0, total: 0 } };
    filteredTrades.forEach(t => {
      const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      const dir = t.direction === 'SELL' ? 'SELL' : 'BUY';
      stats[dir].pnl += net;
      stats[dir].total += 1;
      if (net > 0) stats[dir].wins += 1;
    });
    const calcWR = (wins: number, total: number) => total > 0 ? Math.round((wins / total) * 100) : 0;
    return [
      { name: 'Compras (Long)', pnl: Number(stats.BUY.pnl.toFixed(2)), winRate: calcWR(stats.BUY.wins, stats.BUY.total) },
      { name: 'Ventas (Short)', pnl: Number(stats.SELL.pnl.toFixed(2)), winRate: calcWR(stats.SELL.wins, stats.SELL.total) }
    ];
  }, [filteredTrades]);

  const sessionData = useMemo(() => {
    let stats = { London: { pnl: 0, wins: 0, total: 0 }, NY: { pnl: 0, wins: 0, total: 0 }, Asia: { pnl: 0, wins: 0, total: 0 } };
    filteredTrades.forEach(t => {
      const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      const safeDateStr = t.created_at ? t.created_at.replace(' ', 'T') : new Date().toISOString();
      const hour = new Date(safeDateStr).getHours();
      let session = 'Asia';
      if (hour >= 3 && hour < 8) session = 'London';
      else if (hour >= 8 && hour < 16) session = 'NY';
      stats[session as keyof typeof stats].pnl += net;
      stats[session as keyof typeof stats].total += 1;
      if (net > 0) stats[session as keyof typeof stats].wins += 1;
    });
    const calcWR = (wins: number, total: number) => total > 0 ? Math.round((wins / total) * 100) : 0;
    return [
      { name: 'Londres (3am-8am)', pnl: Number(stats.London.pnl.toFixed(2)), winRate: calcWR(stats.London.wins, stats.London.total) },
      { name: 'N. York (8am-4pm)', pnl: Number(stats.NY.pnl.toFixed(2)), winRate: calcWR(stats.NY.wins, stats.NY.total) },
      { name: 'Asia (4pm-3am)', pnl: Number(stats.Asia.pnl.toFixed(2)), winRate: calcWR(stats.Asia.wins, stats.Asia.total) }
    ];
  }, [filteredTrades]);
  /* =====================================================================
     FIN MOTORES DE CÁLCULO
     ===================================================================== */

  const CustomTooltipStats = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 dark:bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] font-bold text-slate-400 mb-1">{label}</p>
          <p className="text-sm font-black text-white">
            Neto: <span className={data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>${data.pnl}</span>
          </p>
          {data.winRate !== undefined && (
            <p className="text-[10px] font-bold mt-1 text-slate-300">
              Win Rate: <span className="text-indigo-400">{data.winRate}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!isMounted) return null;

  const wrString = (winRate * 100).toFixed(0);
  const ruinProb100 = riskMatrix.find(r => r.levelNum === 100)?.probStr || "0%";
  const ruinTrades100 = riskMatrix.find(r => r.levelNum === 100)?.consecutive || 0;

  return (
    <div className="bg-slate-50 dark:bg-[#090714] text-slate-700 dark:text-slate-300 min-h-screen font-sans pb-10 pl-[250px] relative transition-colors duration-300">
      <Topbar title="Trends & Analytics" icon="monitoring" displayUnit={displayUnit} setDisplayUnit={setDisplayUnit} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} />

      <main className="pt-24 px-6 max-w-[1200px] mx-auto space-y-6">
        
        {/* NUEVA FILA 1: HEATMAP DE RIESGO DE RUINA */}
        <div className="bg-white dark:bg-[#131022] border border-rose-500/20 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300 relative">
          
          {/* BARRA DE PROGRESO DE DRAWDOWN ACTUAL */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 relative">
            <div 
              className="absolute top-0 left-0 h-full bg-rose-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(actualDrawdown, 100)}%` }}
            >
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(244,63,94,1)]"></div>
            </div>
          </div>
          
          <div className="p-6 pb-2 flex justify-between items-end border-b border-slate-100 dark:border-slate-800/50">
            <div>
              <h2 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span> Monte Carlo Simulation
              </h2>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Riesgo de Ruina</h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Riesgo Activo</div>
              <div className="text-xl font-black text-rose-500">{currentRisk.toFixed(1)}% / Trade</div>
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-4 font-bold text-slate-400 text-left w-[20%]">Tamaño Pérdida</th>
                  {[...riskMatrix].reverse().map(r => {
                    const isActive = activeLevel === r.levelNum;
                    return (
                      <th key={r.levelStr} className={`py-3 px-2 font-black relative ${isActive ? 'text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {isActive && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[9px] px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-[0_0_12px_rgba(244,63,94,0.6)] whitespace-nowrap z-10 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-rose-500">
                            Tu Estado
                          </div>
                        )}
                        {r.levelStr}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <tr>
                  <td className="py-5 px-4 font-bold text-slate-500 text-left bg-slate-50/50 dark:bg-slate-900/20">Probabilidad</td>
                  {[...riskMatrix].reverse().map(r => {
                    // Cálculo de opacidad para el Mapa de Calor
                    const opacity = Math.min(Math.max(r.probRaw / 100, 0.03), 1);
                    const textColor = opacity > 0.4 ? 'text-white' : 'text-rose-600 dark:text-rose-400';
                    return (
                      <td key={r.levelStr} className={`py-5 px-2 font-black ${textColor} relative group cursor-default`}>
                        <div className="absolute inset-1 rounded-lg -z-10 transition-colors" style={{ backgroundColor: `rgba(244, 63, 94, ${opacity})` }}></div>
                        {r.probStr}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-500 text-left leading-tight">Pérdidas<br/>Consecutivas</td>
                  {[...riskMatrix].reverse().map(r => (
                    <td key={r.levelStr} className="py-4 px-2 font-bold text-slate-600 dark:text-slate-400">{r.consecutive}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/30 px-6 py-4 border-t border-slate-100 dark:border-slate-800/50">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
              El simulador detecta un Drawdown actual del <strong className="text-rose-500">{actualDrawdown.toFixed(2)}%</strong> en tu historial. 
              Manteniendo tu Win Rate del <strong className="text-indigo-500">{wrString}%</strong>, 
              tienes un <strong className="text-rose-500">{ruinProb100}</strong> de probabilidad matemática de llegar a la quiebra total. 
              Requiere fallar <strong className="text-slate-800 dark:text-slate-200">{ruinTrades100}</strong> transacciones consecutivas bajo riesgo estricto.
            </p>
          </div>
        </div>

        {/* FILA 2: DONA Y DÍAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#131022] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-[280px] transition-colors duration-300">
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Distribución</h2>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Dominancia por Activo</h3>
            </div>
            <div className="flex-1 flex items-center justify-center relative mt-2">
              {assetPieData.length === 0 ? <span className="text-slate-400 dark:text-slate-600 font-bold text-sm">Sin ganancias</span> : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assetPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {assetPieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => [`$${value}`, 'Ganancia Bruta']} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#f8fafc', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100">{assetPieData[0]?.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#131022] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-[280px] transition-colors duration-300">
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Comportamiento</h2>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Rendimiento por Día</h3>
            </div>
            <div className="flex-1 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBarData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'rgba(148, 163, 184, 0.05)'}} content={<CustomTooltipStats />} />
                  <Bar dataKey="pnl" radius={[4, 4, 4, 4]} barSize={25}>
                    {dailyBarData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#f43f5e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* FILA 3: DIRECCIONALIDAD Y SESIONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#131022] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-[220px] transition-colors duration-300">
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Sesgos Operativos</h2>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Longs vs Shorts</h3>
            </div>
            <div className="flex-1 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={directionData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={90}/>
                  <RechartsTooltip cursor={{fill: 'rgba(148, 163, 184, 0.05)'}} content={<CustomTooltipStats />} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={20}>
                    {directionData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#f43f5e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#131022] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-[220px] transition-colors duration-300">
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Timing</h2>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Rendimiento por Horario</h3>
            </div>
            <div className="flex-1 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'rgba(148, 163, 184, 0.05)'}} content={<CustomTooltipStats />} />
                  <Bar dataKey="pnl" radius={[4, 4, 4, 4]} barSize={25}>
                    {sessionData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#f43f5e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* FILA 4: TABLA DE RANKING GAMIFICADA */}
        <div className="bg-white dark:bg-[#131022] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Ranking de Setups</h3>
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-600">emoji_events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Setup</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Win Rate</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Total Trades</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">P&L Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {rankingData.map((setup, index) => (
                  <tr key={setup.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${index === 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>{index + 1}</div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{setup.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${
                        setup.winRate >= 60 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                        setup.winRate >= 40 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                        'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                      }`}>
                        {setup.winRate}%
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{setup.totalTrades}</td>
                    <td className={`py-3 px-6 text-right text-xs font-black tabular-nums ${setup.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{setup.pnl > 0 ? '+' : ''}${setup.pnl.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}