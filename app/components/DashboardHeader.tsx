"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardHeader({ greeting, dailyMessage, timeRange, setTimeRange, equidadTotal, saldoReal, bonus }: any) {
  const [userName, setUserName] = useState("...");

  useEffect(() => {
    const fetchIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Fallback base (correo cortado) por si todo lo demás falla
        let finalName = user.email?.split('@')[0] || "Trader";

        // 2. Leemos la sesión de Auth (que ya actualizamos en el Perfil)
        const meta = user.user_metadata || {};

        // 3. Usamos tu túnel VIP comprobado para saltar cualquier bloqueo de RLS
        const { data: bunkerProfile } = await supabase.rpc('get_my_bunker_profile');

        // Consolidamos la información (Prioridad: BD -> Auth -> Fallback)
        const preferAlias = bunkerProfile?.prefer_alias !== undefined ? bunkerProfile.prefer_alias : (meta.prefer_alias !== false);
        const alias = bunkerProfile?.alias || meta.alias;
        const fullName = bunkerProfile?.full_name || meta.full_name;

        // Aplicamos la regla: Mostrar alias si está activado y existe, si no, el primer nombre
        if (preferAlias && alias) {
          finalName = alias;
        } else if (fullName) {
          finalName = fullName.split(' ')[0]; 
        }

        setUserName(finalName);
      }
    };
    fetchIdentity();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 relative z-10 transition-all duration-300">
      <div className="w-full lg:w-auto">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            {greeting}, {userName}! <span className="animate-wave origin-bottom-right inline-block">👋</span>
          </h1>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">{dailyMessage}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          {['ALL', 'TODAY', 'WEEK', 'MONTH', 'YEAR'].map((range) => {
            const labels: any = { ALL: 'GLOBAL', TODAY: 'HOY', WEEK: 'SEMANA', MONTH: 'MES', YEAR: 'AÑO' };
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </div>

    <div className="flex gap-2 md:gap-3 w-full lg:w-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex-1 lg:flex-none flex flex-col justify-center items-center lg:items-end shadow-sm relative overflow-hidden group transition-colors duration-300">
           <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
           <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 text-center lg:text-right">Equidad Total</span>
           <span className="text-sm sm:text-xl font-black text-slate-800 dark:text-slate-100">${(equidadTotal || 0).toFixed(2)}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex-1 lg:flex-none flex flex-col justify-center items-center lg:items-end shadow-sm transition-colors duration-300">
           <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 text-center lg:text-right">Capital Base</span>
           <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">${(saldoReal || 0).toFixed(2)}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex-1 lg:flex-none flex flex-col justify-center items-center lg:items-end shadow-sm transition-colors duration-300">
           <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 text-center lg:text-right">Crédito</span>
           <span className="text-xs sm:text-sm font-bold text-indigo-500 dark:text-indigo-400">${(bonus || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}