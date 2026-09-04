"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// Modales y Navegación
import Topbar from "../../components/Topbar";
import BunkerSettingsModal from "../../components/BunkerSettingsModal";

// MÓDULOS DE VISUALIZACIÓN
import DashboardHeader from "../../components/DashboardHeader";
import MetricsCards from "../../components/MetricsCards";
import MainCharts from "../../components/MainCharts";
import Calendar from "../../components/Calendar";

const BUNKER_MESSAGES = [
  "El límite estricto es 3%. Protege el capital.",
  "Protocolo Búnker activado. Cero emociones, pura ejecución.",
  "Opera lo que ves en el gráfico, no lo que piensas.",
  "La paciencia paga. Espera tu setup de alta probabilidad.",
  "Un buen trader es un gestor de riesgos profesional.",
  "Respeta el plan. Consistencia sobre velocidad."
];

export default function HomePage() {
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [dailyMessage, setDailyMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [timeRange, setTimeRange] = useState("ALL");
  const [displayUnit, setDisplayUnit] = useState("$");
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const [selectedAccount, setSelectedAccount] = useState("ALL");

  useEffect(() => {
    setIsMounted(true);
    const savedAccount = localStorage.getItem("bunker_account");
    if (savedAccount) setSelectedAccount(savedAccount);

    const handleOpenSettings = () => setIsSettingsOpen(true);
    const handleConfigUpdate = () => setForceUpdate(prev => prev + 1);

    window.addEventListener('open-bunker-settings', handleOpenSettings);
    window.addEventListener('bunker-config-updated', handleConfigUpdate);

    return () => {
      window.removeEventListener('open-bunker-settings', handleOpenSettings);
      window.removeEventListener('bunker-config-updated', handleConfigUpdate);
    };
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem("bunker_account", selectedAccount);
  }, [selectedAccount, isMounted]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      const { data: trans } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      const { data: mentorsData } = await supabase
        .from('mentors')
        .select('*')
        .eq('user_id', user.id);
      
      if (trades) setAllTrades(trades);
      if (trans) setAllTransactions(trans);
      if (mentorsData) setMentors(mentorsData);
    }
    
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchDashboardData(); 
    setDailyMessage(BUNKER_MESSAGES[Math.floor(Math.random() * BUNKER_MESSAGES.length)]);
  }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? '¡Buenos días' : currentHour < 19 ? '¡Buenas tardes' : '¡Buenas noches';

  const filteredTrades = useMemo(() => {
    return allTrades.filter(t => {
      const safeDateStr = t.created_at ? t.created_at.replace(' ', 'T') : new Date().toISOString();
      const date = new Date(safeDateStr);
      const now = new Date();
      
      const passAccount = selectedAccount === "ALL" || t.account === selectedAccount;
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

      return passAccount && passMonth && passTime;
    });
  }, [allTrades, selectedMonth, selectedAccount, timeRange]);

  const financialData = useMemo(() => {
    let deposits = 0, withdrawals = 0, bonus = 0;

    allTransactions.forEach(t => {
      const txAccount = t.account || t.broker; 
      if (selectedAccount === "ALL" || txAccount === selectedAccount) {
        if (t.type === 'DEPOSIT') deposits += Number(t.amount || 0);
        if (t.type === 'WITHDRAWAL') withdrawals += Number(t.amount || 0);
        if (t.type === 'BONUS') bonus += Number(t.amount || 0);
      }
    });

    return { deposits, withdrawals, bonus, baseCapital: deposits - withdrawals };
  }, [allTransactions, selectedAccount, forceUpdate]); 

  const metrics = useMemo(() => {
    let grossProfit = 0, grossLoss = 0, wins = 0, losses = 0, be = 0;
    let totalWinAmount = 0, totalLossAmount = 0, cumulative = 0, currentStreak = 0, streakType = 'none';
    let peak = 0, maxDrawdown = 0; 
    const equityData: any[] = [];

    const isBinarias = selectedAccount !== "ALL" && mentors.some(m => m.broker === selectedAccount && m.account_type === 'binarias');

    const globalTrades = allTrades.filter(t => selectedAccount === "ALL" || t.account === selectedAccount);
    const globalNetProfit = globalTrades.reduce((acc, t) => acc + ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)), 0);
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

    let nPF = Math.min(profitFactor * 50, 100); 
    const rawRatioWL = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? 2 : 0);
    let nRatio = Math.min(rawRatioWL * 50, 100); 

    if (isBinarias) {
      nPF = winRate >= 55 ? Math.min(winRate + 20, 100) : Math.max(0, winRate - 10);
      nRatio = winRate >= 55 ? Math.min(winRate + 20, 100) : Math.max(0, winRate - 10);
    }

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
  }, [allTrades, filteredTrades, financialData, selectedAccount, mentors]);

  const winRateChartData = [
    { name: 'Wins', value: metrics.wins, color: '#10b981' },
    { name: 'BE', value: metrics.be, color: '#64748b' },
    { name: 'Losses', value: metrics.losses, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  const pfCapped = Math.min(metrics.profitFactor, 3);
  const pfChartData = [ { name: 'PF', value: pfCapped }, { name: 'Rest', value: 3 - pfCapped } ];
  const pfColor = metrics.profitFactor >= 1.5 ? '#10b981' : metrics.profitFactor >= 1 ? '#f59e0b' : '#f43f5e';

  if (!isMounted) return null;

return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 min-h-screen font-sans pb-10 lg:pl-[250px] relative transition-colors duration-300">
      
      <BunkerSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} selectedAccount={selectedAccount} />
      
      <Topbar 
        title="Panel de Control" 
        icon="speed" 
        displayUnit={displayUnit} 
        setDisplayUnit={setDisplayUnit} 
        selectedAccount={selectedAccount} 
        setSelectedAccount={setSelectedAccount} 
        onAddTradeClick={() => window.dispatchEvent(new Event('open-add-trade'))} 
      />

      <main className="pt-20 md:pt-24 px-4 md:px-6 max-w-[1400px] mx-auto space-y-6">
        
        <DashboardHeader 
          greeting={greeting} 
          dailyMessage={dailyMessage} 
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

        <div className="mt-6">
          <Calendar 
            filteredTrades={allTrades.filter(t => selectedAccount === "ALL" || t.account === selectedAccount)} 
            selectedMonth={selectedMonth} 
            onTradeUpdated={fetchDashboardData} 
          />
        </div>

      </main>
    </div>
  );

}