"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import UpgradeButton from "./UpgradeButton"; 

export default function Topbar({ 
  title, 
  icon, 
  displayUnit, 
  setDisplayUnit, 
  selectedAccount, 
  setSelectedAccount, 
  showFilters
}: any) {

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeBrokers, setActiveBrokers] = useState<string[]>([]); 
  
  // ESTADOS DE SEGURIDAD Y PAGOS
  const [accountStatus, setAccountStatus] = useState("active");
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [showUpgradeBtn, setShowUpgradeBtn] = useState(false); 

  // Lógica de Modo Oscuro
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // Cargar brokers y ESTADO DE LA CUENTA
  const fetchActiveBrokersAndStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const [txRes, mentorsRes] = await Promise.all([
        supabase.from('transactions').select('broker').eq('user_id', user.id),
        supabase.from('mentors').select('broker').eq('user_id', user.id)
      ]);

      const txBrokers = txRes.data ? txRes.data.map(t => t.broker) : [];
      const mentorBrokers = mentorsRes.data ? mentorsRes.data.map(m => m.broker) : [];

      const uniqueNames = Array.from(new Set([...txBrokers, ...mentorBrokers].filter(Boolean)));
      setActiveBrokers(uniqueNames as string[]);

      const { data: bunkerProfile } = await supabase.rpc('get_my_bunker_profile');
      if (bunkerProfile) {
        if (bunkerProfile.status) setAccountStatus(bunkerProfile.status);

        if (bunkerProfile.expires_at && !bunkerProfile.is_expired) {
          const targetDate = new Date(bunkerProfile.expires_at);
          const diffTime = targetDate.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 5) {
            setShowUpgradeBtn(true);
          } else {
            setShowUpgradeBtn(false);
          }
        } else if (bunkerProfile.is_expired) {
          setShowUpgradeBtn(true);
        }
      }
    }
  };

  useEffect(() => {
    fetchActiveBrokersAndStatus();

    const handleUpdate = () => fetchActiveBrokersAndStatus();
    window.addEventListener('bunker-config-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('bunker-config-updated', handleUpdate);
    };
  }, []);

  const handleSettingsClick = () => {
    if (accountStatus === 'suspended' || accountStatus === 'banned') {
      setShowSuspendedModal(true); 
    } else {
      window.dispatchEvent(new Event('open-bunker-settings')); 
    }
  };

  return (
    <>
      {/* CONTENEDOR RESPONSIVO: flex-wrap para que baje en móviles */}
      <div className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-4 md:px-8 py-3 md:py-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-3 transition-all duration-300">
        
        {/* SECCIÓN IZQUIERDA: HAMBURGUESA, TÍTULO E ICONO */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            {/* BOTÓN HAMBURGUESA: Solo visible en móvil, dispara el evento para abrir Sidebar */}
            <button 
              onClick={() => window.dispatchEvent(new Event('toggle-mobile-menu'))}
              className="md:hidden p-1.5 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <span className="material-symbols-outlined text-indigo-500 hidden sm:block">{icon}</span>
            <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 truncate">
              {title} 
              <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full ml-2 align-middle hidden sm:inline-block">
                Actualizado
              </span>
            </h1>
          </div>

          {/* MODO OSCURO EN MÓVIL (Lo movemos aquí para ahorrar espacio abajo) */}
          <button 
            onClick={toggleDarkMode} 
            className="md:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
        </div>

        {/* SECCIÓN DERECHA: CONTROLES Y PAGOS */}
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          
          {showUpgradeBtn && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 shrink-0">
               <UpgradeButton />
            </div>
          )}

          {/* MODO OSCURO EN PC */}
          <button 
            onClick={toggleDarkMode} 
            className="hidden md:block p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-xl">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {showFilters !== false && (
            <>
              <div className="relative flex items-center shrink-0">
                <span className="material-symbols-outlined absolute left-2 md:left-3 text-[14px] md:text-[16px] text-indigo-500 pointer-events-none">visibility</span>
                <select 
                  value={displayUnit} 
                  onChange={(e) => setDisplayUnit(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 md:pl-9 pr-6 md:pr-8 py-1.5 md:py-2 text-[11px] md:text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none cursor-pointer appearance-none transition-colors"
                >
                  <option value="$">Vista: Dólares ($)</option>
                  <option value="%">Vista: Porcentaje (%)</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 md:right-2 text-[14px] md:text-[16px] text-slate-400 pointer-events-none">expand_more</span>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <select 
                  value={selectedAccount} 
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-colors max-w-[120px] md:max-w-none truncate"
                >
                  <option value="ALL">VISIÓN GLOBAL</option>
                  {activeBrokers.map(broker => (
                    <option key={broker} value={broker}>{broker}</option>
                  ))}
                </select>
                
                <button 
                  onClick={handleSettingsClick} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-7 h-7 md:w-9 md:h-9 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] md:text-[18px]">settings</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showSuspendedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0914] border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 flex items-center justify-center rounded-full mb-5">
              <span className="material-symbols-outlined text-3xl text-rose-500">lock</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Acceso Restringido</h3>
            <p className="text-sm text-slate-400 mb-8 px-2">
              Su cuenta se encuentra suspendida temporalmente. No puede realizar modificaciones ni registrar nuevas operaciones.
            </p>
            <button 
              onClick={() => setShowSuspendedModal(false)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}