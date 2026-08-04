import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Usamos el cliente SSR para el navegador, así lee la misma Cookie que el Middleware
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)