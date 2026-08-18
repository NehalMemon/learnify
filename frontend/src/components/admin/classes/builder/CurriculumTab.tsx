'use client';

import { useState } from 'react';
import { Plus, GripVertical, Video, FileText, HelpCircle, FolderPlus, Trash2 } from 'lucide-react';
import type { ClassModule } from '@/types/class';

const SAMPLE_MODULES: ClassModule[] = [
  {
    id: 'mod-1',
    title: 'Module 1: Foundations of Clinical Assessment',
    description: 'Overview of physiological signals and baseline diagnostic tools.',
    order: 1,
    lessons: [
      { id: 'les-1', title: '1.1 Introduction to Cardiac Conduction System', durationMinutes: 15, type: 'video', isPreviewAllowed: true },
      { id: 'les-2', title: '1.2 Standard 12-Lead ECG Placement Protocol', durationMinutes: 20, type: 'article', isPreviewAllowed: false },
    ],
  },
  {
    id: 'mod-[#]',
    title: 'Module 2: Pathophysiology & Advanced Analysis',
    description: 'Identifying ischemic changes, bundle branch blocks, and arrhythmia.',
    order: 2,
    lessons: [
      { id: 'les-3', title: '2.1 ST-Segment Elevation Recognition', durationMinutes: 25, type: 'video', isPreviewAllowed: false },
      { id: 'les-4', title: '2.2 Module Quiz & Case Study Review', durationMinutes: 10, type: 'quiz', isPreviewAllowed: false },
    ],
  },
];

export function CurriculumTab() {
  const [modules, setModules] = useState<ClassModule[]>(SAMPLE_MODULES);

  const handleAddModule = () => {
    const newMod: ClassModule = {
      id: `mod-${Date.now()}`,
      title: `Module ${modules.length + 1}: New Module Title`,
      order: modules.length + 1,
      lessons: [],
    };
    setModules((prev) => [...prev, newMod]);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Curriculum & Structure</h2>
          <p className="text-xs text-gray-500">Organize your class modules and interactive lesson content.</p>
        </div>
        <button
          type="button"
          onClick={handleAddModule}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3525cd]/10 px-3.5 py-2 text-xs font-semibold text-[#3525cd] transition-all hover:bg-[#3525cd]/20"
        >
          <FolderPlus className="h-4 w-4" />
          Add New Module
        </button>
      </div>

      <div className="space-y-4">
        {modules.map((mod, idx) => (
          <div key={mod.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                <h3 className="font-semibold text-gray-900 text-sm">{mod.title}</h3>
              </div>
              <span className="text-xs font-medium text-gray-400">{mod.lessons.length} lessons</span>
            </div>

            <div className="pl-7 space-y-2">
              {mod.lessons.map((les) => (
                <div key={les.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2.5">
                    {les.type === 'video' && <Video className="h-3.5 w-3.5 text-blue-500" />}
                    {les.type === 'article' && <FileText className="h-3.5 w-3.5 text-emerald-500" />}
                    {les.type === 'quiz' && <HelpCircle className="h-3.5 w-3.5 text-purple-500" />}
                    <span className="font-medium text-gray-800">{les.title}</span>
                  </div>
                  <span className="text-gray-400">{les.durationMinutes} mins</span>
                </div>
              ))}

              <button
                type="button"
                className="inline-flex items-center gap-1.5 pt-1 text-xs font-semibold text-[#3525cd] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Lesson to {mod.title.split(':')[0]}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
