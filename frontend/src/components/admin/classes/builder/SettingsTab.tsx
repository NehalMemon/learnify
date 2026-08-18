'use client';

import { useState } from 'react';
import { Plus, X, Users, DollarSign, BookOpen } from 'lucide-react';
import type { ClassSettingsFormData } from '@/types/class';

interface SettingsTabProps {
  data: ClassSettingsFormData;
  onChange: (data: ClassSettingsFormData) => void;
}

export function SettingsTab({ data, onChange }: SettingsTabProps) {
  const [newPrereq, setNewPrereq] = useState('');

  const handleAddPrerequisite = () => {
    if (!newPrereq.trim()) return;
    onChange({
      ...data,
      prerequisites: [...data.prerequisites, newPrereq.trim()],
    });
    setNewPrereq('');
  };

  const handleRemovePrerequisite = (index: number) => {
    onChange({
      ...data,
      prerequisites: data.prerequisites.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-[#3525cd]" />
            <h3 className="text-sm font-bold text-gray-900">Pricing & Access</h3>
          </div>
          
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <div>
              <span className="text-sm font-semibold text-gray-900">Free Access</span>
              <p className="text-xs text-gray-500">Allow any enrolled student to join this class without payment.</p>
            </div>
            <input
              type="checkbox"
              checked={data.isFree}
              onChange={(e) => onChange({ ...data, isFree: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#3525cd] focus:ring-[#3525cd]/20"
            />
          </div>

          {!data.isFree && (
            <div className="mt-4">
              <label htmlFor="price" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Price (USD)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                value={data.priceAmount}
                onChange={(e) => onChange({ ...data, priceAmount: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10"
              />
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[#3525cd]" />
            <h3 className="text-sm font-bold text-gray-900">Enrollment Limit</h3>
          </div>
          <input
            type="number"
            min="0"
            value={data.enrollmentLimit || ''}
            onChange={(e) => onChange({ ...data, enrollmentLimit: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g. 100 (Leave blank for unlimited)"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10"
          />
        </div>

        <hr className="border-gray-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-[#3525cd]" />
            <h3 className="text-sm font-bold text-gray-900">Class Prerequisites</h3>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newPrereq}
              onChange={(e) => setNewPrereq(e.target.value)}
              placeholder="Add a required course or prerequisite..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPrerequisite())}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10"
            />
            <button
              type="button"
              onClick={handleAddPrerequisite}
              className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              Add
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.prerequisites.map((req, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {req}
                <button type="button" onClick={() => handleRemovePrerequisite(idx)}>
                  <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
