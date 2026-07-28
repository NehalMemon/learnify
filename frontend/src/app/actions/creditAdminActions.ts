'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Server Action: approveCreditRequest
 * 
 * Performs 3 secure database operations:
 * 1. Updates credit_requests row to status = 'APPROVED', reviewed_at = now(), reviewed_by = adminId
 * 2. Increments the target student's credits balance (credits = current + creditAmount)
 * 3. Writes an audit log into system_logs with action = 'APPROVED_CREDITS'
 */
export async function approveCreditRequest({
  requestId,
  userId,
  creditAmount,
}: {
  requestId: string;
  userId: string;
  creditAmount: number;
}) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return { success: false, error: 'Unauthorized: Admin session required' };
    }

    // 1. Mark credit_requests as APPROVED
    const nowIso = new Date().toISOString();
    const { error: reqError } = await supabase
      .from('credit_requests')
      .update({
        status: 'APPROVED',
        reviewed_at: nowIso,
        reviewed_by: adminUser.id,
      })
      .eq('id', requestId);

    if (reqError) {
      console.error('approveCreditRequest update error:', reqError);
      return { success: false, error: reqError.message };
    }

    // 2. Fetch current student credits and increment balance
    const { data: student, error: fetchErr } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (fetchErr) {
      console.error('approveCreditRequest fetch student error:', fetchErr);
    }

    const currentCredits = student?.credits ?? 0;
    const newCredits = currentCredits + creditAmount;

    const { error: userError } = await supabase
      .from('users')
      .update({
        credits: newCredits,
        updated_at: nowIso,
      })
      .eq('id', userId);

    if (userError) {
      console.error('approveCreditRequest user credits update error:', userError);
      return { success: false, error: userError.message };
    }

    // 3. Write audit log into system_logs
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        action: 'APPROVED_CREDITS',
        message: `Admin ${adminUser.email} approved request ${requestId}: added ${creditAmount} credits to user ${userId} (New balance: ${newCredits})`,
        user_id: adminUser.id,
        metadata: {
          request_id: requestId,
          target_user_id: userId,
          credits_added: creditAmount,
          new_balance: newCredits,
        },
      });

    if (logError) {
      console.error('approveCreditRequest system_logs error:', logError);
    }

    return { success: true, newCredits };
  } catch (err: any) {
    console.error('approveCreditRequest exception:', err);
    return { success: false, error: err.message || 'Failed to approve credit request' };
  }
}

/**
 * Server Action: rejectCreditRequest
 * Marks request as 'REJECTED' without adding credits, logging to system_logs.
 */
export async function rejectCreditRequest({
  requestId,
  userId,
  reason,
}: {
  requestId: string;
  userId: string;
  reason?: string;
}) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return { success: false, error: 'Unauthorized: Admin session required' };
    }

    const nowIso = new Date().toISOString();
    const { error: reqError } = await supabase
      .from('credit_requests')
      .update({
        status: 'REJECTED',
        reviewed_at: nowIso,
        reviewed_by: adminUser.id,
      })
      .eq('id', requestId);

    if (reqError) {
      console.error('rejectCreditRequest update error:', reqError);
      return { success: false, error: reqError.message };
    }

    // Log rejection into system_logs
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        level: 'WARN',
        action: 'REJECTED_CREDITS',
        message: `Admin ${adminUser.email} rejected credit request ${requestId} for user ${userId}. Reason: ${reason || 'Invalid proof'}`,
        user_id: adminUser.id,
        metadata: {
          request_id: requestId,
          target_user_id: userId,
          rejection_reason: reason || 'Invalid proof',
        },
      });

    if (logError) {
      console.error('rejectCreditRequest system_logs error:', logError);
    }

    return { success: true };
  } catch (err: any) {
    console.error('rejectCreditRequest exception:', err);
    return { success: false, error: err.message || 'Failed to reject credit request' };
  }
}

/**
 * Server Action: getPendingCreditRequests
 * Fetches all rows from credit_requests joined with user info.
 */
export async function getPendingCreditRequests(statusFilter?: string) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable', data: [] };
    }

    let query = supabase
      .from('credit_requests')
      .select('*, users:user_id(id, full_name, email, credits)')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getPendingCreditRequests error:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getPendingCreditRequests exception:', err);
    return { success: false, error: err.message, data: [] };
  }
}
