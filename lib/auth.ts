"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js"; 
import { cookies } from "next/headers";

// 1. Función para saber qué ID usar (Sabe si eres Root o Cliente)
export async function getActiveUserId() {
  const cookieStore = await cookies();
  
  const impersonatedId = cookieStore.get("impersonated_user_id")?.value;
  if (impersonatedId) {
    return { id: impersonatedId, isImpersonating: true };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  return { id: user?.id, isImpersonating: false };
}

// 2. Extractor de datos saltando el RLS (El que inyectamos en page.tsx)
export async function getDashboardData() {
  const { id: targetUserId } = await getActiveUserId();

  if (!targetUserId) {
    return { trades: [], transactions: [], profile: null };
  }

  // Usamos la Llave Maestra (Service Role) para que Supabase nos obedezca ciegamente
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Traemos TODO de una sola vez
  const [
    { data: trades },
    { data: transactions },
    { data: profile }
  ] = await Promise.all([
    supabaseAdmin.from('trades').select('*').eq('user_id', targetUserId).order('created_at', { ascending: true }),
    supabaseAdmin.from('transactions').select('*').eq('user_id', targetUserId),
    supabaseAdmin.from('profiles').select('*').eq('id', targetUserId).single()
  ]);

  return {
    trades: trades || [],
    transactions: transactions || [],
    profile: profile || null
  };
}
export async function getAdminUserDashboardData(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [
    { data: trades },
    { data: transactions }
  ] = await Promise.all([
    supabaseAdmin.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabaseAdmin.from('transactions').select('*').eq('user_id', userId)
  ]);

  return {
    trades: trades || [],
    transactions: transactions || []
  };
}