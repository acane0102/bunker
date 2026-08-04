import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Creamos una respuesta base inmutable
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

  const { data: { user } } = await supabase.auth.getUser()

  // 2. Definimos las zonas (Rutas)
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')
  const isPendingPage = request.nextUrl.pathname.startsWith('/pending')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isPublicPage = request.nextUrl.pathname === '/' // Zona libre para la Landing Page

  // Función auxiliar para hacer redirecciones manteniendo las cookies firmes
  const redirect = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // ESCENARIO A: Sin sesión intentando entrar al Búnker (Excluimos la Landing)
  if (!user && !isAuthPage && !isAuthCallback && !isPublicPage) {
    return redirect('/login')
  }

  // 3. SI HAY USUARIO: Levantamos las defensas del SaaS leyendo la base de datos
  if (user) {
    // Consulta flash a través del túnel seguro de la base de datos
    const { data: profile } = await supabase.rpc('get_user_role_status', { user_id: user.id })  

    const status = profile?.status || 'pending'
    const role = profile?.role || 'free'

    // ESCENARIO B: Con sesión intentando ir a Login o a la Landing Page
    if (isAuthPage || isPublicPage) {
      return redirect(status === 'pending' ? '/pending' : '/panel')
    }

    // ESCENARIO C: Muro de Baneo (Soft Delete)
    if (status === 'banned' && !isAuthPage && !isAuthCallback) {
      // Lo pateamos al login (donde al intentar entrar verá que no puede o cerramos su sesión)
      return redirect('/login') 
    }

    // ESCENARIO D: Escudo Waitlist (Anti-Bots)
    // Si está pendiente y navega por el búnker, lo forzamos a /pending
    if (status === 'pending' && !isPendingPage && !isAuthCallback) {
      return redirect('/pending')
    }

    // ESCENARIO E: Usuario Aprobado curioseando
    // Si ya está activo e intenta ir a la página de pending, lo devolvemos al Dashboard (/panel)
    if (status === 'active' && isPendingPage) {
      return redirect('/panel')
    }

    // ESCENARIO F: El Muro del Administrador (RBAC)
    if (isAdminPage && role !== 'admin' && role !== 'root') {
      return redirect('/panel')
    }
  }

  // ESCENARIO G: Flujo normal permitido
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}