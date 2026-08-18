'use client';

import { Upload, Image as ImageIcon } from 'lucide-react';
import type { ClassCategory, ClassDetailsFormData } from '@/types/class';

const CATEGORIES: ClassCategory[] = [
  'Foundation Medical',
  'Clinical Practice',
  'Pharmacology',
  'Surgical Skills',
  'General Education',
];

interface DetailsTabProps {
  data: ClassDetailsFormData;
  onChange: (data: ClassDetailsFormData) => void;
}

export function DetailsTab({ data, onChange }: DetailsTabProps) {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeUrl = URL.createObjectURL(file);
      onChange({ ...data, thumbnailUrl: fakeUrl });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label htmlFor="class-title" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Class Title <span className="text-red-500">*</span>
          </label>
          <input
            id="class-title"
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="e.g. Advanced Clinical Cardiology & ECG Interpretation"
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all"
          />
        </div>

        <div>
          <label htmlFor="class-category" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="class-category"
            value={data.category}
            onChange={(e) => onChange({ ...data, category: e.target.value as ClassCategory })}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="class-desc" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Class Description
          </label>
          <textarea
            id="class-desc"
            rows={4}
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Provide a comprehensive summary of what students will learn in this class..."
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all"
          />
        </div>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Thumbnail Image
          </span>
          <div className="mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 transition-all hover:bg-gray-50">
            {data.thumbnailUrl ? (
              <div className="relative group overflow-hidden rounded-xl border border-gray-200">
                <img src={data.thumbnailUrl} alt="Thumbnail preview" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onChange({ ...data, thumbnailUrl: undefined })}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3525cd] shadow-sm border border-gray-200">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-medium text-gray-700">Click to upload thumbnail</p>
                <p className="text-[11px] text-gray-400">PNG, JPG, or WEBP up to 5MB</p>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
