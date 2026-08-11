'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { UserRole, UserStatus } from '@/types';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const VALID_ROLES: UserRole[] = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];
const VALID_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'PENDING'];

/**
 * Server Action: updateUserStatus
 * Updates the user's status in public.users and logs the action in system_logs.
 */
export async function updateUserStatus(userId: string, newStatus: UserStatus) {
  try {
    const cleanUserId = typeof userId === 'string' ? userId.trim() : '';
    if (!cleanUserId || !UUID_REGEX.test(cleanUserId)) {
      return { success: false, error: `Invalid user ID format: "${userId}". A valid UUID is required.` };
    }

    const formattedStatus = (typeof newStatus === 'string' ? newStatus.trim().toUpperCase() : '') as UserStatus;
    if (!VALID_STATUSES.includes(formattedStatus)) {
      return { success: false, error: `Invalid status "${newStatus}". Allowed values: ACTIVE, INACTIVE, PENDING.` };
    }

    // Prefer service role client to avoid RLS type coercion or policy issues
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = serviceRoleKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : await createClient();

    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    // 1. Get logged-in admin details for audit logging
    let adminEmail = 'System';
    let adminId: string | null = null;
    try {
      const sessionClient = await createClient();
      const { data: { user: adminUser } } = await sessionClient.auth.getUser();
      if (adminUser) {
        adminEmail = adminUser.email || 'System';
        adminId = adminUser.id;
      }
    } catch {
      // Fallback if session fetch fails
    }

    // 2. Update user status in Supabase users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ status: formattedStatus, updated_at: new Date().toISOString() })
      .eq('id', cleanUserId);

    if (updateError) {
      console.error('updateUserStatus DB error:', updateError);
      return { success: false, error: updateError.message };
    }

    // 3. Write audit log to system_logs table
    const action = formattedStatus === 'INACTIVE' ? 'DEACTIVATED_USER' : 'ACTIVATED_USER';
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        action,
        message: `Admin ${adminEmail} changed user ${cleanUserId} status to ${formattedStatus}`,
        user_id: adminId,
        metadata: { target_user_id: cleanUserId, new_status: formattedStatus },
      });

    if (logError) {
      console.error('system_logs insert error:', logError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateUserStatus exception:', error);
    return { success: false, error: error?.message || 'Failed to update user status' };
  }
}

/**
 * Server Action: updateUserRole
 * Updates the user's role in public.users and logs the action in system_logs.
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  try {
    // 1. Strict type checking to prevent object proxies or swapped argument issues
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: `Invalid userId parameter type (${typeof userId}). Expected a valid UUID string.`,
      };
    }

    const cleanUserId = String(userId).trim();
    if (!cleanUserId || !UUID_REGEX.test(cleanUserId)) {
      return {
        success: false,
        error: `Invalid user ID format: "${cleanUserId}". A valid UUID string is required.`,
      };
    }

    if (!newRole || typeof newRole !== 'string') {
      return {
        success: false,
        error: `Invalid newRole parameter type (${typeof newRole}). Expected a string role (ADMIN, INSTRUCTOR, STUDENT).`,
      };
    }

    const formattedRole = String(newRole).trim().toUpperCase() as UserRole;
    if (!VALID_ROLES.includes(formattedRole)) {
      return {
        success: false,
        error: `Invalid role "${newRole}". Allowed values: ADMIN, INSTRUCTOR, STUDENT.`,
      };
    }

    // Prefer service role client to avoid RLS type coercion or policy issues
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = serviceRoleKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : await createClient();

    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    // 2. Get logged-in admin details for audit logging
    let adminEmail = 'System';
    let adminId: string | null = null;
    try {
      const sessionClient = await createClient();
      const { data: { user: adminUser } } = await sessionClient.auth.getUser();
      if (adminUser) {
        adminEmail = adminUser.email || 'System';
        adminId = adminUser.id;
      }
    } catch {
      // Fallback if session fetch fails
    }

    // 3. Update user role in Supabase users table with explicit string casting
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: String(formattedRole), updated_at: new Date().toISOString() })
      .eq('id', String(cleanUserId));

    if (updateError) {
      console.error('updateUserRole DB error:', updateError);
      return { success: false, error: updateError.message };
    }

    // 4. Write audit log to system_logs table
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        action: 'UPDATED_USER_ROLE',
        message: `Admin ${adminEmail} changed user ${cleanUserId} role to ${formattedRole}`,
        user_id: adminId,
        metadata: { target_user_id: cleanUserId, new_role: formattedRole },
      });

    if (logError) {
      console.error('system_logs insert error:', logError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateUserRole exception:', error);
    return { success: false, error: error?.message || 'Failed to update user role' };
  }
}

