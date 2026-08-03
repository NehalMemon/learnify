'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FetchNotificationsResult {
  success: boolean;
  data: NotificationRow[];
  resolvedUserId?: string;
  error?: string;
}

/**
 * Gets a Supabase client for notification operations.
 * Prefers SUPABASE_SERVICE_ROLE_KEY to bypass RLS when custom auth is used.
 */
async function getNotificationSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    return createSupabaseClient(url, serviceKey);
  }
  return await createClient();
}

/**
 * Server Action: fetchNotificationsAction
 * Fetches initial notifications for a given user ID, bypassing RLS via service role.
 * If userId is not provided, automatically attempts to resolve it from the Supabase session cookies.
 */
export async function fetchNotificationsAction(userId?: string): Promise<FetchNotificationsResult> {
  try {
    let effectiveUserId = userId;

    if (!effectiveUserId) {
      const serverSupabase = await createClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (user?.id) {
        effectiveUserId = user.id;
      }
    }

    if (!effectiveUserId) {
      return { success: false, data: [], error: 'User ID is required' };
    }

    const supabase = await getNotificationSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: (data as NotificationRow[]) || [], resolvedUserId: effectiveUserId };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
    return { success: false, data: [], error: errorMessage };
  }
}

/**
 * Server Action: markNotificationReadAction
 * Marks a single notification as read in the database.
 */
export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean; error?: string }> {
  if (!notificationId) {
    return { success: false, error: 'Notification ID is required' };
  }

  try {
    const supabase = await getNotificationSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action: markAllNotificationsReadAction
 * Marks all unread notifications for a user as read in the database.
 */
export async function markAllNotificationsReadAction(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const supabase = await getNotificationSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
    return { success: false, error: errorMessage };
  }
}
