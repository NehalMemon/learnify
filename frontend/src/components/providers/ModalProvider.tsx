'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export interface ModalContextType {
  confirm: (options: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

function GlobalConfirmModal({
  options,
  onConfirm,
  onCancel,
}: {
  options: ModalOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (dialogNode) {
      const focusable = dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[focusable.length - 1].focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab' && dialogNode) {
        const focusables = Array.from(
          dialogNode.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const confirmText = options.confirmText || 'Confirm';
  const cancelText = options.cancelText || 'Cancel';
  const isDestructive = Boolean(options.isDestructive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-modal-title"
        aria-describedby="global-modal-message"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl z-10 space-y-4 focus:outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="global-modal-title" className="text-base font-extrabold text-slate-950 tracking-tight">
                {options.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p id="global-modal-message" className="text-xs leading-relaxed text-slate-600">
          {options.message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/40'
                : 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ModalOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ModalOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ModalContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <GlobalConfirmModal
          options={options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ModalProvider');
  }
  return context.confirm;
}
