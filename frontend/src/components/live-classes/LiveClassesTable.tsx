'use client';

import type { LiveClassRow, ClassStatus } from '@/types/live-class';
import { LiveClassRowActions } from './LiveClassRowActions';
import { Video, Calendar, User, BookOpen } from 'lucide-react';

interface LiveClassesTableProps {
  classes: LiveClassRow[];
  deletingId: string | null;
  onEdit: (liveClass: LiveClassRow) => void;
  onDuplicate: (liveClass: LiveClassRow) => void;
  onPreview: (liveClass: LiveClassRow) => void;
  onDelete: (liveClass: LiveClassRow) => void;
}

const statusBadges: Record<ClassStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  LIVE: { label: 'Live', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export function LiveClassesTable({
  classes,
  deletingId,
  onEdit,
  onDuplicate,
  onPreview,
  onDelete,
}: LiveClassesTableProps) {
  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-2xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
          <Video className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-gray-900">No live classes found</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-sm">
          No classes match your search or filter criteria. Try adjusting your filters or schedule a new class.
        </p>
      </div>
    );
  }

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th scope="col" className="px-6 py-3.5 font-semibold">Title & Course</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Teacher</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Start Time</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Created Date</th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-normal">
            {classes.map((cls) => {
              const badge = statusBadges[cls.status];

              return (
                <tr key={cls.id} className="group hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {cls.title}
                      </span>
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <BookOpen className="h-3 w-3" />
                        <span>{cls.course_title ?? 'No course assigned'}</span>
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>{cls.teacher_name ?? '—'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>{formatDateTime(cls.start_time)}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(cls.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <LiveClassRowActions
                      liveClass={cls}
                      isDeleting={deletingId === cls.id}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onPreview={onPreview}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
