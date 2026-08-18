'use client';

import Link from 'next/link';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import type { ClassStatus } from '@/types/class';

interface BuilderHeaderProps {
  classTitle: string;
  status: ClassStatus;
  isSaving: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function BuilderHeader({
  classTitle,
  status,
  isSaving,
  onSaveDraft,
  onPublish,
}: BuilderHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/90 px-6 py-3.5 backdrop-blur-md transition-all">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/classes"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20"
          title="Back to Classes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-gray-900 line-clamp-1">
              {classTitle || 'Untitled Class'}
            </h1>
            {status === 'PUBLISHED' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Class Workspace Builder</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5 text-gray-500" />
          Save Draft
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3525cd] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#3525cd]/20 transition-all hover:bg-[#2d1db7] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#3525cd]/30 active:scale-95 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {status === 'PUBLISHED' ? 'Update Class' : 'Publish Class'}
        </button>
      </div>
    </header>
  );
}
