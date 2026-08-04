"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function MetricsCards({ metrics, winRateChartData, pfChartData, pfColor, tradesLength }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      
      {/* 1. Ganancia Neta */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-slate-600 cursor-default">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Ganancia Neta</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5 text-[9px] font-bold">{tradesLength} Trades</span>
        </div>
        <div className={`text-3xl font-black tabular-nums ${metrics.netPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {metrics.netPL > 0 ? '+' : ''}${metrics.netPL.toFixed(2)}
        </div>
      </div>

      {/* 2. % de Acierto */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-slate-600 cursor-default">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">% de Acierto</span>
        <div className="flex justify-between items-end h-full">
          <div className="flex flex-col justify-end">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none tabular-nums">{metrics.winRate}%</div>
            <div className="flex gap-1 mt-2 text-[9px] font-bold">
              <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded">{metrics.wins} G</span>
              <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">{metrics.be} BE</span>
              <span className="text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1 rounded">{metrics.losses} P</span>
            </div>
          </div>
          <div className="w-14 h-10 relative -mr-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={winRateChartData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="65%" outerRadius="100%" dataKey="value" stroke="none" paddingAngle={2}>{winRateChartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Prom. Ganancia / Pérdida */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-slate-600 cursor-default">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Prom. Ganancia / Pérdida</span>
        <div>
          <div className="flex justify-between text-sm font-bold mb-1 tabular-nums">
            <span className="text-emerald-500">${metrics.avgWin.toFixed(2)}</span>
            <span className="text-rose-500">-${metrics.avgLoss.toFixed(2)}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div style={{ width: `${(metrics.avgWin / (metrics.avgWin + metrics.avgLoss || 1)) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-500"></div>
            <div style={{ width: `${(metrics.avgLoss / (metrics.avgWin + metrics.avgLoss || 1)) * 100}%` }} className="h-full bg-rose-500 transition-all duration-500"></div>
          </div>
        </div>
      </div>

      {/* 4. Factor de Beneficio */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-slate-600 cursor-default">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Factor de Beneficio</span>
        <div className="flex justify-between items-end h-full">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none tabular-nums">{metrics.profitFactor}</div>
          <div className="w-14 h-10 relative -mr-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pfChartData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="65%" outerRadius="100%" dataKey="value" stroke="none"><Cell fill={pfColor} /><Cell fill="rgba(148, 163, 184, 0.1)" /></Pie></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* 5. Drawdown Máximo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-slate-600 cursor-default">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center justify-between">
          Drawdown Máximo <span className="material-symbols-outlined text-[14px] text-rose-400">trending_down</span>
        </span>
        <div className="text-3xl font-black text-rose-500 leading-none tabular-nums">
          {metrics.maxDrawdown < 0 ? `-$${Math.abs(metrics.maxDrawdown).toFixed(2)}` : '$0.00'}
        </div>
      </div>

      {/* 6. Racha Actual */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/20 hover:border-indigo-100 dark:hover:border-slate-600 cursor-default">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Racha Actual</span>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-lg tabular-nums ${metrics.streakType === 'win' ? 'border-emerald-400 text-emerald-500 dark:border-emerald-500/30' : metrics.streakType === 'loss' ? 'border-rose-400 text-rose-500 dark:border-rose-500/30' : 'border-slate-300 text-slate-500 dark:border-slate-700'}`}>
            {metrics.currentStreak}
          </div>
          <div className={`text-xs font-bold uppercase ${metrics.streakType === 'win' ? 'text-emerald-500' : metrics.streakType === 'loss' ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {metrics.streakType === 'win' ? 'Ganadas' : metrics.streakType === 'loss' ? 'Perdidas' : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}