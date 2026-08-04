"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export default function PortfolioHealth() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTx = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase.from('transactions')
          .select('*')
          .eq('user_id', user.id);
          
        if (data) setTransactions(data);
      }
      setIsLoading(false);
    };
    fetchTx();
  }, []);

  const { deposits, withdrawals, roi, progress } = useMemo(() => {
    let deps = 0;
    let withs = 0;
    
    transactions.forEach(t => {
      if (t.type === 'DEPOSIT') deps += Number(t.amount);
      if (t.type === 'WITHDRAWAL') withs += Number(t.amount);
    });

    const roiVal = deps > 0 ? (withs / deps) * 100 : 0;
    const progressVal = Math.min(roiVal, 100); 

    return { deposits: deps, withdrawals: withs, roi: roiVal, progress: progressVal };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 h-[140px] flex items-center justify-center transition-colors duration-300">
        <span className="text-xs font-bold text-slate-400 animate-pulse">Calculando ROI...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative transition-colors duration-300">
      <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1" title="El ROI se calcula dividiendo tus retiros entre tus depósitos totales.">
        <span className="material-symbols-outlined text-[16px]">health_and_safety</span> Salud del Portafolio (ROI)
      </h2>

      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="text-[22px] font-black text-emerald-500 dark:text-emerald-400 leading-none tabular-nums">
            {roi.toFixed(1)}%
          </div>
          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Capital Recuperado
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">
            ${withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
            de ${deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })} invertidos
          </div>
        </div>
      </div>

      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden mt-4 shadow-inner relative">
        <div 
          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out relative"
          style={{ width: `${progress}%` }}
        >
           {progress > 0 && <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>}
        </div>
      </div>
      
      {roi >= 100 && (
         <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 mt-3 text-center uppercase tracking-widest animate-pulse">
           🚀 ¡Operando con dinero del mercado!
         </p>
      )}
    </div>
  );
}