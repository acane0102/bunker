"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'consent', access_type: 'offline' } 
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        router.push("/panel");
        router.refresh();
      } else {
        // Registro limpio: Solo email y pass. El perfil se edita adentro.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.session) {
          router.push("/panel");
          router.refresh();
        } else {
          setSuccessMsg("¡Misión cumplida! Revisa tu correo para verificar tu acceso.");
          setIsLogin(true);
          setPassword("");
        }
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === "Invalid login credentials") msg = "Credenciales incorrectas. Revisa tu correo y contraseña.";
      if (msg === "User already registered") msg = "Este operador ya está en la base. Inicia sesión.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      
      <div className="bg-[#0b0914] p-10 md:p-12 rounded-[2rem] w-full max-w-[440px] border border-slate-800/80 shadow-2xl shadow-indigo-900/10 relative z-10">
        
        {/* CABECERA PREMIUM */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <span className="text-white font-black text-3xl leading-none">B</span>
          </div>
          <h2 className="text-3xl font-black text-white text-center tracking-tight mb-2">
            {isLogin ? "Welcome to BúnkerApp" : "Join the Elite"}
          </h2>
          <p className="text-slate-400 text-[15px] font-medium text-center">
            We help traders become profitable!
          </p>
        </div>

        {/* ALERTAS */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-500 text-[20px]">warning</span>
            <p className="text-xs font-bold text-rose-400 leading-snug">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
            <p className="text-xs font-bold text-emerald-400 leading-snug">{successMsg}</p>
          </div>
        )}

        {/* BOTÓN GOOGLE MINIMALISTA */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold py-3.5 rounded-xl transition-all text-sm disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          {isLogin ? "Sign in with Google" : "Sign up with Google"}
        </button>

        {/* DIVISOR */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-800/80"></div>
          <span className="text-xs font-medium text-slate-500 lowercase">or</span>
          <div className="flex-1 h-px bg-slate-800/80"></div>
        </div>
        
        {/* FORMULARIO MANUAL */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-5">
          
          <div className="flex flex-col gap-1.5">
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-[#131022] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/50" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#131022] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/50" 
            />
          </div>

          {/* ACCIÓN PRINCIPAL Y FORGOT PASSWORD */}
          <div className="flex flex-col gap-4 mt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? <span className="animate-pulse">Loading...</span> : (isLogin ? "Sign in" : "Sign up")}
            </button>

            {isLogin && (
              <div className="text-center">
                <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </a>
              </div>
            )}
          </div>
        </form>

        {/* TOGGLE REGISTRO/LOGIN (Al estilo SaaS) */}
        <div className="mt-10 text-center border-t border-slate-800/80 pt-6">
          <p className="text-sm font-medium text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors ml-1"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

      </div>

      {/* EFECTOS DE FONDO SUTILES */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

    </div>
  );
}