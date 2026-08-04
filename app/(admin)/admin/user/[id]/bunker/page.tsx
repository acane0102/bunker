"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { getAdminUserDashboardData } from "../../../../../../lib/auth";

// MÓDULOS DE VISUALIZACIÓN EXISTENTES (Rutas relativas corregidas a 5 niveles)
import DashboardHeader from "../../../../../components/DashboardHeader";
import MetricsCards from "../../../../../components/MetricsCards";
import MainCharts from "../../../../../components/MainCharts";
import Calendar from "../../../../../components/Calendar";

export default function AdminIsolatedBunker({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Desenvolvemos el ID de la URL
  
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Controles de vista aislada (solo lectura)
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [timeRange, setTimeRange] = useState("ALL");
  const selectedAccount = "ALL"; // En admin vemos el global por defecto

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { trades, transactions } = await getAdminUserDashboardData(id);
        setAllTrades(trades);
        setAllTransactions(transactions);
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, [id]);

  // Cálculos matemáticos idénticos a los de tu dashboard
  const filteredTrades = useMemo(() => {
    return allTrades.filter(t => {
      const safeDateStr = t.created_at ? t.created_at.replace(' ', 'T') : new Date().toISOString();
      const date = new Date(safeDateStr);
      const now = new Date();
      
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const passMonth = selectedMonth === "ALL" ? true : monthStr === selectedMonth;

      let passTime = true;
      if (timeRange === "TODAY") passTime = date.toDateString() === now.toDateString();
      else if (timeRange === "WEEK") {
        const currentDay = now.getDay();
        const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; 
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
        startOfWeek.setHours(0,0,0,0);
        passTime = date >= startOfWeek;
      } else if (timeRange === "MONTH") passTime = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      else if (timeRange === "YEAR") passTime = date.getFullYear() === now.getFullYear();

      return passMonth && passTime;
    });
  }, [allTrades, selectedMonth, timeRange]);

  const financialData = useMemo(() => {
    let deposits = 0, withdrawals = 0, bonus = 0;
    allTransactions.forEach(t => {
      if (t.type === 'DEPOSIT') deposits += Number(t.amount || 0);
      if (t.type === 'WITHDRAWAL') withdrawals += Number(t.amount || 0);
      if (t.type === 'BONUS') bonus += Number(t.amount || 0);
    });
    return { deposits, withdrawals, bonus, baseCapital: deposits - withdrawals };
  }, [allTransactions]); 

  const metrics = useMemo(() => {
    let grossProfit = 0, grossLoss = 0, wins = 0, losses = 0, be = 0;
    let totalWinAmount = 0, totalLossAmount = 0, cumulative = 0, currentStreak = 0, streakType = 'none';
    let peak = 0, maxDrawdown = 0; 
    const equityData: any[] = [];

    const globalNetProfit = allTrades.reduce((acc, t) => acc + ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)), 0);
    const saldoRealGlobal = financialData.baseCapital + globalNetProfit;

    filteredTrades.forEach((t) => {
      const netTrade = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
      cumulative += netTrade;
      
      if (cumulative > peak) peak = cumulative;
      const drawdown = cumulative - peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;

      const safeDateStr = t.created_at ? t.created_at.replace(' ', 'T') : new Date().toISOString();
      const d = new Date(safeDateStr);
      equityData.push({ date: `${d.getDate()}/${d.getMonth()+1}`, pnl: cumulative });

      if (netTrade > 0) {
        grossProfit += netTrade; wins++; totalWinAmount += netTrade;
        if (streakType === 'win') currentStreak++; else { streakType = 'win'; currentStreak = 1; }
      } else if (netTrade < 0) {
        grossLoss += Math.abs(netTrade); losses++; totalLossAmount += Math.abs(netTrade);
        if (streakType === 'loss') currentStreak++; else { streakType = 'loss'; currentStreak = 1; }
      } else {
        be++;
      }
    });

    const avgWin = wins > 0 ? totalWinAmount / wins : 0;
    const avgLoss = losses > 0 ? totalLossAmount / losses : 0;
    const winRate = filteredTrades.length > 0 ? Math.round((wins / filteredTrades.length) * 100) : 0;
    const profitFactor = grossLoss === 0 ? Number(grossProfit.toFixed(2)) : Number((grossProfit / grossLoss).toFixed(2));

    const nPF = Math.min(profitFactor * 50, 100); 
    const ratioWL = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? 2 : 0);
    const nRatio = Math.min(ratioWL * 50, 100); 
    const recovery = maxDrawdown === 0 ? 100 : Math.min(Math.abs(cumulative / maxDrawdown) * 30, 100);
    const riskControl = maxDrawdown === 0 ? 100 : Math.max(0, 100 - (Math.abs(maxDrawdown) / (saldoRealGlobal > 0 ? saldoRealGlobal : 1) * 100));
    const consistency = Math.max(0, 100 - (streakType === 'loss' ? currentStreak * 5 : 0));

    const radar = [
      { subject: 'Tasa Acierto', A: winRate, fullMark: 100 },
      { subject: 'F. Beneficio', A: Math.round(nPF), fullMark: 100 },
      { subject: 'Ratio W/L', A: Math.round(nRatio), fullMark: 100 },
      { subject: 'Recuperación', A: Math.round(recovery > 0 ? recovery : 0), fullMark: 100 },
      { subject: 'Control DD', A: Math.round(riskControl), fullMark: 100 },
      { subject: 'Consistencia', A: Math.round(consistency), fullMark: 100 },
    ];

    const indiceBunker = Math.round((winRate + nPF + nRatio + (recovery>0?recovery:0) + riskControl + consistency) / 6) || 0;

    return {
      netPL: cumulative, winRate, wins, losses, be, avgWin, avgLoss, maxDrawdown,
      profitFactor, currentStreak, streakType, radar, equityData, 
      saldoReal: saldoRealGlobal, 
      equidadTotal: saldoRealGlobal + financialData.bonus, 
      bonus: financialData.bonus,
      indiceBunker
    };
  }, [allTrades, filteredTrades, financialData]);

  const winRateChartData = [
    { name: 'Wins', value: metrics.wins, color: '#10b981' },
    { name: 'BE', value: metrics.be, color: '#64748b' },
    { name: 'Losses', value: metrics.losses, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  const pfCapped = Math.min(metrics.profitFactor, 3);
  const pfChartData = [ { name: 'PF', value: pfCapped }, { name: 'Rest', value: 3 - pfCapped } ];
  const pfColor = metrics.profitFactor >= 1.5 ? '#10b981' : metrics.profitFactor >= 1 ? '#f59e0b' : '#f43f5e';

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b0914] flex items-center justify-center text-slate-400">Cargando Búnker del Usuario...</div>;
  }

  return (
    <div className="bg-[#0b0914] text-slate-300 min-h-screen font-sans pb-10">
      
      {/* HEADER DE MODO LECTURA ADMIN */}
      <div className="bg-[#131022] border-b border-slate-800/80 sticky top-0 z-50 shadow-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/user/${id}`} className="text-slate-500 hover:text-white transition flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al Perfil
            </Link>
            <div className="h-4 w-px bg-slate-800"></div>
            <span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-[12px]">visibility</span>
              Vista Aislada de Administrador
            </span>
          </div>
        </div>
      </div>

      <main className="pt-8 px-6 max-w-[1400px] mx-auto space-y-6">
        
        <DashboardHeader 
          greeting="Datos Operativos del Cliente" 
          dailyMessage="Estás viendo los registros oficiales de la base de datos (Solo lectura)." 
          timeRange={timeRange} 
          setTimeRange={setTimeRange} 
          setSelectedMonth={setSelectedMonth} 
          equidadTotal={metrics.equidadTotal} 
          saldoReal={metrics.saldoReal} 
          bonus={metrics.bonus} 
        />
        
        <MetricsCards 
          metrics={metrics} 
          winRateChartData={winRateChartData} 
          pfChartData={pfChartData} 
          pfColor={pfColor} 
          tradesLength={filteredTrades.length} 
        />

        <MainCharts 
          equityData={metrics.equityData} 
          radarData={metrics.radar} 
          indiceScore={metrics.indiceBunker} 
          hasTrades={filteredTrades.length > 0} 
        />

        <div className="mt-6 pointer-events-none opacity-90">
          {/* Calendar es de solo lectura, le desactivamos eventos */}
          <Calendar 
            filteredTrades={allTrades} 
            selectedMonth={selectedMonth} 
            onTradeUpdated={() => {}} 
          />
        </div>

      </main>
    </div>
  );
}