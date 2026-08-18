'use client';

import { X, Calendar, Clock, BookOpen, User, Users, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import type { LiveClassRow } from '@/types/live-class';

interface LiveClassPreviewModalProps {
  liveClass: LiveClassRow | null;
  onClose: () => void;
}

export function LiveClassPreviewModal({
  liveClass,
  onClose,
}: LiveClassPreviewModalProps) {
  if (!liveClass) return null;

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Meet link copied to clipboard.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              {liveClass.status}
            </span>
            <h2 className="mt-2 text-lg font-bold text-gray-900">{liveClass.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {liveClass.description && (
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-xl">
            {liveClass.description}
          </p>
        )}

        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Course:</span>
            <span>{liveClass.course_title ?? '—'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Teacher:</span>
            <span>{liveClass.teacher_name ?? '—'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Time:</span>
            <span>{formatDateTime(liveClass.start_time)} – {formatDateTime(liveClass.end_time)}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Enrolled Students:</span>
            <span>{liveClass.student_ids?.length ?? 0} students</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          {liveClass.meet_link ? (
            <div className="flex items-center gap-2">
              <a
                href={liveClass.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Join Google Meet
              </a>
              <button
                type="button"
                onClick={() => handleCopyLink(liveClass.meet_link!)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">No Google Meet link generated yet</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
