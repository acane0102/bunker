"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#0b0914] flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      
      {/* Brillo de fondo sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-[#131022] border border-slate-800 rounded-3xl p-8 lg:p-10 max-w-md w-full text-center shadow-2xl relative z-10">
        
        {/* Ícono central */}
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-3xl text-indigo-400">hourglass_top</span>
        </div>

        {/* Textos */}
        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Cuenta en revisión</h1>
        <p className="text-sm text-slate-400 font-medium mb-8 leading-relaxed">
          Tu perfil ha sido registrado con éxito. BúnkerApp opera como un entorno institucional cerrado. Actualmente te encuentras en lista de espera y tu acceso será habilitado una vez que el administrador valide tu cuenta.
        </p>

        {/* Botón de salida */}
        <button
          onClick={handleLogout}
          className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm py-4 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Cerrar Sesión
        </button>

      </div>
    </div>
  );
}