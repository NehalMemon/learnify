'use client';

import { useState } from 'react';
import { Clock, Coins, Loader2, Send, X } from 'lucide-react';

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
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {/* Quiz Duration Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
              Quiz Duration (in minutes) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777586]" />
              <input
                type="number"
                min={1}
                max={1440}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                placeholder="60"
                required
                className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] pl-10 pr-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#777586]">
              Time allowed for students to complete this exam (e.g. 60 min).
            </p>
          </div>

          {/* Credit Cost Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
              Credit Cost <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Coins className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777586]" />
              <input
                type="number"
                min={0}
                max={10000}
                value={creditCost}
                onChange={(e) => setCreditCost(Number(e.target.value))}
                placeholder="0"
                required
                className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] pl-10 pr-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              />
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
