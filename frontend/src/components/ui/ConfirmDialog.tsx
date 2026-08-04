'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const dialogNode = dialogRef.current;
    if (dialogNode) {
      const focusableElements = dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        dialogNode.focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === 'Tab' && dialogNode) {
        const focusables = Array.from(
          dialogNode.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-2 focus-visible:ring-yellow-500/40';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/40';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700 focus:outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="confirm-dialog-title" className="text-lg font-extrabold text-white tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <X size={20} />
          </button>
        </div>

        <p id="confirm-dialog-message" className="text-xs leading-relaxed text-gray-300 mb-6">
          {message}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${getButtonStyles()} rounded-xl text-xs font-bold text-white transition-colors focus-visible:outline-none`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}