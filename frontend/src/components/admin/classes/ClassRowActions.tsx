'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit3, Copy, Trash2 } from 'lucide-react';
import type { ClassItem } from '@/types/class';

interface ClassRowActionsProps {
  classItem: ClassItem;
  onEdit: (classItem: ClassItem) => void;
  onDuplicate: (classItem: ClassItem) => void;
  onDelete: (classItem: ClassItem) => void;
}

export function ClassRowActions({
  classItem,
  onEdit,
  onDuplicate,
  onDelete,
}: ClassRowActionsProps) {
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
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Actions for ${classItem.title}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
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
              onEdit(classItem);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#3525cd] transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Class
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDuplicate(classItem);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#3525cd] transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDelete(classItem);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Class
          </button>
        </div>
      )}
    </div>
  );
}
