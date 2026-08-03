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
 * Securely handles atomic credit deduction and quiz attempt creation via the 'start_quiz_attempt' RPC.
 *
 * @param quizId - UUID of the target quiz
 * @param cost   - Number of credits required to start the attempt (e.g. 15)
 */
export async function purchaseQuizAttempt(
  quizId: string,
  cost: number = 15
): Promise<PurchaseQuizAttemptResult> {
  try {
    if (!quizId) {
      return { error: 'Quiz ID is required' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { error: 'Supabase client unavailable' };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'User is not authenticated' };
    }

    // Call the Postgres RPC start_quiz_attempt which handles atomic credit deduction & attempt creation
    const { data: attemptId, error: rpcError } = await supabase.rpc(
      'start_quiz_attempt',
      {
        p_user_id: user.id,
        p_quiz_id: quizId,
        p_cost: cost,
      }
    );

    if (rpcError) {
      return { error: rpcError.message };
    }

    if (!attemptId) {
      return { error: 'Failed to create quiz attempt' };
    }

    // Trigger notification via centralized utility
    try {
      await sendNotification({
        userId: user.id,
        title: 'Quiz Started',
        message: `-${cost} credits for quiz attempt.`,
        type: 'CREDIT_SPENT',
      });
    } catch (notifErr) {
      console.error('purchaseQuizAttempt notification error (non-fatal):', notifErr);
    }

    // Revalidate student dashboard and credit balance routes
    try {
      revalidatePath('/student/credits');
      revalidatePath('/student/dashboard');
      revalidatePath('/dashboard');
      revalidatePath(`/quiz/${attemptId}`);
    } catch (revalErr) {
      console.error('purchaseQuizAttempt revalidate error (non-fatal):', revalErr);
    }

    return {
      success: true,
      attemptId: String(attemptId),
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'An unexpected error occurred while starting quiz';
    console.error('purchaseQuizAttempt exception:', err);
    return { error: errorMsg };
  }
}
