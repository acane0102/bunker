import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Verificación rápida de Auth (Sin tocar la base de datos)
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Definimos las zonas
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')
  const isPublicPage = request.nextUrl.pathname === '/'

  // ESCENARIO A: Sin sesión intentando entrar al Búnker (Redirige a Login)
  if (!user && !isAuthPage && !isAuthCallback && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ESCENARIO B: Con sesión intentando ir al Login o Landing (Redirige al Panel)
  if (user && (isAuthPage || isPublicPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/panel'
    return NextResponse.redirect(url)
  }

  // NOTA: Las validaciones de "pending", "banned" y "admin" se eliminaron de aquí 
  // para evitar el Error 504 de Timeout en Vercel. 
  // Debes implementar esas validaciones directamente en tu app/(dashboard)/layout.tsx

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
