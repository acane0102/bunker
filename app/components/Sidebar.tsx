"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect } from "react";

// AQUÍ IMPORTAMOS TU MODAL PREMIUM REAL
import ImportTradesModal from "./ImportTradesModal"; 

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Estados Dinámicos para el Perfil
  const [userName, setUserName] = useState("Cargando...");
  const [initials, setInitials] = useState("--");
  
  // ESTADO PARA CONTROLAR TU MODAL
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Operador VIP";
        setUserName(name);
        setInitials(name.substring(0, 2).toUpperCase());
      }
    };
    fetchUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: "query_stats" },
    { name: "Metricas", href: "/metrics", icon: "calendar_month" },
    { name: "Operaciones (Historial)", href: "/logs", icon: "receipt_long" },
    { name: "Perfil", href: "/profile", icon: "menu_book" },
  ];

  return (
    <>
      <aside className="w-[250px] bg-[#0b0914] text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800/50 z-40 font-sans">
        
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20">
            B
          </div>
          <span className="font-extrabold text-xl tracking-wide text-white">
            BÚNKER<span className="text-indigo-500">APP</span>
          </span>
        </div>

        {/* ÁREA DE BOTONES DE ACCIÓN */}
        <div className="px-4 py-2 flex flex-col gap-2">
          <button 
            onClick={() => window.dispatchEvent(new Event('open-add-trade'))}
            className="w-full cursor-pointer bg-[#6366f1] hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Añadir Operación
          </button>

          {/* BOTÓN CONECTADO AL ESTADO LOCAL */}
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="w-full cursor-pointer bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs"
          >
            <span className="material-symbols-outlined text-[16px]">upload</span>
            Importar CSV
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/' && pathname !== '/metrics' && pathname !== '/logs' && pathname !== '/profile');
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-900/40 border-l-4 border-indigo-500 text-white"
                    : "hover:bg-white/5 hover:text-white text-slate-400 border-l-4 border-transparent"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-indigo-400' : ''}`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* PERFIL DINÁMICO */}
        <div className="p-4 border-t border-slate-800/80 bg-[#07050f] flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-900 to-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#07050f]"></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="font-bold text-sm text-white truncate" title={userName}>{userName}</h4>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider truncate">Protocolo Búnker</p>
          </div>
          
          <button 
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="text-slate-500 hover:text-rose-500 transition-colors cursor-pointer flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </aside>

      {/* AQUÍ MONTAMOS TU MODAL PREMIUM */}
      <ImportTradesModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={() => {
          setIsImportModalOpen(false);
          router.refresh(); // Refresca la página para mostrar los nuevos trades
        }} 
      />
    </>
  );
}