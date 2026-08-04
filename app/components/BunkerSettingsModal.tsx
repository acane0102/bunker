"use client";

/* INICIO IMPORTACIONES */
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
/* FIN IMPORTACIONES */

/* INICIO COMPONENTE PRINCIPAL: BunkerSettingsModal */
export default function BunkerSettingsModal({ isOpen, onClose, selectedAccount, onSave }: any) {
  
  /* INICIO ESTADOS */
  const [capital, setCapital] = useState("0");
  const [bonus, setBonus] = useState("0");
  /* FIN ESTADOS */

  /* INICIO EFECTOS */
  useEffect(() => {
    if (isOpen) {
      // Cargar la configuración guardada de la cuenta seleccionada
      setCapital(localStorage.getItem(`bunker_capital_${selectedAccount}`) || "0");
      setBonus(localStorage.getItem(`bunker_bonus_${selectedAccount}`) || "0");
    }
  }, [isOpen, selectedAccount]);
  /* FIN EFECTOS */

  /* INICIO FUNCIONES */
  const handleSave = () => {
    localStorage.setItem(`bunker_capital_${selectedAccount}`, capital);
    localStorage.setItem(`bunker_bonus_${selectedAccount}`, bonus);
    
    // Disparar evento para que el Dashboard (page.tsx) recalcule
    window.dispatchEvent(new Event('bunker-config-updated'));
    
    toast.success(`Capital actualizado para ${selectedAccount}`);
    if(onSave) onSave();
    onClose();
  };
  /* FIN FUNCIONES */

  if (!isOpen) return null;

  /* INICIO RENDERIZADO VISUAL */
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        
        {/* HEADER */}
        <div className="bg-slate-50 dark:bg-slate-900 px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">account_balance</span>
            Ajustes: {selectedAccount}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-white dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-3 rounded-xl mb-2">
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-center">
              Define el saldo inicial manual para ignorar el historial viejo.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Capital Base ($)</label>
            <input type="number" step="0.01" value={capital} onChange={(e) => setCapital(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Crédito / Bono ($)</label>
            <input type="number" step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 transition-colors" />
          </div>

          <button onClick={handleSave} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-4 rounded-xl transition-all shadow-md shadow-indigo-500/20 dark:shadow-none">
            ACTUALIZAR BÚNKER
          </button>
        </div>
      </div>
    </div>
  );
  /* FIN RENDERIZADO VISUAL */
}
/* FIN COMPONENTE PRINCIPAL: BunkerSettingsModal */