'use server';

import { createClient } from '@/utils/supabase/server';
import { UserRole, UserStatus } from '@/types';

/**
 * Server Action: updateUserStatus
 * Updates the user's status in public.users and logs the action in system_logs.
 */
export async function updateUserStatus(userId: string, newStatus: UserStatus) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    // 1. Get logged-in admin details for audit logging
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    // 2. Update user status in Supabase users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('updateUserStatus DB error:', updateError);
      return { success: false, error: updateError.message };
    }

    // 3. Write audit log to system_logs table
    const action = newStatus === 'INACTIVE' ? 'DEACTIVATED_USER' : 'ACTIVATED_USER';
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        action,
        message: `Admin ${adminUser?.email || 'System'} changed user ${userId} status to ${newStatus}`,
        user_id: adminUser?.id || null,
        metadata: { target_user_id: userId, new_status: newStatus },
      });

    if (logError) {
      console.error('system_logs insert error:', logError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateUserStatus exception:', error);
    return { success: false, error: error.message || 'Failed to update user status' };
  }
}

/**
 * Server Action: updateUserRole
 * Updates the user's role in public.users and logs the action in system_logs.
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    // 1. Get logged-in admin details for audit logging
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    // 2. Update user role in Supabase users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('updateUserRole DB error:', updateError);
      return { success: false, error: updateError.message };
    }

    // 3. Write audit log to system_logs table
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        action: 'UPDATED_USER_ROLE',
        message: `Admin ${adminUser?.email || 'System'} changed user ${userId} role to ${newRole}`,
        user_id: adminUser?.id || null,
        metadata: { target_user_id: userId, new_role: newRole },
      });

    if (logError) {
      console.error('system_logs insert error:', logError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateUserRole exception:', error);
    return { success: false, error: error.message || 'Failed to update user role' };
  }
}

