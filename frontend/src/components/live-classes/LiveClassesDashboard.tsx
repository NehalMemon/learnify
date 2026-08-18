'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Search, Filter } from 'lucide-react';
import { deleteLiveClass, duplicateLiveClass } from '@/actions/live-class';
import type { LiveClassRow, ClassStatus } from '@/types/live-class';
import { LiveClassesMetrics } from './LiveClassesMetrics';
import { LiveClassesTable } from './LiveClassesTable';
import { LiveClassPreviewModal } from './LiveClassPreviewModal';

export interface LiveClassesDashboardProps {
  liveClasses: LiveClassRow[];
  error?: string | null;
}

export function LiveClassesDashboard({ liveClasses, error = null }: LiveClassesDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClassStatus>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewClass, setPreviewClass] = useState<LiveClassRow | null>(null);

  useEffect(() => {
    if (searchParams.get('created') === '1') {
      toast.success('Live class scheduled successfully!');
      router.replace('/admin/live-classes');
    }
  }, [searchParams, router]);

  const filteredClasses = liveClasses.filter((cls) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      cls.title.toLowerCase().includes(query) ||
      (cls.course_title && cls.course_title.toLowerCase().includes(query)) ||
      (cls.teacher_name && cls.teacher_name.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || cls.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (cls: LiveClassRow) => {
    router.push(`/admin/live-classes/builder?id=${cls.id}`);
  };

  const handleDuplicate = async (cls: LiveClassRow) => {
    toast.loading('Duplicating live class...');
    const res = await duplicateLiveClass(cls.id);
    toast.dismiss();
    if (res.success) {
      toast.success('Live class duplicated.');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to duplicate live class.');
    }
  };

  const handleDelete = async (cls: LiveClassRow) => {
    if (!window.confirm(`Delete "${cls.title}"? This cannot be undone.`)) return;
    setDeletingId(cls.id);
    const res = await deleteLiveClass(cls.id);
    setDeletingId(null);
    if (res.success) {
      toast.success('Live class deleted.');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to delete live class.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Class Library
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Central command center for managing interactive live classes & Google Meet sessions.
          </p>
        </div>

        <Link
          href="/admin/live-classes/builder"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        >
          <Plus className="h-4 w-4" />
          Create New Class
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
          Warning: {error}
        </div>
      )}

      <LiveClassesMetrics liveClasses={liveClasses} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes by title, course, or assigned teacher..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
          />
        </div>

        <div className="relative sm:w-48">
          <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ClassStatus)}
            aria-label="Filter by status"
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <LiveClassesTable
        classes={filteredClasses}
        deletingId={deletingId}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onPreview={setPreviewClass}
        onDelete={handleDelete}
      />

      <LiveClassPreviewModal
        liveClass={previewClass}
        onClose={() => setPreviewClass(null)}
      />
    </div>
  );
}

export default LiveClassesDashboard;
