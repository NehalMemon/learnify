'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendNotification } from '@/lib/notifications';

/**
 * Extracts folder and file path from public Supabase Storage URL
 * e.g., "https://[project].supabase.co/storage/v1/object/public/payment-proof/[user_id]/[filename].png"
 * => "[user_id]/[filename].png"
 */
function extractStorageFilePath(url?: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    // Splits the URL and grabs everything after '/payment-proof/'
    const rawPath = urlObj.pathname.split('/payment-proof/')[1];
    if (!rawPath) return null; // Safely exit if path parsing fails
    return decodeURIComponent(rawPath);
  } catch (err) {
    console.error('extractStorageFilePath error:', err);
    return null;
  }
}

/**
 * Deletes payment proof image from Supabase Storage using Admin client to bypass RLS
 */
async function deleteStorageImage(proofImageUrl?: string | null) {
  if (!proofImageUrl) return;
  try {
    const filePath = extractStorageFilePath(proofImageUrl);
    if (!filePath) return;

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: deleteError } = await supabaseAdmin.storage.from('payment-proof').remove([filePath]);
    if (deleteError) {
      console.error('deleteStorageImage storage removal error:', deleteError);
    }
  } catch (err) {
    console.error('deleteStorageImage storage removal exception (non-fatal):', err);
  }
}

function revalidateAllCreditPaths() {
  try {
    revalidatePath('/admin/requests');
    revalidatePath('/admin/payments');
    revalidatePath('/student/credits');
    revalidatePath('/student/dashboard');
    revalidatePath('/dashboard/credits');
    revalidatePath('/dashboard');
  } catch (cacheErr) {
    console.error('revalidateAllCreditPaths error (non-fatal):', cacheErr);
  }
}

/**
 * Server Action: approveCreditRequest
 * 
 * Performs secure operations:
 * 1. Updates credit_requests row to status = 'APPROVED', resolved_at = now(), resolved_by = adminId
 * 2. Auto-deletes payment-proof image from Supabase Storage using Admin client (bypassing RLS)
 * 3. Increments the target student's credits balance
 * 4. Writes an audit log into system_logs and notifies the student
 */
export async function approveCreditRequest({
  requestId,
  userId,
  creditAmount,
}: {
  requestId: string;
  userId?: string;
  creditAmount?: number;
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

    // Fetch existing credit request to get proof_image_url and user_id fallback
    const { data: creditReq } = await supabase
      .from('credit_requests')
      .select('proof_image_url, user_id, credits_requested')
      .eq('id', requestId)
      .single();

    const targetUserId = userId || creditReq?.user_id;
    const addedCredits = creditAmount || creditReq?.credits_requested || 0;

    // 1. Mark credit_requests as APPROVED
    const nowIso = new Date().toISOString();
    const { error: reqError } = await supabase
      .from('credit_requests')
      .update({
        status: 'APPROVED',
        resolved_at: nowIso,
        resolved_by: adminUser.id,
      })
      .eq('id', requestId);

    if (reqError) {
      console.error('approveCreditRequest update error:', reqError);
      return { success: false, error: reqError.message };
    }

    // 2. Auto-Delete Storage Image using Admin Client (Bypasses RLS)
    if (creditReq?.proof_image_url) {
      await deleteStorageImage(creditReq.proof_image_url);
    }

    // 3. Increment student credits balance
    let newCredits = 0;
    if (targetUserId) {
      const { data: student } = await supabase
        .from('users')
        .select('credits')
        .eq('id', targetUserId)
        .single();

      const currentCredits = student?.credits ?? 0;
      newCredits = currentCredits + addedCredits;

      const { error: userError } = await supabase
        .from('users')
        .update({
          credits: newCredits,
          updated_at: nowIso,
        })
        .eq('id', targetUserId);

      if (userError) {
        console.error('approveCreditRequest user credits update error:', userError);
        return { success: false, error: userError.message };
      }
    }

    // 4. Write audit log into system_logs
    await supabase.from('system_logs').insert({
      level: 'INFO',
      action: 'APPROVED_CREDITS',
      message: `Admin ${adminUser.email} approved request ${requestId}: added ${addedCredits} credits to user ${targetUserId} (New balance: ${newCredits})`,
      user_id: adminUser.id,
      metadata: {
        request_id: requestId,
        target_user_id: targetUserId,
        credits_added: addedCredits,
        new_balance: newCredits,
      },
    });

    // 5. Notify the student via centralized utility (bypasses RLS with service-role key)
    if (targetUserId) {
      await sendNotification({
        userId: targetUserId,
        title: 'Credits Approved!',
        message: `Your request for ${addedCredits} credits has been approved and added to your balance.`,
        type: 'CREDIT_UPDATE',
        link: '/student/credits',
      });
    }

    // 6. Invalidate Next.js Cache
    revalidatePath('/admin/requests');
    revalidateAllCreditPaths();

    return { success: true, newCredits };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to approve credit request';
    console.error('approveCreditRequest exception:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: rejectCreditRequest
 * Marks request as 'REJECTED', auto-deletes payment proof image using Admin client, notifies student, and revalidates cache.
 */
export async function rejectCreditRequest({
  requestId,
  userId,
  reason,
}: {
  requestId: string;
  userId?: string;
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

    // Fetch existing credit request to inspect proof_image_url and user_id
    const { data: creditReq } = await supabase
      .from('credit_requests')
      .select('proof_image_url, user_id')
      .eq('id', requestId)
      .single();

    const targetUserId = userId || creditReq?.user_id;

    // 1. Mark credit_requests as REJECTED
    const nowIso = new Date().toISOString();
    const { error: reqError } = await supabase
      .from('credit_requests')
      .update({
        status: 'REJECTED',
        resolved_at: nowIso,
        resolved_by: adminUser.id,
      })
      .eq('id', requestId);

    if (reqError) {
      console.error('rejectCreditRequest update error:', reqError);
      return { success: false, error: reqError.message };
    }

    // 2. Auto-Delete Storage Image using Admin Client (Bypasses RLS)
    if (creditReq?.proof_image_url) {
      await deleteStorageImage(creditReq.proof_image_url);
    }

    // 3. Log rejection into system_logs
    await supabase.from('system_logs').insert({
      level: 'WARN',
      action: 'REJECTED_CREDITS',
      message: `Admin ${adminUser.email} rejected credit request ${requestId} for user ${targetUserId}. Reason: ${reason || 'Invalid proof'}`,
      user_id: adminUser.id,
      metadata: {
        request_id: requestId,
        target_user_id: targetUserId,
        rejection_reason: reason || 'Invalid proof',
      },
    });

    // 4. Notify the student via centralized utility (bypasses RLS with service-role key)
    if (targetUserId) {
      await sendNotification({
        userId: targetUserId,
        title: 'Credit Request Rejected',
        message: reason
          ? `Your recent request for credits was declined. Reason: ${reason}`
          : 'Your recent request for credits was declined. Please contact an administrator.',
        type: 'CREDIT_UPDATE',
        link: '/student/credits',
      });
    }

    // 5. Invalidate Next.js Cache
    revalidatePath('/admin/requests');
    revalidateAllCreditPaths();

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to reject credit request';
    console.error('rejectCreditRequest exception:', err);
    return { success: false, error: errorMsg };
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch credit requests';
    console.error('getPendingCreditRequests exception:', err);
    return { success: false, error: errorMsg, data: [] };
  }
}
