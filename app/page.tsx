import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  // 1. VERIFICACIÓN DE SESIÓN (Protección de ruta)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Si el usuario ya está logueado, no le mostramos la Landing, lo enviamos directo a su app
  if (session) {
    redirect("/dashboard"); // IMPORTANTE: Asegúrate de que tu viejo Dashboard ahora viva en app/dashboard/page.tsx
  }

  return (
    <div className="min-h-screen bg-[#090714] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      
      {/* EFECTOS DE FONDO GLOBALES */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed w-full top-0 z-50 bg-[#090714]/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-xl leading-none">B</span>
            </div>
            <span className="text-xl font-black text-white tracking-tight">BÚNKERAPP</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#radar" className="hover:text-white transition-colors">Índice Búnker</a>
            <a href="#pricing" className="hover:text-white transition-colors">Acceso PRO</a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/login" 
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all border border-indigo-500"
            >
              Solicitar Acceso
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6 max-w-[1200px] mx-auto relative z-10 flex flex-col items-center text-center mt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-widest mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Sistema Institucional de Trading Activo
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 tracking-tighter">
          Audita tus operaciones. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            Protege tu capital.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 font-medium">
          Olvida los Excel desordenados. BúnkerApp consolida tu rendimiento, controla tu psicología con etiquetas mentales y te obliga a respetar el plan. Cero emociones, pura ejecución.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/login" 
            className="px-8 py-4 rounded-xl text-sm font-black bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            Entrar al Búnker <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <Link 
            href="#features" 
            className="px-8 py-4 rounded-xl text-sm font-black bg-[#131022] text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            Ver por dentro <span className="material-symbols-outlined text-[18px]">visibility</span>
          </Link>
        </div>

        {/* DASHBOARD PREVIEW MOCKUP */}
        <div className="w-full mt-20 relative rounded-2xl md:rounded-[2rem] border border-slate-700/50 bg-[#0b0914] p-2 md:p-4 shadow-2xl shadow-indigo-900/20 overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-t from-[#090714] via-transparent to-transparent z-10"></div>
           <div className="aspect-[16/9] w-full bg-[#131022] rounded-xl md:rounded-2xl border border-slate-800/80 overflow-hidden relative">
              <div className="absolute top-0 w-full h-12 border-b border-slate-800/80 flex items-center px-4 gap-2">
                 <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="absolute top-16 left-4 right-4 bottom-4 grid grid-cols-4 gap-4">
                 <div className="col-span-1 bg-[#0b0914] rounded-lg border border-slate-800 hidden md:block"></div>
                 <div className="col-span-4 md:col-span-3 grid grid-rows-3 gap-4">
                    <div className="row-span-1 flex gap-4">
                       <div className="flex-1 bg-[#0b0914] rounded-lg border border-slate-800"></div>
                       <div className="flex-1 bg-[#0b0914] rounded-lg border border-slate-800"></div>
                       <div className="flex-1 bg-[#0b0914] rounded-lg border border-slate-800"></div>
                    </div>
                    <div className="row-span-2 flex gap-4">
                       <div className="flex-[2] bg-gradient-to-br from-indigo-900/20 to-transparent rounded-lg border border-indigo-500/20"></div>
                       <div className="flex-1 bg-[#0b0914] rounded-lg border border-slate-800"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* FEATURES GRID */}
      <section id="features" className="py-24 bg-[#0b0914] border-t border-slate-800/50">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">La matemática no miente.</h2>
            <p className="text-slate-400 font-medium max-w-2xl mx-auto">Herramientas diseñadas para erradicar el overtrading y enfocar tu capital en setups de alta probabilidad.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#131022] p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-indigo-400 text-[24px]">radar</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Índice Búnker Operativo</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Un radar en tiempo real que evalúa tu Tasa de Acierto, Factor de Beneficio y Recuperación. Descubre al instante si eres un francotirador o estás en riesgo de quiebra.
              </p>
            </div>
            <div className="bg-[#131022] p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-emerald-400 text-[24px]">psychology</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Psicología y Etiquetas</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                No solo anotes cuánto ganaste. Etiqueta si operaste por FOMO, revancha o si te apegaste al plan. Adjunta capturas de pantalla para una auditoría visual impecable.
              </p>
            </div>
            <div className="bg-[#131022] p-8 rounded-3xl border border-slate-800 hover:border-amber-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-amber-400 text-[24px]">account_balance</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Aislamiento de Mentores</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Separa tu operativa de Forex, Binarias o Sintéticos. Crea entornos aislados para diferentes mentores y evalúa qué estrategia realmente te hace rentable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-slate-800 bg-[#090714] text-center">
        <div className="max-w-[800px] mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Tu capital merece respeto.</h2>
          <p className="text-slate-400 mb-10">Únete al ecosistema y lleva un control profesional por menos del costo de un stop loss.</p>
          <Link 
            href="/login" 
            className="px-10 py-5 rounded-xl text-sm font-black bg-white text-[#090714] hover:bg-slate-200 transition-all uppercase tracking-widest inline-flex items-center gap-2"
          >
            Obtener Licencia PRO <span className="material-symbols-outlined text-[18px]">bolt</span>
          </Link>
          
          <div className="mt-16 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>© 2026 BúnkerApp. Cero Revanchas.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-300">Términos</a>
              <a href="#" className="hover:text-slate-300">Privacidad</a>
              <a href="#" className="hover:text-slate-300">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}