'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Coins, Loader2 } from 'lucide-react';
import { purchaseQuizAttempt } from '@/app/actions/quizActions';

export interface StartQuizButtonProps {
  quizId: string;
  cost?: number;
  className?: string;
  variant?: 'primary' | 'secondary' | 'purple' | 'outline';
  buttonText?: string;
}

export function StartQuizButton({
  quizId,
  cost = 15,
  className = '',
  variant = 'purple',
  buttonText = 'Start Quiz',
}: StartQuizButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartQuiz = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await purchaseQuizAttempt(quizId, cost);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.success && result.attemptId) {
        toast.success('Credits deducted. Starting quiz...');
        router.push(`/quiz/${result.attemptId}`);
      } else {
        toast.error('Could not start quiz. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Base styling depending on variant
  const variantStyles = {
    purple:
      'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 active:scale-[0.98]',
    primary:
      'bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-[0.98]',
    secondary:
      'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 active:scale-[0.98]',
    outline:
      'border border-slate-300 hover:bg-slate-50 text-slate-700 active:scale-[0.98]',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.purple;

  return (
    <button
      type="button"
      onClick={handleStartQuiz}
      disabled={isSubmitting}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${selectedVariant} ${className}`}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Starting Quiz...</span>
        </>
      ) : (
        <>
          <span>{buttonText}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/10 px-2 py-0.5 text-xs font-extrabold tracking-wide">
            <Coins className="h-3.5 w-3.5" />
            {cost} Credits
          </span>
        </>
      )}
    </button>
  );
}

export default StartQuizButton;
