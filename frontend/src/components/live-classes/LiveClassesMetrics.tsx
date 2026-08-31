'use client';

import { Video, Calendar, Radio, CheckCircle, XCircle } from 'lucide-react';
import type { LiveClassRow } from '@/types/live-class';

interface LiveClassesMetricsProps {
  liveClasses: LiveClassRow[];
}

export function LiveClassesMetrics({ liveClasses }: LiveClassesMetricsProps) {
  const total = liveClasses.length;
  const scheduled = liveClasses.filter((c) => c.status === 'SCHEDULED').length;
  const live = liveClasses.filter((c) => c.status === 'LIVE').length;
  const completed = liveClasses.filter((c) => c.status === 'COMPLETED').length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{total}</p>
          <p className="text-xs font-medium text-gray-500">Total Classes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{scheduled}</p>
          <p className="text-xs font-medium text-gray-500">Scheduled</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Radio className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-emerald-700">{live}</p>
          <p className="text-xs font-medium text-gray-500">Live Now</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{completed}</p>
          <p className="text-xs font-medium text-gray-500">Completed</p>
        </div>
      </div>
    </div>
  );
}
