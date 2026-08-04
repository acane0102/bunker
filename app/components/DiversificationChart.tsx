"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function DiversificationChart() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const [txRes, tradesRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('trades').select('*').eq('user_id', user.id)
        ]);
        if (txRes.data) setTransactions(txRes.data);
        if (tradesRes.data) setTrades(tradesRes.data);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    // 1. EXTRACCIÓN BLINDADA: Buscamos tanto en 'account' como en 'broker' para que no escape ninguno
    const txBrokers = transactions.map(t => t.account || t.broker).filter(Boolean);
    const tradeBrokers = trades.map(t => t.account || t.broker).filter(Boolean);
    
    // Unimos todos los nombres y quitamos los repetidos
    const uniqueBrokers = Array.from(new Set([...txBrokers, ...tradeBrokers]));

    // 2. Paleta de colores institucionales
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

    // 3. MATEMÁTICAS SEGURAS: Prevenimos el error NaN si algún valor viene nulo
    const data = uniqueBrokers.map((brokerName, index) => {
      const brokerTxs = transactions.filter(t => (t.account || t.broker) === brokerName);
      const brokerTrades = trades.filter(t => (t.account || t.broker) === brokerName);

      const deposits = brokerTxs.filter(t => t.type === 'DEPOSIT').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const withdrawals = brokerTxs.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const bonus = brokerTxs.filter(t => t.type === 'BONUS').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

      const pnl = brokerTrades.reduce((acc, t) => {
        const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
        return acc + net;
      }, 0);

      const value = (deposits - withdrawals + pnl) + bonus;

      return {
        name: brokerName,
        value: Number(value.toFixed(2)), // Forzamos a que sea un número limpio de 2 decimales
        color: colors[index % colors.length]
      };
    });

    // Filtramos para que el gráfico solo dibuje pedazos mayores a $0
    return data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [transactions, trades]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex items-center justify-center h-[250px] transition-colors duration-300">
        <span className="text-xs font-bold text-slate-400 animate-pulse">Cargando gráfico...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative transition-colors duration-300">
      <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">pie_chart</span> Diversificación
      </h2>
      
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-xs font-bold text-slate-500">Sin capital activo</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[80px]" title={item.name as string}>{item.name}</span>
                </div>
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">${item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}