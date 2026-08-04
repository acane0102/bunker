import Sidebar from "../components/Sidebar";
import { Toaster } from "react-hot-toast";
import GlobalModals from "../components/GlobalModals";
import TrialBanner from "../components/TrialBanner";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js"; 
import { cookies } from "next/headers";
import EmergencyLogout from "../components/EmergencyLogout"; 

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  let isSuspended = false;

  if (user) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();
      
    if (profile?.status === 'suspended' || profile?.status === 'banned') {
      isSuspended = true;
    }
  }

  // PANTALLA NEGRA (Ahora usa un DIV que cubre todo en lugar de un HTML nuevo)
  if (isSuspended) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#090714] text-slate-300 flex items-center justify-center selection:bg-rose-500/30">
        <div className="bg-[#131022] border border-rose-900/30 p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
          
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <span className="material-symbols-outlined text-rose-500 text-4xl">gavel</span>
          </div>
          
          <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Acceso Suspendido</h1>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            Tu cuenta ha sido restringida por violar las políticas operativas o por decisión administrativa. Tu Búnker se encuentra sellado.
          </p>
          
          <a 
            href="https://t.me/tu_usuario_admin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm py-4 rounded-xl transition-all shadow-lg shadow-rose-900/20"
          >
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            Contactar Soporte
          </a>

          <EmergencyLogout />
        </div>
      </div>
    );
  }

  // RENDERIZADO NORMAL 
  return (
    <div className="flex w-full min-h-screen overflow-hidden bg-[#07050f]">
      <Sidebar />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#fff', fontSize: '14px', fontWeight: 'bold', borderRadius: '12px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } }
        }} 
      />
      <GlobalModals />
      
      {/* EL CONTENEDOR PRINCIPAL: Ahora respeta el Sidebar en PC y no desborda en móvil */}
      <main className="flex-1 flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden md:ml-[250px]">
        <TrialBanner />
        {children}
      </main>
    </div>
  );
}