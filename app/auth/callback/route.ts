import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    // Añadimos await porque en las nuevas versiones de Next.js es obligatorio
    const cookieStore = await cookies(); 
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // El "as any" obliga a TypeScript a ignorar la alerta naranja
                cookieStore.set(name, value, options as any); 
              });
            } catch (error) {
              // Manejo de error silencioso
            }
          },
        },
      }
    );
    
    // Intercambia el código seguro
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Te redirige al Dashboard principal
  return NextResponse.redirect(`${origin}/`);
}