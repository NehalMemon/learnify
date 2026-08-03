'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { sendNotification } from '@/lib/notifications';

export interface PurchaseQuizAttemptResult {
  success?: boolean;
  attemptId?: string;
  error?: string;
}

/**
 * Server Action: purchaseQuizAttempt
 * 
 * Atomically deducts user credits and creates a quiz attempt using the
 * Supabase `start_quiz_attempt` RPC function to prevent race conditions.
 *
 * @param quizId - Target quiz UUID
 * @param cost   - Number of credits to deduct for this attempt
 */
export async function purchaseQuizAttempt(
  quizId: string,
  cost: number
): Promise<PurchaseQuizAttemptResult> {
  try {
    if (!quizId) {
      return { error: 'Quiz ID is required' };
    }
    if (cost < 0) {
      return { error: 'Invalid cost amount' };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'User is not authenticated' };
    }

    // Call Supabase RPC start_quiz_attempt
    const { data: attemptId, error: rpcError } = await supabase.rpc('start_quiz_attempt', {
      p_user_id: user.id,
      p_quiz_id: quizId,
      p_cost: cost,
    });

    if (rpcError) {
      return { error: rpcError.message };
    }

    if (!attemptId) {
      return { error: 'Failed to generate quiz attempt' };
    }

    // Trigger notification for credit spent
    try {
      await sendNotification({
        userId: user.id,
        title: 'Quiz Started',
        message: `-${cost} credits for quiz attempt.`,
        type: 'CREDIT_SPENT',
      });
    } catch (notifErr) {
      console.error('Failed to send quiz purchase notification (non-fatal):', notifErr);
    }

    // Revalidate relevant pages
    try {
      revalidatePath('/student/credits');
      revalidatePath('/student/dashboard');
      revalidatePath('/dashboard');
    } catch (cacheErr) {
      console.error('Revalidate error (non-fatal):', cacheErr);
    }

    return {
      success: true,
      attemptId: String(attemptId),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('purchaseQuizAttempt exception:', err);
    return { error: errorMsg };
  }
}
