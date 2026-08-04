import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente de solo lectura para el servidor
const getSupabase = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {} 
      }
    }
  );
};

export async function getUserProfile() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function getTransactions() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id);
  return data || [];
}

export async function getTrades() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from('trades').select('*').eq('user_id', user.id);
  return data || [];
}