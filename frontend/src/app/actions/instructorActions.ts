'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface InstructorActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GoogleConnectionStatus {
  isConnected: boolean;
  email: string | null;
  role: string | null;
}

/**
 * Disconnects the teacher's connected Google Account by removing
 * their stored `google_refresh_token` from `public.users`.
 */
export async function disconnectGoogleAccount(): Promise<InstructorActionResult> {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceRoleKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : sessionClient;

    const { error: updateError } = await dbClient
      .from('users')
      .update({
        google_refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[instructorActions] Error disconnecting Google account:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/instructor/settings');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect account';
    console.error('[instructorActions] disconnectGoogleAccount exception:', err);
    return { success: false, error: message };
  }
}

/**
 * Checks the Google Calendar connection status for the current instructor.
 */
export async function getInstructorGoogleStatus(): Promise<InstructorActionResult<GoogleConnectionStatus>> {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const { data: profile, error: profileError } = await sessionClient
      .from('users')
      .select('email, role, google_refresh_token')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: profileError?.message || 'Profile not found' };
    }

    return {
      success: true,
      data: {
        isConnected: Boolean(profile.google_refresh_token),
        email: profile.email,
        role: profile.role,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch status';
    return { success: false, error: message };
  }
}
