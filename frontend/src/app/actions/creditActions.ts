'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Secure Server Action: submitCreditRequest
 * 
 * CRITICAL SECURITY DIRECTIVE:
 * This action ONLY inserts a row into public.credit_requests with status = 'PENDING'.
 * It DOES NOT update the user's actual credits balance. Only Admins can approve requests.
 */
export async function submitCreditRequest({
  amount,
  price,
  reason,
  proofImageUrl,
}: {
  amount: number;
  price: number;
  reason?: string;
  proofImageUrl?: string;
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

    // CRITICAL SECURITY: ONLY insert row into credit_requests table with status = 'PENDING'
    const { data, error } = await supabase
      .from('credit_requests')
      .insert({
        user_id: user.id,
        amount,
        status: 'PENDING',
        reason: reason || `Credit Store Purchase ($${price} for ${amount} Credits)`,
        proof_image_url: proofImageUrl || 'https://placeholder.learnify.pk/proof_payment_mock.png',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('submitCreditRequest DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('submitCreditRequest exception:', err);
    return { success: false, error: err.message || 'Failed to submit credit request' };
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
  } catch (err: any) {
    console.error('getMyCreditRequests exception:', err);
    return { success: false, error: err.message, data: [] };
  }
}
