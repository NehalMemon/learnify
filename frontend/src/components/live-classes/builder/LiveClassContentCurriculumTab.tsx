'use client';

import { Clock, Calendar, Video, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { RecurrenceType } from '@/types/live-class';

export interface ContentCurriculumFormData {
  startTime: string;
  endTime: string;
  recurrence: RecurrenceType;
  recurrenceDays: number[];
  autoGenerateMeetLink: boolean;
}

interface LiveClassContentCurriculumTabProps {
  data: ContentCurriculumFormData;
  onChange: (data: ContentCurriculumFormData) => void;
  teacherConnectedGoogle?: boolean;
}

export function LiveClassContentCurriculumTab({
  data,
  onChange,
  teacherConnectedGoogle = true,
}: LiveClassContentCurriculumTabProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Schedule & Duration</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={data.startTime}
                onChange={(e) => onChange({ ...data, startTime: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={data.endTime}
                onChange={(e) => onChange({ ...data, endTime: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Recurrence Rules</h3>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="recurrence"
                checked={data.recurrence === 'NONE'}
                onChange={() => onChange({ ...data, recurrence: 'NONE' })}
                className="text-purple-600 focus:ring-purple-500"
              />
              One-off Session
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="recurrence"
                checked={data.recurrence === 'WEEKLY'}
                onChange={() => onChange({ ...data, recurrence: 'WEEKLY' })}
                className="text-purple-600 focus:ring-purple-500"
              />
              Weekly Recurring Session
            </label>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Video className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Google Meet Integration</h3>
          </div>
          
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-900">Automated Google Meet Generation</span>
                <p className="text-xs text-gray-500">Automatically creates Google Meet link on teacher's calendar via background cron.</p>
              </div>
              <input
                type="checkbox"
                checked={data.autoGenerateMeetLink}
                onChange={(e) => onChange({ ...data, autoGenerateMeetLink: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </div>

            {teacherConnectedGoogle ? (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Assigned teacher has connected Google Calendar account.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Teacher has not connected Google Calendar. Link will fall back to system account.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
