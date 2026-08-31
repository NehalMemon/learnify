import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      console.log('=== AUTH DEBUG ===');
      console.log('App Metadata Role:', data.user.app_metadata?.role);
      console.log('User Metadata Role:', data.user.user_metadata?.role);
      console.log('==================');

      const role = data.user.app_metadata?.role || data.user.user_metadata?.role;

      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL(next, request.url))
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
}
