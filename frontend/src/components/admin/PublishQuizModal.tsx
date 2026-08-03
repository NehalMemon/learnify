'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, Coins, Loader2, X } from 'lucide-react';
import { publishQuiz } from '@/app/actions/quizAdminActions';

export interface PublishQuizModalProps {
  isOpen: boolean;
  quizId: string | null;
  quizTitle?: string;
  initialCost?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PublishQuizModal({
  isOpen,
  quizId,
  quizTitle,
  initialCost = 0,
  onClose,
  onSuccess,
}: PublishQuizModalProps) {
  const [creditCost, setCreditCost] = useState<number>(initialCost);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCreditCost(initialCost ?? 0);
      setIsSubmitting(false);
    }
  }, [isOpen, initialCost]);

  if (!isOpen || !quizId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creditCost < 0 || isNaN(creditCost)) {
      toast.error('Credit cost must be a non-negative number (0 or higher).');
      return;
    }

    setIsSubmitting(true);

    try {
      await publishQuiz(quizId, Number(creditCost));
      toast.success('Quiz published successfully!');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to publish quiz.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-purple-600">
              <Coins className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Publish Quiz</span>
            </div>
            <h3 className="mt-1 text-xl font-extrabold text-slate-950">
              Publish Quiz &amp; Set Price
            </h3>
            {quizTitle && (
              <p className="mt-0.5 text-xs font-medium text-slate-500 line-clamp-1">
                {quizTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Callout Box */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-medium">
            Once published, students will pay this credit amount per attempt. Set to 0 for a free quiz.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="creditCost" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Credit Cost per Attempt <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Coins className="h-4 w-4" />
              </div>
              <input
                id="creditCost"
                type="number"
                min="0"
                step="1"
                required
                value={creditCost}
                onChange={(e) => setCreditCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {creditCost === 0 ? 'Free attempt (0 credits required)' : `Students will be charged ${creditCost} credit${creditCost > 1 ? 's' : ''} per attempt`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                'Confirm & Publish'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PublishQuizModal;
