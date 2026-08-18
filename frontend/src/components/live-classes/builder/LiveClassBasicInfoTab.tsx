'use client';

import { BookOpen, User, Users, Image as ImageIcon, Upload, Check } from 'lucide-react';

export interface BasicInfoFormData {
  title: string;
  description: string;
  courseId: string;
  teacherId: string;
  studentIds: string[];
  thumbnailUrl?: string;
}

interface LiveClassBasicInfoTabProps {
  data: BasicInfoFormData;
  courses: { id: string; title: string }[];
  availableTeachers: { id: string; name: string }[];
  availableStudents: { id: string; name: string }[];
  onChange: (data: BasicInfoFormData) => void;
}

export function LiveClassBasicInfoTab({
  data,
  courses,
  availableTeachers,
  availableStudents,
  onChange,
}: LiveClassBasicInfoTabProps) {
  const toggleStudent = (id: string) => {
    const next = data.studentIds.includes(id)
      ? data.studentIds.filter((s) => s !== id)
      : [...data.studentIds, id];
    onChange({ ...data, studentIds: next });
  };

  const toggleSelectAll = () => {
    const all = data.studentIds.length === availableStudents.length;
    onChange({ ...data, studentIds: all ? [] : availableStudents.map((s) => s.id) });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Class Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="e.g. MDCAT Biology — Nervous System Live Seminar"
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Course Association <span className="text-red-500">*</span>
            </label>
            <select
              value={data.courseId}
              onChange={(e) => onChange({ ...data, courseId: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
            >
              <option value="">— Select course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Assigned Teacher <span className="text-red-500">*</span>
            </label>
            <select
              value={data.teacherId}
              onChange={(e) => onChange({ ...data, teacherId: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
            >
              <option value="">— Select teacher —</option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Description & Learning Objectives
          </label>
          <textarea
            rows={3}
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Detailed agenda or instructions for attendees..."
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Enrolled Student Roster ({data.studentIds.length} / {availableStudents.length})
            </label>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-bold text-purple-600 hover:underline"
            >
              {data.studentIds.length === availableStudents.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-2 space-y-1">
            {availableStudents.map((student) => {
              const isSelected = data.studentIds.includes(student.id);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isSelected ? 'bg-purple-100/80 text-purple-900 font-semibold' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{student.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-purple-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
