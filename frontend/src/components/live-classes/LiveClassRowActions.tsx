'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit3, Copy, Eye, Trash2, Loader2 } from 'lucide-react';
import type { LiveClassRow } from '@/types/live-class';

interface LiveClassRowActionsProps {
  liveClass: LiveClassRow;
  isDeleting: boolean;
  onEdit: (liveClass: LiveClassRow) => void;
  onDuplicate: (liveClass: LiveClassRow) => void;
  onPreview: (liveClass: LiveClassRow) => void;
  onDelete: (liveClass: LiveClassRow) => void;
}

export function LiveClassRowActions({
  liveClass,
  isDeleting,
  onEdit,
  onDuplicate,
  onPreview,
  onDelete,
}: LiveClassRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isDeleting}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Actions for ${liveClass.title}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onEdit(liveClass);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Class
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDuplicate(liveClass);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onPreview(liveClass);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDelete(liveClass);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
