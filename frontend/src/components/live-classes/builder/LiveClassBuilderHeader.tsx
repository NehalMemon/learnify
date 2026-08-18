'use client';

import Link from 'next/link';
import { ArrowLeft, Save, Calendar, Loader2 } from 'lucide-react';
import type { ClassStatus } from '@/types/live-class';

interface LiveClassBuilderHeaderProps {
  title: string;
  status: ClassStatus;
  isSubmitting: boolean;
  isEditMode: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function LiveClassBuilderHeader({
  title,
  status,
  isSubmitting,
  isEditMode,
  onSaveDraft,
  onPublish,
}: LiveClassBuilderHeaderProps) {
  const statusStyles: Record<ClassStatus, string> = {
    SCHEDULED: 'bg-purple-50 text-purple-700 border-purple-200',
    LIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/90 px-6 py-3.5 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/live-classes"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-2xs transition hover:bg-gray-50 hover:text-gray-900"
          title="Back to Library"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-gray-900 line-clamp-1">
              {title || 'Untitled Live Class'}
            </h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500">Live Class Builder Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5 text-gray-500" />
          Save Draft
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Calendar className="h-3.5 w-3.5" />
          )}
          {isEditMode ? 'Update Class' : 'Schedule & Publish'}
        </button>
      </div>
    </header>
  );
}
