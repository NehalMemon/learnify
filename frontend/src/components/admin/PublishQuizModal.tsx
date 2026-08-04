'use client';

import { useState } from 'react';
import { Clock, Coins, Loader2, Minus, Plus, Send, X } from 'lucide-react';

interface PublishQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { durationMinutes: number; creditCost: number }) => Promise<void> | void;
  initialDurationMinutes?: number;
  initialCreditCost?: number;
  isSubmitting?: boolean;
}

export function PublishQuizModal({
  isOpen,
  onClose,
  onConfirm,
  initialDurationMinutes = 60,
  initialCreditCost = 0,
  isSubmitting = false,
}: PublishQuizModalProps) {
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDurationMinutes);
  const [creditCost, setCreditCost] = useState<number>(initialCreditCost);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  /* Duration Handlers */
  const incrementDuration = () => {
    setDurationMinutes((prev) => prev + 1);
  };

  const decrementDuration = () => {
    setDurationMinutes((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setDurationMinutes(1);
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed) || parsed < 1) {
      setDurationMinutes(1);
    } else {
      setDurationMinutes(parsed);
    }
  };

  /* Credit Cost Handlers */
  const incrementCredits = () => {
    setCreditCost((prev) => prev + 1);
  };

  const decrementCredits = () => {
    setCreditCost((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setCreditCost(0);
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      setCreditCost(0);
    } else {
      setCreditCost(parsed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedDuration = Number(durationMinutes);
    const parsedCost = Number(creditCost);

    if (isNaN(parsedDuration) || parsedDuration < 1) {
      setError('Quiz duration must be at least 1 minute.');
      return;
    }

    if (isNaN(parsedCost) || parsedCost < 0) {
      setError('Credit cost cannot be negative.');
      return;
    }

    await onConfirm({
      durationMinutes: Math.floor(parsedDuration),
      creditCost: Math.floor(parsedCost),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-[#eceef5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eceef5] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#191c1e]">Publish Quiz</h3>
              <p className="text-xs text-[#696778]">Set exam duration and credit access cost</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777586] transition hover:bg-[#f7f7fb] hover:text-[#191c1e]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {/* Quiz Duration Stepper Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5">
              Quiz Duration (in minutes) <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center border border-[#dadce5] rounded-xl overflow-hidden bg-[#f7f7fb] transition focus-within:border-[#3525cd] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3525cd]/15">
              <div className="pl-3.5 pr-1 text-[#777586] flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>

              {/* Decrement (-) Button */}
              <button
                type="button"
                onClick={decrementDuration}
                disabled={durationMinutes <= 1 || isSubmitting}
                className="flex h-11 w-11 items-center justify-center text-[#4b4a58] transition hover:bg-[#eceef5] active:bg-[#e2e4ef] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-r border-[#dadce5]/60"
                aria-label="Decrement duration"
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* Stepper Middle Input */}
              <input
                type="number"
                min={1}
                max={1440}
                value={durationMinutes}
                onChange={handleDurationChange}
                placeholder="60"
                required
                disabled={isSubmitting}
                className="w-full min-h-11 bg-transparent text-center text-sm font-bold text-[#191c1e] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              {/* Increment (+) Button */}
              <button
                type="button"
                onClick={incrementDuration}
                disabled={isSubmitting}
                className="flex h-11 w-11 items-center justify-center text-[#4b4a58] transition hover:bg-[#eceef5] active:bg-[#e2e4ef] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-l border-[#dadce5]/60"
                aria-label="Increment duration"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#777586]">
              Time allowed for students to complete this exam (minimum 1 min).
            </p>
          </div>

          {/* Credit Cost Stepper Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5">
              Credit Cost <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center border border-[#dadce5] rounded-xl overflow-hidden bg-[#f7f7fb] transition focus-within:border-[#3525cd] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3525cd]/15">
              <div className="pl-3.5 pr-1 text-[#777586] flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>

              {/* Decrement (-) Button */}
              <button
                type="button"
                onClick={decrementCredits}
                disabled={creditCost <= 0 || isSubmitting}
                className="flex h-11 w-11 items-center justify-center text-[#4b4a58] transition hover:bg-[#eceef5] active:bg-[#e2e4ef] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-r border-[#dadce5]/60"
                aria-label="Decrement credits"
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* Stepper Middle Input */}
              <input
                type="number"
                min={0}
                max={10000}
                value={creditCost}
                onChange={handleCreditsChange}
                placeholder="0"
                required
                disabled={isSubmitting}
                className="w-full min-h-11 bg-transparent text-center text-sm font-bold text-[#191c1e] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              {/* Increment (+) Button */}
              <button
                type="button"
                onClick={incrementCredits}
                disabled={isSubmitting}
                className="flex h-11 w-11 items-center justify-center text-[#4b4a58] transition hover:bg-[#eceef5] active:bg-[#e2e4ef] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-l border-[#dadce5]/60"
                aria-label="Increment credits"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#777586]">
              Number of credits required for student access (0 = Free).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#eceef5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-10 rounded-xl border border-[#dadce5] bg-white px-4 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-5 text-xs font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Quiz'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
