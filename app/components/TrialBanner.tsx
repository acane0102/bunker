"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import UpgradeButton from "./UpgradeButton";

export default function TrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const { data: profile } = await supabase.rpc('get_my_bunker_profile');
      
      if (profile && profile.expires_at && !profile.is_expired) {
        const targetDate = new Date(profile.expires_at);
        const now = new Date();
        
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setDaysLeft(diffDays);

        if (diffDays <= 5) {
          if (diffDays < 0) {
            setIsGracePeriod(true); 
          }

          const hasSeenModal = sessionStorage.getItem("bunker_expiration_warning");
          if (!hasSeenModal) {
            setShowModal(true);
            sessionStorage.setItem("bunker_expiration_warning", "true");
          }
        }
      }
    };
    
    checkStatus();
  }, []);

  // SOLO RENDERIZAMOS EL MODAL AMARILLO, EL BANNER DE TEXTO FUE ELIMINADO
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0b0914] border border-amber-500/30 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center relative">
        
        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="w-16 h-16 bg-amber-500/10 flex items-center justify-center rounded-full mb-5 border border-amber-500/20">
          <span className="material-symbols-outlined text-3xl text-amber-400">hourglass_bottom</span>
        </div>
        
        <h3 className="text-xl font-bold text-slate-100 mb-2">
          {isGracePeriod ? '¡Atención Requerida!' : 'Tu Licencia expira pronto'}
        </h3>
        
        <p className="text-sm text-slate-400 mb-6 px-2">
          {isGracePeriod 
            ? `Tu plan ya caducó. Te hemos otorgado un período de gracia de 3 días para que tu Búnker no se bloquee. Te quedan ${3 + (daysLeft || 0)} día(s) de gracia.`
            : `Te quedan ${daysLeft} días de suscripción activa. Asegura tu acceso continuo y evita bloqueos renovando ahora.`}
        </p>
        
        <UpgradeButton className="w-full py-3.5 text-sm" />
        
        <button onClick={() => setShowModal(false)} className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-300">
          Recordarme más tarde
        </button>
      </div>
    </div>
  );
}