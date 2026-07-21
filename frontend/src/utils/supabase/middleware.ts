import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Why: getUser() calls the Supabase Auth API to validate the JWT.
  // If Supabase is unreachable (ECONNRESET, DNS failure, timeout), the
  // unhandled rejection crashes the middleware, killing every request —
  // including server action POSTs — before they reach route handlers.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — treat as unauthenticated.
    // Protected-route guards below will redirect to /login.
  }

  const pathname = request.nextUrl.pathname
  
  // Protect /dashboard, /admin, and private quiz routes
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/quiz')

  if (isProtectedRoute && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Edge RBAC for admin routes
  if (pathname.startsWith('/admin')) {
    if (user?.app_metadata?.role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard' // bounce back to standard dashboard
      return NextResponse.redirect(url)
    }
  }

  const isPublicPath = pathname === '/login' || pathname === '/register'
  if (isPublicPath && user) {
    const url = request.nextUrl.clone()
    if (user.app_metadata?.role === 'ADMIN') {
      url.pathname = '/admin/dashboard'
    } else {
      url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
