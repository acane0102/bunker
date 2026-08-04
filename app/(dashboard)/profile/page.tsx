"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Topbar from "../../components/Topbar";
import MentorManager from "../../components/MentorManager";
import CapitalManager from "../../components/CapitalManager";
import DiversificationChart from "../../components/DiversificationChart";
import PortfolioHealth from "../../components/PortfolioHealth";
import BunkerManifesto from "../../components/BunkerManifesto";
import BillingHistory from "../../components/BillingHistory";

export default function ProfilePage() {
  const [displayUnit, setDisplayUnit] = useState("$");
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // ESTADOS DE IDENTIDAD Y SEGURIDAD
  const [profileData, setProfileData] = useState({ full_name: '', alias: '', prefer_alias: true, plan: 'FREE', role: 'user', status: 'active' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  
  const [selectedAccount, setSelectedAccount] = useState("ALL");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setIsMounted(true);
    const savedAccount = localStorage.getItem("bunker_account");
    if (savedAccount) setSelectedAccount(savedAccount);
    
    const getUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        const meta = session.user.user_metadata || {};
        const { data: bunkerProfile } = await supabase.rpc('get_my_bunker_profile');

        setProfileData({
          full_name: bunkerProfile?.full_name || meta.full_name || '',
          alias: bunkerProfile?.alias || meta.alias || '',
          prefer_alias: bunkerProfile?.prefer_alias !== false,
          plan: bunkerProfile?.plan ? bunkerProfile.plan.toUpperCase() : 'FREE',
          role: bunkerProfile?.role ? bunkerProfile.role.toLowerCase() : 'user',
          status: bunkerProfile?.status || 'active' // GUARDAMOS EL ESTADO DEL BANEO
        });
      }
    };
    getUserAndProfile();
  }, [supabase.auth]);

  useEffect(() => {
    if (isMounted) localStorage.setItem("bunker_account", selectedAccount);
  }, [selectedAccount, isMounted]);

  const handleSaveIdentity = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: profileData.full_name,
        alias: profileData.alias,
        prefer_alias: profileData.prefer_alias
      }
    });

    const { error: dbError } = await supabase.rpc('update_my_profile', {
      p_full_name: profileData.full_name,
      p_alias: profileData.alias,
      p_prefer_alias: profileData.prefer_alias
    });
    
    if (authError || dbError) {
      alert("Error al actualizar: " + (authError?.message || dbError?.message));
      setIsSaving(false);
      return;
    }
    
    setIsSaving(false);
    setIsEditing(false);
    setTimeout(() => window.location.reload(), 400);
  };

  // EL INTERCEPTOR: Si toca el lápiz estando baneado, bloquea.
  const handleEditClick = () => {
    if (profileData.status === 'suspended' || profileData.status === 'banned') {
      setShowSuspendedModal(true);
    } else {
      setIsEditing(!isEditing);
    }
  };

  const email = user?.email || "Cargando...";
  const activeName = profileData.prefer_alias && profileData.alias ? profileData.alias : (profileData.full_name || email.split('@')[0] || "Trader");
  const initial = activeName.charAt(0).toUpperCase();

  if (!isMounted) return null;

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 min-h-screen font-sans pb-10 pl-[250px] relative transition-colors duration-300">
        <Topbar 
          title="Profile & Settings" 
          icon="person" 
          displayUnit={displayUnit} 
          setDisplayUnit={setDisplayUnit} 
          selectedAccount={selectedAccount} 
          setSelectedAccount={setSelectedAccount} 
        />

        <main className="pt-24 px-6 max-w-[1400px] mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              
              {/* TARJETA DE IDENTIDAD */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative transition-colors duration-300">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Datos del Operador</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest border ${
                    profileData.role === 'root' || profileData.plan === 'PRO' || profileData.plan === 'ELITE' 
                    ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' 
                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}>
                    {profileData.role === 'root' ? 'ROOT (ACCESO TOTAL)' : `PLAN ${profileData.plan}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                    {initial}
                  </div>
                  <div className="overflow-hidden w-full flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg truncate">{activeName}</h3>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{email}</div>
                    </div>
                    {/* BOTÓN CON INTERCEPTOR INYECTADO */}
                    <button onClick={handleEditClick} className="text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="material-symbols-outlined text-[18px] block">{isEditing ? 'close' : 'edit'}</span>
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 block">Nombre Legal</label>
                      <input type="text" value={profileData.full_name} onChange={(e) => setProfileData({...profileData, full_name: e.target.value})} placeholder="Ej: Juan Diaz" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 block">Alias Comercial / Apodo</label>
                      <input type="text" value={profileData.alias} onChange={(e) => setProfileData({...profileData, alias: e.target.value})} placeholder="Ej: ZIZA" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Mostrar Alias</span>
                        <span className="text-[10px] text-slate-500 block">Priorizar apodo sobre nombre real</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={profileData.prefer_alias} onChange={(e) => setProfileData({...profileData, prefer_alias: e.target.checked})} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    <button onClick={handleSaveIdentity} disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2">
                      {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 block">Identificador Comercial</label>
                    <input type="text" value={`${activeName} Trading Corp.`} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 outline-none cursor-default" readOnly />
                  </>
                )}
              </div>

              <DiversificationChart />
              <PortfolioHealth />
              <BunkerManifesto />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <CapitalManager />
              <MentorManager />
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE SEGURIDAD (CONGELAMIENTO) */}
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