"use client";

import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import BunkerRadar from './BunkerRadar';

export default function MainCharts({ equityData, radarData, indiceScore, hasTrades }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
      
      {/* Gráfico Curva de Rendimiento (P&L) */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[350px]">
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Cumulative Net P&L (Curva de Rendimiento)</h3>
        <div className="flex-grow w-full">
          {equityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                
                <Tooltip 
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Neto']}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#f8fafc', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                
                <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPnL)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400 dark:text-slate-600">Sin datos operativos en este rango de tiempo.</div>
          )}
        </div>
      </div>

      {/* Módulo de Radar */}
      <BunkerRadar 
        radarData={radarData} 
        indiceScore={indiceScore} 
        hasTrades={hasTrades} 
      />
    </div>
  );
}