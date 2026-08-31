'use client';

import type { ClassItem } from '@/types/class';
import { ClassRowActions } from './ClassRowActions';
import { Layers, Calendar, User } from 'lucide-react';

interface ClassTableProps {
  classes: ClassItem[];
  onEdit: (classItem: ClassItem) => void;
  onDuplicate: (classItem: ClassItem) => void;
  onDelete: (classItem: ClassItem) => void;
}

export function ClassTable({
  classes,
  onEdit,
  onDuplicate,
  onDelete,
}: ClassTableProps) {
  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3525cd]/10 text-[#3525cd]">
          <Layers className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-gray-900">No classes found</h3>
        <p className="mt-1.5 text-sm text-gray-500 max-w-sm">
          No classes match your current search and filter criteria. Try resetting your filters or create a new class.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th scope="col" className="px-6 py-3.5 font-semibold">Title</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Instructor</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Date Created</th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-normal">
            {classes.map((cls) => (
              <tr key={cls.id} className="group hover:bg-gray-50/60 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {cls.thumbnailUrl ? (
                      <img
                        src={cls.thumbnailUrl}
                        alt=""
                        className="h-10 w-14 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                        <Layers className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-gray-900 group-hover:text-[#3525cd] transition-colors">
                        {cls.title}
                      </span>
                      <p className="text-xs text-gray-400">{cls.category}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span>{cls.instructorName}</span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  {cls.status === 'PUBLISHED' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Draft
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>{new Date(cls.createdAt).toLocaleDateString()}</span>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <ClassRowActions
                    classItem={cls}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
