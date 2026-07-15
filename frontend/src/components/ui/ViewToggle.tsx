'use client';

import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '@/hooks/useViewMode';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * A pill-shaped toggle that lets the user switch between grid and list
 * view modes. The active button receives a distinct purple tint.
 */
export function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-sm"
      role="radiogroup"
      aria-label="View mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === 'grid'}
        aria-label="Grid view"
        onClick={() => onChange('grid')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          viewMode === 'grid'
            ? 'bg-white text-purple-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === 'list'}
        aria-label="List view"
        onClick={() => onChange('list')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          viewMode === 'list'
            ? 'bg-white text-purple-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
