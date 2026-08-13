'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  User,
  Users,
  Video,
} from 'lucide-react';
import { deleteLiveClass } from '@/actions/live-class';
import type { LiveClassRow, ClassStatus } from '@/types/live-class';

// ── Types ───────────────────────────────────────────────────────

export interface LiveClassesDashboardProps {
  liveClasses: LiveClassRow[];
  /** Non-fatal data-fetch warning surfaced in a banner; the grid still renders. */
  error?: string | null;
}

// ── Presentation helpers ────────────────────────────────────────

const statusStyles: Record<
  ClassStatus,
  { label: string; className: string; liveDot?: boolean }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  LIVE: {
    label: 'Live',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    liveDot: true,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const recurrenceLabel = (recurrence: string) =>
  recurrence === 'WEEKLY' ? 'Weekly' : 'One-off';

// ── Component ───────────────────────────────────────────────────

export function LiveClassesDashboard({
  liveClasses,
  error = null,
}: LiveClassesDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const created = searchParams.get('created');

  useEffect(() => {
    if (created !== '1') return;
    toast.success('Live class scheduled successfully!');
    router.replace('/admin/live-classes');
  }, [created, router]);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Meet link copied to clipboard.');
    } catch {
      toast.error('Could not copy the link — please copy it manually.');
    }
  };

  const handleDelete = async (liveClass: LiveClassRow) => {
    // Deleting the row does not remove the already-created Google Calendar
    // event from the teacher's calendar — warn the admin up front.
    const meetWarning = liveClass.meet_link
      ? " The Google Calendar event will remain on the teacher's calendar."
      : '';
    if (!window.confirm(`Delete "${liveClass.title}"? This cannot be undone.${meetWarning}`)) return;

    setDeletingId(liveClass.id);
    try {
      const res = await deleteLiveClass(liveClass.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete the live class.');
        return;
      }
      toast.success('Live class deleted.');
      router.refresh();
    } catch {
      toast.error('Failed to delete the live class.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Class Library
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Live Classes — track and manage Google Meet sessions across every course.
          </p>
        </div>

        <Link
          href="/admin/live-classes/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-2"
        >
          + Schedule New Class
        </Link>
      </div>

      {/* ── Non-fatal data warning banner ─────────────────────── */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some data failed to load: {error}
        </div>
      )}

      {/* ── Classes grid ───────────────────────────────────────── */}
      {liveClasses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveClasses.map((liveClass) => {
            const status = statusStyles[liveClass.status];
            const studentCount = liveClass.student_ids?.length ?? 0;

            return (
              <article
                key={liveClass.id}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Top row: status + recurrence + delete */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                    >
                      {status.liveDot && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      )}
                      {status.label}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {recurrenceLabel(liveClass.recurrence)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(liveClass)}
                    disabled={deletingId === liveClass.id}
                    title="Delete live class"
                    aria-label={`Delete ${liveClass.title}`}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === liveClass.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Title + description */}
                <h3 className="mt-3 text-base font-bold text-gray-900 line-clamp-1">
                  {liveClass.title}
                </h3>
                {liveClass.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                    {liveClass.description}
                  </p>
                )}

                {/* Meta rows */}
                <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="truncate">{liveClass.course_title ?? '—'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="truncate">{liveClass.teacher_name ?? '—'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="truncate">
                      {formatDateTime(liveClass.start_time)} – {formatDateTime(liveClass.end_time)}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span>{studentCount} student{studentCount === 1 ? '' : 's'}</span>
                  </p>
                </div>

                {/* Meet link footer */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  {liveClass.meet_link ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={liveClass.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Join
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(liveClass.meet_link!)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy Link
                      </button>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Generating via Cron…
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────── */
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Video className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-gray-900">No live classes scheduled</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
            Schedule your first Google Meet class and the link will be generated automatically
            before the session starts.
          </p>
          <Link
            href="/admin/live-classes/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Schedule New Class
          </Link>
        </div>
      )}
    </div>
  );
}

export default LiveClassesDashboard;
