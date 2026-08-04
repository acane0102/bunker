"use client";

import { supabase } from "@/lib/supabase";

export default function EmergencyLogout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login"; // Forzamos recarga para limpiar todo
  };

  return (
    <button 
      onClick={handleLogout} 
      className="mt-6 text-slate-500 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 mx-auto"
    >
      <span className="material-symbols-outlined text-[16px]">logout</span>
      Cerrar Sesión para cambiar de cuenta
    </button>
  );
}