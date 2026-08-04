"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import UpgradeButton from "./UpgradeButton"; // <-- IMPORTAMOS EL BOTÓN

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
  const [showUpgradeBtn, setShowUpgradeBtn] = useState(false); // <-- CONTROL DEL BOTÓN

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
      // 1. Buscamos los brokers
      const [txRes, mentorsRes] = await Promise.all([
        supabase.from('transactions').select('broker').eq('user_id', user.id),
        supabase.from('mentors').select('broker').eq('user_id', user.id)
      ]);

      const txBrokers = txRes.data ? txRes.data.map(t => t.broker) : [];
      const mentorBrokers = mentorsRes.data ? mentorsRes.data.map(m => m.broker) : [];

      const uniqueNames = Array.from(new Set([...txBrokers, ...mentorBrokers].filter(Boolean)));
      setActiveBrokers(uniqueNames as string[]);

      // 2. BUSCAMOS SI ESTÁ SUSPENDIDO O PRÓXIMO A VENCER
      const { data: bunkerProfile } = await supabase.rpc('get_my_bunker_profile');
      if (bunkerProfile) {
        if (bunkerProfile.status) setAccountStatus(bunkerProfile.status);

        // Matemática para mostrar el botón de pago (5 días o menos, o caducado)
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
          // Si ya caducó oficialmente (pasaron los 3 días de gracia), mostrar el botón a la fuerza
          setShowUpgradeBtn(true);
        }
      }
    }
  };

  // Ejecutamos la búsqueda al cargar y escuchamos si hay actualizaciones
  useEffect(() => {
    fetchActiveBrokersAndStatus();

    const handleUpdate = () => fetchActiveBrokersAndStatus();
    window.addEventListener('bunker-config-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('bunker-config-updated', handleUpdate);
    };
  }, []);

  // INTERCEPTOR DE ACCIONES
  const handleSettingsClick = () => {
    if (accountStatus === 'suspended' || accountStatus === 'banned') {
      setShowSuspendedModal(true); // Bloqueamos y mostramos el modal rojo
    } else {
      window.dispatchEvent(new Event('open-bunker-settings')); // Flujo normal
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-8 py-4 flex justify-between items-center transition-all duration-300">
        
        {/* SECCIÓN IZQUIERDA: TÍTULO E ICONO */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">{icon}</span>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">
            {title} 
            <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full ml-2 align-middle">
              Actualizado
            </span>
          </h1>
        </div>

        {/* SECCIÓN DERECHA: CONTROLES Y PAGOS */}
        <div className="flex items-center gap-4">
          
          {/* BOTÓN DE RENOVACIÓN (Aparece solo si hay urgencia) */}
          {showUpgradeBtn && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <UpgradeButton />
            </div>
          )}

          {/* BOTÓN INTERRUPTOR MODO OSCURO */}
          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {/* FILTROS */}
          {showFilters !== false && (
            <>
              {/* SELECTOR DE VISTA */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[16px] text-indigo-500 dark:text-indigo-400 pointer-events-none">visibility</span>
                <select 
                  value={displayUnit} 
                  onChange={(e) => setDisplayUnit(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none cursor-pointer appearance-none transition-colors"
                >
                  <option value="$">Vista: Dólares ($)</option>
                  <option value="%">Vista: Porcentaje (%)</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 text-[16px] text-slate-400 dark:text-slate-500 pointer-events-none">expand_more</span>
              </div>

              {/* SELECTOR DINÁMICO DE BÚNKER + BOTÓN DE AJUSTES */}
              <div className="flex items-center gap-2">
                <select 
                  value={selectedAccount} 
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-colors"
                >
                  <option value="ALL">VISIÓN GLOBAL</option>
                  {activeBrokers.map(broker => (
                    <option key={broker} value={broker}>{broker}</option>
                  ))}
                </select>
                
                {/* BOTÓN CON INTERCEPTOR DE SEGURIDAD */}
                <button 
                  onClick={handleSettingsClick} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-9 h-9 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-colors"
                  title="Ajustes de Capital Base"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE CUENTA SUSPENDIDA (DISEÑO INSTITUCIONAL OSCURO) */}
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