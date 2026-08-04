import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js"; 
import { cookies } from "next/headers";
import Link from "next/link";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string; filter?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const query = params?.query || "";
  const filter = params?.filter || "all";
  const currentPage = Number(params?.page) || 1;
  const currentTab = params?.tab || "operators"; // 'operators' | 'finances'
  const pageSize = 10; 

  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. CARGA DE KPIs GLOBALES (Siempre visibles)
  const [
    { count: totalUsers },
    { count: proUsers },
    { count: activeUsers },
    { count: totalBunkers }
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).ilike('plan', 'pro'), 
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('mentors').select('id', { count: 'exact', head: true })
  ]);

  const activePercentage = totalUsers ? Math.round(((activeUsers || 0) / totalUsers) * 100) : 0;

  // 2. VARIABLES DE DATOS
  let users: any[] = [];
  let totalItems = 0;
  let totalPages = 0;
  
  let globalPayments: any[] = [];
  let totalRevenue = 0;

  const getDaysLeft = (dateString: string) => {
    if (!dateString) return 0;
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  // 3. CARGA CONDICIONAL SEGÚN LA PESTAÑA
  if (currentTab === "operators") {
    const { data: rawUsers } = await supabase.rpc("get_admin_users_paged", {
      search_term: query,
      page_number: currentPage,
      page_size: pageSize
    });

    users = rawUsers?.filter((u: any) => {
      if (filter === 'all') return true;
      if (filter === 'pro') return u.plan?.toLowerCase() === 'pro';
      if (filter === 'free') return u.plan?.toLowerCase() !== 'pro' && u.role?.toLowerCase() !== 'root';
      if (filter === 'root') return u.role?.toLowerCase() === 'root';
      if (filter === 'expired') return getDaysLeft(u.trial_ends_at) <= 0;
      return true;
    }) || [];

    totalItems = filter === 'all' ? (rawUsers?.[0]?.total_items || 0) : users.length;
    totalPages = Math.ceil(totalItems / pageSize);
  } else if (currentTab === "finances") {
    const { data: paymentsData } = await supabaseAdmin
      .from('payments')
      .select('*, profiles ( full_name, email )')
      .order('created_at', { ascending: false });
      
    if (paymentsData) {
      globalPayments = paymentsData;
      totalRevenue = paymentsData.reduce((acc, curr) => acc + Number(curr.amount), 0);
    }
  }

  return (
    <div className="min-h-screen bg-[#090714] text-slate-300 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER & BUSCADOR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight inline-block pb-1">
                Búnker Central
              </h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">Panel de Mando Escalonado</p>
          </div>

          <form method="GET" action="/admin" className="relative w-full md:w-96 flex shadow-lg">
            <input type="hidden" name="filter" value={filter} />
            <input type="hidden" name="tab" value={currentTab} />
            <input 
              type="text" 
              name="query" 
              defaultValue={query}
              placeholder="Buscar operador por email..." 
              className="w-full bg-[#131022] border border-slate-700/50 rounded-l-xl py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-[#1a162d] transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-r-xl font-bold text-sm transition-colors border-y border-r border-indigo-600 hover:border-indigo-500">
              Buscar
            </button>
            {query && (
              <Link href={`/admin?tab=${currentTab}&filter=${filter}`} className="absolute right-[90px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center justify-center bg-slate-800 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </Link>
            )}
          </form>
        </div>

        {/* TARJETAS DE KPIs GLOBALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <div className="bg-[#131022] border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-colors">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-[0.02] rounded-full blur-2xl group-hover:opacity-[0.05] transition-opacity"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operadores Totales</h3>
                <div className={`mt-1 text-3xl font-black ${!totalUsers ? 'text-slate-700' : 'text-slate-100'}`}>{totalUsers || 0}</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-indigo-500/10 border-indigo-500/20">
                <span className="material-symbols-outlined text-indigo-400 text-[20px]">group</span>
              </div>
            </div>
          </div>

          <div className="bg-[#131022] border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-colors">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-[0.02] rounded-full blur-2xl group-hover:opacity-[0.05] transition-opacity"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Licencias PRO</h3>
                <div className={`mt-1 text-3xl font-black ${!proUsers ? 'text-slate-700' : 'text-slate-100'}`}>{proUsers || 0}</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-amber-500/10 border-amber-500/20">
                <span className="material-symbols-outlined text-amber-400 text-[20px]">workspace_premium</span>
              </div>
            </div>
          </div>

          <div className="bg-[#131022] border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-colors">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-[0.02] rounded-full blur-2xl group-hover:opacity-[0.05] transition-opacity"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Búnkers Desplegados</h3>
                <div className={`mt-1 text-3xl font-black ${!totalBunkers ? 'text-slate-700' : 'text-slate-100'}`}>{totalBunkers || 0}</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-emerald-500/10 border-emerald-500/20">
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">security</span>
              </div>
            </div>
          </div>

          <div className="bg-[#131022] border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-colors">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-[0.02] rounded-full blur-2xl group-hover:opacity-[0.05] transition-opacity"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Salud de Red</h3>
                <div className={`mt-1 text-3xl font-black ${!activePercentage ? 'text-slate-700' : 'text-slate-100'}`}>{activePercentage}%</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-rose-500/10 border-rose-500/20">
                <span className="material-symbols-outlined text-rose-400 text-[20px]">monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN PRINCIPAL (OPERADORES VS FINANZAS) */}
        <div className="flex gap-4">
          <Link 
            href={`/admin?tab=operators${query ? `&query=${query}` : ''}`}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentTab === 'operators' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-[#131022] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            Gestión de Operadores
          </Link>
          <Link 
            href="/admin?tab=finances"
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentTab === 'finances' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-[#131022] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            Finanzas e Ingresos
          </Link>
        </div>

        {/* =========================================
            VISTA: GESTIÓN DE OPERADORES 
        ========================================= */}
        {currentTab === 'operators' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* TABS DE SEGMENTACIÓN */}
            <div className="flex items-center gap-6 border-b border-slate-800/80 px-2 overflow-x-auto no-scrollbar">
              <Link href={`/admin?tab=operators&filter=all${query ? `&query=${query}` : ''}`} className={`pb-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${filter === 'all' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Todos</Link>
              <Link href={`/admin?tab=operators&filter=pro${query ? `&query=${query}` : ''}`} className={`pb-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${filter === 'pro' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Licencias PRO</Link>
              <Link href={`/admin?tab=operators&filter=free${query ? `&query=${query}` : ''}`} className={`pb-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${filter === 'free' ? 'border-slate-400 text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Cuentas FREE</Link>
              <Link href={`/admin?tab=operators&filter=root${query ? `&query=${query}` : ''}`} className={`pb-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${filter === 'root' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Roots</Link>
              <Link href={`/admin?tab=operators&filter=expired${query ? `&query=${query}` : ''}`} className={`pb-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${filter === 'expired' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Caducadas</Link>
            </div>

            <div className="bg-[#131022] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#0b0914] text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-800/80">
                    <tr>
                      <th className="px-6 py-5 font-bold">Operador</th>
                      <th className="px-6 py-5 font-bold">Estado</th>
                      <th className="px-6 py-5 font-bold">Uso Búnkers</th>
                      <th className="px-6 py-5 font-bold">Licencia</th>
                      <th className="px-6 py-5 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500 font-bold">
                          Sin resultados.
                        </td>
                      </tr>
                    ) : (
                      users?.map((u: any) => {
                        const daysLeft = getDaysLeft(u.trial_ends_at);
                        const isExpired = daysLeft <= 0;
                        const initial = u.email ? u.email.charAt(0).toUpperCase() : '?';
                        const isRoot = u.role?.toLowerCase() === 'root';
                        const isPro = u.plan?.toLowerCase() === 'pro';
                        const maxBunkers = u.bunkers_allowed || (isPro ? 5 : 1);
                        const usagePercent = Math.min(((u.bunker_count || 0) / maxBunkers) * 100, 100);

                        return (
                          <tr key={u.id} className="hover:bg-[#1a162d] transition-all duration-200">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${isRoot ? 'bg-purple-600' : isPro ? 'bg-amber-500' : 'bg-slate-700'}`}>{initial}</div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-200">{u.email}</span>
                                  <span className={`text-[9px] font-black uppercase mt-1 w-max px-2 py-0.5 rounded border ${isRoot ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : isPro ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700/50'}`}>
                                    {isRoot ? 'ROOT' : isPro ? 'PRO' : 'FREE'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border ${u.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                <span className="text-[10px] font-bold uppercase">{u.status === 'active' ? 'Activo' : 'Suspendido'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5 w-32">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                  <span>{u.bunker_count || 0} activos</span>
                                  <span>Límite {maxBunkers}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${usagePercent >= 100 ? 'bg-rose-500' : usagePercent >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${usagePercent}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {isRoot ? <span className="text-slate-500 text-xs font-bold italic">Inmortal</span> : (
                                <div className="flex flex-col">
                                  <span className={`text-xs font-black ${isExpired ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {isExpired ? 'Caducado' : `${daysLeft} días`}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link href={`/admin/user/${u.id}`} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[10px] font-bold bg-[#0b0914] text-slate-400 border border-slate-700 hover:border-indigo-500 hover:text-indigo-300 transition-all uppercase">
                                Expediente
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-[#131022] border border-slate-700/50 px-6 py-4 rounded-xl shadow-lg">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <Link href={`/admin?tab=operators&page=${currentPage > 1 ? currentPage - 1 : 1}${query ? `&query=${query}` : ''}&filter=${filter}`} className="px-5 py-2.5 text-xs font-bold rounded-lg border border-slate-700 hover:border-indigo-500 text-white">Anterior</Link>
                  <Link href={`/admin?tab=operators&page=${currentPage < totalPages ? currentPage + 1 : totalPages}${query ? `&query=${query}` : ''}&filter=${filter}`} className="px-5 py-2.5 text-xs font-bold rounded-lg border border-slate-700 hover:border-indigo-500 text-white">Siguiente</Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            VISTA: FINANZAS E INGRESOS 
        ========================================= */}
        {currentTab === 'finances' && (
          <div className="bg-[#131022] border border-slate-700/50 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">payments</span>
                  Caja Registradora Global
                </h3>
                <p className="text-xs text-slate-400 mt-1">Historial de todas las transacciones procesadas vía NowPayments.</p>
              </div>
              <div className="text-right bg-[#0b0914] px-6 py-3 rounded-2xl border border-slate-800">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Total Recaudado</div>
                <div className="text-3xl font-black text-emerald-400">${totalRevenue.toFixed(2)}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0b0914]">
                  <tr className="border-b border-slate-800/80 text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4 font-bold">Operador / Email</th>
                    <th className="px-6 py-4 font-bold">Fecha</th>
                    <th className="px-6 py-4 font-bold">Monto</th>
                    <th className="px-6 py-4 font-bold">Moneda</th>
                    <th className="px-6 py-4 font-bold">Estado</th>
                    <th className="px-6 py-4 font-bold">ID Factura</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-800/50">
                  {globalPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 font-bold">No hay pagos registrados aún.</td>
                    </tr>
                  ) : (
                    globalPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#1a162d] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-200">{p.profiles?.full_name || 'Sin nombre'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{p.profiles?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-medium">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-emerald-400 text-sm">${Number(p.amount).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-bold uppercase">
                          {p.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            p.status === 'finished' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                          {p.nowpayments_invoice_id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}