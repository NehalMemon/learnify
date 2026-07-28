import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(rememberMe = true) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = { ...options }

              // If rememberMe is false, strip maxAge and expires to make it a browser session cookie
              if (!rememberMe) {
                delete cookieOptions.maxAge
                delete cookieOptions.expires
              }

              cookieOptions.httpOnly = true
              cookieOptions.secure = process.env.NODE_ENV === 'production'

              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

