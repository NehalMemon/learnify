'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

import { revalidatePath } from 'next/cache'

export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { error: error?.message || 'Login failed' }
  }

  // Why: We return the path instead of calling redirect() because this action
  // is invoked programmatically via `await` in LoginForm's onSubmit. Next.js
  // redirect() throws a NEXT_REDIRECT error that propagates as an unhandled
  // exception when called outside a <form action={...}> binding, preventing
  // the navigation from completing on the client.
  revalidatePath('/', 'layout')

  const redirectTo = data.user.app_metadata?.role === 'ADMIN'
    ? '/admin/dashboard'
    : '/dashboard'

  return { redirectTo }
}

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
        phone: phone || null,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Check your email to continue.' }
}

export async function logout() {
  // 1. Wrap the API call so a timeout or network failure doesn't crash the action
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Why: If Supabase is unreachable we still want to nuke the client session
    // and redirect. The middleware will enforce the logged-out state on the next
    // request because the auth cookies are already expired by signOut or stale.
  }

  // 2. Clear cache and redirect MUST be outside try/catch to work
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPasswordRequest(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email is required' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  if (!password) return { error: 'Password is required' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }
  redirect('/login?message=password_updated')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }
  
  if (data.url) {
    redirect(data.url)
  }
}
