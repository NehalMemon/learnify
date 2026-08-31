'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { notifyAllAdmins } from '@/lib/notifications';

/**
 * Secure Server Action: submitCreditRequest
 * 
 * CRITICAL SECURITY DIRECTIVE:
 * This action ONLY inserts a row into public.credit_requests with status = 'PENDING'.
 * It DOES NOT update the user's actual credits balance. Only Admins can approve requests.
 */
export async function submitCreditRequest({
  packageName,
  creditsRequested,
  amount,
  price,
  proofImageUrl,
}: {
  packageName?: string;
  creditsRequested?: number;
  amount?: number;
  price?: number;
  proofImageUrl?: string | null;
}) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const credits = creditsRequested ?? amount ?? 0;
    const pkgName = packageName || (price ? `$${price} Pack` : `${credits} Credits Pack`);

    // CRITICAL DB SCHEMA ACCURACY: ONLY insert exact database keys
    const { data, error } = await supabase
      .from('credit_requests')
      .insert({
        user_id: user.id,
        package_name: pkgName,
        credits_requested: credits,
        proof_image_url: proofImageUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error('submitCreditRequest DB error:', error);
      return { success: false, error: error.message };
    }

    // 1. Notify ALL admins via centralized utility (bypasses RLS with service-role key)
    // Why wrapped in its own try/catch: notification failure must never block the
    // primary DB transaction from returning a success response to the student.
    try {
      await notifyAllAdmins({
        title: 'New Credit Request',
        message: `A student has submitted a payment proof for review. Package: ${pkgName} (${credits} credits).`,
        type: 'CREDIT_REQUEST',
        link: '/admin/requests',
      });
    } catch (notifyErr) {
      console.error('submitCreditRequest notifyAllAdmins error (non-fatal):', notifyErr);
    }

    // 2. Invalidate Next.js cache so the admin and student dashboards update immediately
    try {
      revalidatePath('/admin/requests');
      revalidatePath('/admin/payments');
      revalidatePath('/student/credits');
      revalidatePath('/dashboard/credits');
      revalidatePath('/dashboard');
    } catch (cacheErr) {
      console.error('submitCreditRequest revalidate error (non-fatal):', cacheErr);
    }

    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to submit credit request';
    console.error('submitCreditRequest exception:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: getUserCredits
 * Securely fetches the logged-in user's current credit balance from the users table.
 */
export async function getUserCredits() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, credits: 0, error: 'Supabase client unavailable' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, credits: 0, error: 'User is not authenticated' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('getUserCredits error:', error);
      return { success: false, credits: 0, error: error.message };
    }

    return { success: true, credits: data?.credits ?? 0 };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch user credits';
    console.error('getUserCredits exception:', err);
    return { success: false, credits: 0, error: errorMsg };
  }
}

/**
 * Server Action: getMyCreditRequests
 * Fetches past credit requests for the logged-in student.
 */
export async function getMyCreditRequests() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable', data: [] };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User is not authenticated', data: [] };
    }

    const { data, error } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getMyCreditRequests DB error:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch credit requests';
    console.error('getMyCreditRequests exception:', err);
    return { success: false, error: errorMsg, data: [] };
  }
}

/**
 * Secure Server Action: uploadPaymentProof
 * Handles file upload to Supabase Storage on the server side where cookies()
 * are securely available.
 */
export async function uploadPaymentProof(formData: FormData) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client unavailable' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No proof of payment file provided' };
    }

    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proof')
      .upload(fileName, file, {
        upsert: false,
        contentType: file.type || 'image/png',
      });

    if (uploadError) {
      console.error('uploadPaymentProof storage upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('payment-proof')
      .getPublicUrl(fileName);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to upload proof image on server';
    console.error('uploadPaymentProof exception:', err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

import {
  approveCreditRequest as approveAdminRequest,
  rejectCreditRequest as rejectAdminRequest,
  getPendingCreditRequests as getPendingAdminRequests,
} from './creditAdminActions';

// Explicit async wrapper exports for Next.js "use server" compliance
export async function approveCreditRequest(params: {
  requestId: string;
  userId?: string;
  creditAmount?: number;
}) {
  return approveAdminRequest(params);
}

export async function rejectCreditRequest(params: {
  requestId: string;
  userId?: string;
  reason?: string;
}) {
  return rejectAdminRequest(params);
}

export async function getPendingCreditRequests(statusFilter?: string) {
  return getPendingAdminRequests(statusFilter);
}

