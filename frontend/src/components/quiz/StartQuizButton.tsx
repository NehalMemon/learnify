'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { purchaseQuizAttempt } from '@/actions/quizActions';

export interface StartQuizButtonProps {
  quizId: string;
  cost?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * StartQuizButton
 *
 * Interactively prompts and executes a pay-per-attempt credit deduction
 * via the purchaseQuizAttempt Server Action and drops the student into
 * the newly generated quiz attempt.
 */
export function StartQuizButton({
  quizId,
  cost = 15,
  className = '',
  disabled = false,
}: StartQuizButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartQuiz = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      const result = await purchaseQuizAttempt(quizId, cost);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.attemptId) {
        toast.success('Credits deducted. Starting quiz...');
        router.push(`/quiz/${result.attemptId}`);
      } else {
        toast.error('Failed to start quiz. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Error starting quiz:', err);
      toast.error('An error occurred while starting the quiz');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleStartQuiz}
      disabled={isLoading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Starting Quiz...</span>
        </>
      ) : (
        <>
          <Coins className="h-4 w-4 text-amber-300" />
          <span>Start Quiz ({cost} Credits)</span>
        </>
      )}
    </button>
  );
}

export default StartQuizButton;
