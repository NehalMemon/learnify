'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createLiveClass, updateLiveClass } from '@/actions/live-class';
import type { LiveClass, ClassStatus, CreateLiveClassPayload } from '@/types/live-class';
import { LiveClassBuilderHeader } from './LiveClassBuilderHeader';
import { LiveClassBasicInfoTab, type BasicInfoFormData } from './LiveClassBasicInfoTab';
import { LiveClassContentCurriculumTab, type ContentCurriculumFormData } from './LiveClassContentCurriculumTab';
import { LiveClassSettingsTab, type SettingsFormData } from './LiveClassSettingsTab';
import { Info, Calendar, Settings } from 'lucide-react';

type TabType = 'basic' | 'content' | 'settings';

interface TabbedLiveClassBuilderProps {
  courses: { id: string; title: string }[];
  availableTeachers: { id: string; name: string }[];
  availableStudents: { id: string; name: string }[];
  initialData?: LiveClass | null;
}

export function TabbedLiveClassBuilder({
  courses,
  availableTeachers,
  availableStudents,
  initialData,
}: TabbedLiveClassBuilderProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ClassStatus>(initialData?.status ?? 'SCHEDULED');

  const [basicData, setBasicData] = useState<BasicInfoFormData>({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    courseId: initialData?.course_id ?? (courses[0]?.id || ''),
    teacherId: initialData?.teacher_id ?? (availableTeachers[0]?.id || ''),
    studentIds: initialData?.student_ids ?? [],
  });

  const [contentData, setContentData] = useState<ContentCurriculumFormData>({
    startTime: initialData?.start_time ? initialData.start_time.slice(0, 16) : '',
    endTime: initialData?.end_time ? initialData.end_time.slice(0, 16) : '',
    recurrence: initialData?.recurrence ?? 'NONE',
    recurrenceDays: initialData?.recurrence_days ?? [],
    autoGenerateMeetLink: true,
  });

  const [settingsData, setSettingsData] = useState<SettingsFormData>({
    visibility: 'ENROLLED_ONLY',
    allowChat: true,
    muteOnEntry: true,
    reminderMinutesBefore: 15,
  });

  const validate = (): boolean => {
    if (!basicData.title.trim()) {
      toast.error('Class title is required.');
      setActiveTab('basic');
      return false;
    }
    if (!basicData.courseId) {
      toast.error('Please select a course.');
      setActiveTab('basic');
      return false;
    }
    if (!basicData.teacherId) {
      toast.error('Please assign a teacher.');
      setActiveTab('basic');
      return false;
    }
    if (!contentData.startTime || !contentData.endTime) {
      toast.error('Start and End times are required.');
      setActiveTab('content');
      return false;
    }
    return true;
  };

  const handleSave = async (targetStatus: ClassStatus) => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: CreateLiveClassPayload = {
      course_id: basicData.courseId,
      title: basicData.title.trim(),
      description: basicData.description.trim() || undefined,
      teacher_id: basicData.teacherId,
      student_ids: basicData.studentIds,
      start_time: contentData.startTime,
      end_time: contentData.endTime,
      recurrence: contentData.recurrence,
      recurrence_days: contentData.recurrenceDays,
    };

    try {
      let result;
      if (initialData?.id) {
        result = await updateLiveClass(initialData.id, { ...payload, status: targetStatus });
      } else {
        result = await createLiveClass(payload);
      }

      if (!result.success) {
        toast.error(result.error || 'Failed to save live class.');
        return;
      }

      toast.success(initialData?.id ? 'Class updated!' : 'Class scheduled & published!');
      router.push('/admin/live-classes');
    } catch {
      toast.error('An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <LiveClassBuilderHeader
        title={basicData.title}
        status={status}
        isSubmitting={isSubmitting}
        isEditMode={Boolean(initialData?.id)}
        onSaveDraft={() => handleSave('SCHEDULED')}
        onPublish={() => handleSave('SCHEDULED')}
      />

      <main className="p-6 lg:p-8 space-y-6">
        <div className="mx-auto max-w-4xl border-b border-gray-200">
          <nav className="flex gap-8" aria-label="Builder tabs">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all ${
                activeTab === 'basic'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Info className="h-4 w-4" />
              Tab 1: Basic Info
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all ${
                activeTab === 'content'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Tab 2: Content & Schedule
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Settings className="h-4 w-4" />
              Tab 3: Settings
            </button>
          </nav>
        </div>

        <div className="pt-2">
          {activeTab === 'basic' && (
            <LiveClassBasicInfoTab
              data={basicData}
              courses={courses}
              availableTeachers={availableTeachers}
              availableStudents={availableStudents}
              onChange={setBasicData}
            />
          )}

          {activeTab === 'content' && (
            <LiveClassContentCurriculumTab
              data={contentData}
              onChange={setContentData}
            />
          )}

          {activeTab === 'settings' && (
            <LiveClassSettingsTab
              data={settingsData}
              onChange={setSettingsData}
            />
          )}
        </div>
      </main>
    </div>
  );
}
