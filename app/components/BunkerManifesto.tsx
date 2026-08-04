"use client";

export default function BunkerManifesto() {
  const rules = [
    { 
      icon: "gpp_maybe", 
      title: "Riesgo Sagrado", 
      desc: "Nunca exceder el % límite asignado al VIP." 
    },
    { 
      icon: "center_focus_strong", 
      title: "Ejecución Mecánica", 
      desc: "Operar estricto en Zonas de Acción. Cero improvisación." 
    },
    { 
      icon: "block", 
      title: "Cero Revanchas", 
      desc: "Un Stop Loss es un gasto del negocio. Acéptalo y cierra." 
    },
    { 
      icon: "verified_user", 
      title: "Preservación", 
      desc: "El objetivo #1 es proteger el capital, luego ganar." 
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 border-l-4 border-l-indigo-600 dark:border-l-indigo-500 transition-colors duration-300">
      <h2 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-5 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px]">gavel</span> El Manifiesto
      </h2>
      
      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex gap-3 items-start group">
            <div className="w-6 h-6 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 transition-colors">
              <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{rule.icon}</span>
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{rule.title}</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {rule.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}