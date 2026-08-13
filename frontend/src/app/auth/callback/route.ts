import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // Traffic Cop Routing Logic: Safely extract role from app_metadata or user_metadata
      const role = data.user.app_metadata?.role || data.user.user_metadata?.role

      let redirectPath = '/student'
      if (role === 'ADMIN') {
        redirectPath = '/admin'
      } else if (role === 'INSTRUCTOR') {
        redirectPath = '/instructor'
      }

      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
}
