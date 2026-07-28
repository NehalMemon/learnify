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
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
            }
            request.cookies.set(name, value)
            supabaseResponse = NextResponse.next({
              request,
            })
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // Helper to copy any refreshed cookies to redirect responses
  const createRedirectResponse = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Why: getUser() calls the Supabase Auth API to validate the JWT and automatically exchange expired access tokens using the refresh token.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — treat as unauthenticated.
    // Protected-route guards below will redirect to /login.
  }

  const pathname = request.nextUrl.pathname
  
  // Protect /admin, /student, /dashboard, /quiz, /my-courses, /workshops routes
  const isProtectedRoute = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/student') || 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/quiz') || 
    pathname.startsWith('/my-courses') || 
    pathname.startsWith('/workshops')

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return createRedirectResponse(url)
  }

  // Edge RBAC for admin routes
  if (pathname.startsWith('/admin') && user) {
    const role = user.app_metadata?.role || user.user_metadata?.role
    if (role !== 'ADMIN') {
      const url = new URL('/student/dashboard', request.url)
      return createRedirectResponse(url)
    }
  }

  // Instantly redirect authenticated users visiting root (/) or auth pages (/login, /signup, /register)
  const isPublicOrAuthPage = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname === '/register'

  if (isPublicOrAuthPage && user) {
    const role = user.app_metadata?.role || user.user_metadata?.role
    const targetPath = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard'
    const url = new URL(targetPath, request.url)
    return createRedirectResponse(url)
  }

  return supabaseResponse
}

