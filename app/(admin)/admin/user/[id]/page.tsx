import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js"; 
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export default async function UserProfileDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user, error } = await supabaseAdmin.rpc("get_user_details_for_admin", {
    target_user_id: id
  });

  if (error || !user) {
    return <div className="p-10 text-white">Usuario no encontrado o error de acceso.</div>;
  }

  const [
    { count: totalTrades },
    { count: activeBunkers }
  ] = await Promise.all([
    supabaseAdmin.from('trades').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabaseAdmin.from('mentors').select('id', { count: 'exact', head: true }).eq('user_id', id)
  ]);

  async function updateUserAdmin(formData: FormData) {
    "use server";
    const actionType = formData.get("actionType") as string;
    const newValue = formData.get("newValue") as string;
    
    const actionCookieStore = await cookies();
    const supabaseAction = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { 
        cookies: { 
          getAll: () => actionCookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try { cookiesToSet.forEach(({ name, value, options }) => actionCookieStore.set(name, value, options)); } catch (_) {}
          }
        } 
      }
    );

    await supabaseAction.rpc("admin_manage_user", { 
      target_user_id: id, 
      action_type: actionType,
      new_value: newValue
    });

    revalidatePath(`/admin/user/${id}`);
  }

  const displayName = user.email?.split('@')[0] || "Operador";
  const initial = displayName.charAt(0).toUpperCase();
  
  const getDaysLeft = (dateString: string) => {
    if (!dateString) return 0;
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const extraBunkersValue = user.extra_bunkers || 0;
  const currentPlan = user.plan?.toLowerCase() || 'free';
  const currentStatus = user.status?.toLowerCase() || 'pending';
  const isRoot = user.role?.toLowerCase() === 'root';
  
  // NUEVA LÓGICA DE FECHAS
  const targetDate = currentPlan === 'pro' ? user.subscription_expires_at : user.trial_ends_at;
  const daysLeft = getDaysLeft(targetDate);
  const isExpired = !isRoot && daysLeft <= 0;
  
  const maxBunkers = user.bunkers_allowed || (currentPlan === 'pro' ? 5 : 1);

  return (
    <div className="min-h-screen bg-[#0b0914] text-slate-300 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* NAVEGACIÓN Y CABECERA */}
        <div>
          <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-6 w-max transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver a Búnker Central
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[#131022]/80 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
            
            <div className="flex items-center gap-6 z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg border border-white/10 uppercase">
                {initial}
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-1">{displayName}</h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">{user.email}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="text-slate-500 font-mono text-xs">ID: {user.id.split('-')[0]}...</span>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                    currentStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    currentStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${currentStatus === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span> 
                    {currentStatus}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    currentPlan === 'pro' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700'
                  }`}>
                    PLAN {currentPlan}
                  </span>
                  {extraBunkersValue > 0 && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      +{extraBunkersValue} BÚNKERS
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 z-10 w-full md:w-auto">
              <Link href={`/admin/user/${id}/bunker`} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all border border-indigo-500 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer">
                <span className="material-symbols-outlined text-sm">query_stats</span>
                Ver Búnker del Cliente
              </Link>
            </div>
          </div>
        </div>

        {/* GRID DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#131022]/50 border border-slate-800/50 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">badge</span> Retención
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Fecha de Registro</p>
                  <p className="text-sm font-semibold text-white">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Días Restantes de Licencia</p>
                  {isRoot ? (
                     <p className="text-2xl font-black text-purple-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[20px]">all_inclusive</span> Inmortal
                     </p>
                  ) : (
                     <p className={`text-2xl font-black ${isExpired ? 'text-red-400' : 'text-indigo-400'}`}>
                        {isExpired ? 'Caducado' : `${daysLeft} días`}
                     </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#131022]/50 border border-slate-800/50 p-6 rounded-2xl">
            <h3 className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">data_usage</span> Consumo del Sistema
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0b0914] p-4 rounded-xl border border-slate-800/80 transition hover:border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Trades Registrados</p>
                <p className="text-xl font-black text-indigo-400">{totalTrades || 0}</p>
              </div>
              <div className="bg-[#0b0914] p-4 rounded-xl border border-slate-800/80 transition hover:border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mentores</p>
                <p className="text-xl font-black text-slate-300">{activeBunkers || 0}</p>
              </div>
              <div className="bg-[#0b0914] p-4 rounded-xl border border-slate-800/80 transition hover:border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Búnkers Activos</p>
                <p className="text-xl font-black text-white">{activeBunkers || 0}</p>
              </div>
              <div className="bg-[#0b0914] p-4 rounded-xl border border-slate-800/80 transition hover:border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Límite Permitido</p>
                <p className="text-xl font-black text-slate-500">{maxBunkers}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#131022]/50 border border-slate-800/50 p-6 rounded-2xl">
            <h3 className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">currency_bitcoin</span> Finanzas (Crypto)
            </h3>
            <div className="space-y-4">
              <div className="bg-[#0b0914] p-4 rounded-xl border border-emerald-500/20 relative overflow-hidden opacity-50">
                <p className="text-[10px] text-emerald-500/70 uppercase font-bold mb-1">Life Time Value (LTV)</p>
                <p className="text-3xl font-black text-emerald-400">$0.00 USDT</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Estado de Facturación</p>
                <p className="text-sm font-semibold text-slate-300">Esperando conexión de pasarela</p>
              </div>
            </div>
          </div>

        </div>

        {/* CONTROLES AVANZADOS */}
        {user.role !== 'root' && (
          <div className="bg-[#131022]/30 border border-slate-800/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">tune</span> Controles de Suscripción
              </h3>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[#0b0914] border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-blue-500/50 transition">
                <div className="mb-3">
                  <p className="text-sm font-bold text-white">Extender Tiempo</p>
                  <p className="text-[10px] text-slate-500">Sumar días a la licencia.</p>
                </div>
                <form action={updateUserAdmin} className="flex border border-blue-500/30 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                  <input type="hidden" name="actionType" value="add_days" />
                  <input type="number" name="newValue" defaultValue="30" className="w-full bg-transparent text-center text-sm text-white outline-none pl-2" />
                  <button type="submit" className="bg-blue-600/20 text-blue-400 px-3 py-2 text-[10px] font-bold hover:bg-blue-600/40 transition cursor-pointer">APLICAR</button>
                </form>
              </div>

              <div className="bg-[#0b0914] border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 transition">
                <div className="mb-3">
                  <p className="text-sm font-bold text-white">Cambiar de Plan</p>
                  <p className="text-[10px] text-slate-500">Actualizar o degradar.</p>
                </div>
                <form action={updateUserAdmin} className="w-full">
                  <input type="hidden" name="actionType" value="plan" />
                  <input type="hidden" name="newValue" value={currentPlan === 'free' ? 'pro' : 'free'} />
                  <button type="submit" className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition uppercase cursor-pointer">
                    {currentPlan === 'free' ? 'Hacer PRO' : 'Degradar a Free'}
                  </button>
                </form>
              </div>

              <div className="bg-[#0b0914] border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-purple-500/50 transition">
                <div className="mb-3">
                  <p className="text-sm font-bold text-white">Cupos Búnker</p>
                  <p className="text-[10px] text-slate-500">Regalar o limitar extras.</p>
                </div>
                <form action={updateUserAdmin} className="flex border border-purple-500/30 rounded-lg overflow-hidden focus-within:border-purple-500 transition-colors">
                  <input type="hidden" name="actionType" value="extra_bunkers" />
                  <input type="number" name="newValue" defaultValue={extraBunkersValue} className="w-full bg-transparent text-center text-sm text-white outline-none pl-2" />
                  <button type="submit" className="bg-purple-600/20 text-purple-400 px-3 py-2 text-[10px] font-bold hover:bg-purple-600/40 transition cursor-pointer">ASIGNAR</button>
                </form>
              </div>

              <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl flex flex-col justify-between">
                <div className="mb-3">
                  <p className="text-sm font-bold text-red-400">Acceso</p>
                  <p className="text-[10px] text-red-400/60">Bloquear o activar cuenta.</p>
                </div>
                <form action={updateUserAdmin} className="w-full">
                  <input type="hidden" name="actionType" value="status" />
                  <input type="hidden" name="newValue" value={currentStatus === 'active' ? 'suspended' : 'active'} />
                  <button type="submit" className={`w-full border py-2 rounded-lg text-xs font-bold transition uppercase cursor-pointer ${
                    currentStatus === 'active' 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}>
                    {currentStatus === 'active' ? 'Banear Cuenta' : 'Activar Cuenta'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}