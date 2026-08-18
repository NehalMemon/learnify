'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import type { ClassStatus, ClassDetailsFormData, ClassSettingsFormData } from '@/types/class';
import { BuilderHeader } from '@/components/admin/classes/builder/BuilderHeader';
import { DetailsTab } from '@/components/admin/classes/builder/DetailsTab';
import { CurriculumTab } from '@/components/admin/classes/builder/CurriculumTab';
import { SettingsTab } from '@/components/admin/classes/builder/SettingsTab';
import { FileText, Layers, Settings } from 'lucide-react';

type TabType = 'details' | 'curriculum' | 'settings';

interface ClassBuilderPageProps {
  params: Promise<{ id: string }>;
}

export default function ClassBuilderPage({ params }: ClassBuilderPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [status, setStatus] = useState<ClassStatus>('DRAFT');
  const [isSaving, setIsSaving] = useState(false);

  const [detailsData, setDetailsData] = useState<ClassDetailsFormData>({
    title: isNew ? '' : 'Advanced Clinical Cardiology & ECG Interpretation',
    description: isNew ? '' : 'Comprehensive guide to reading complex ECG patterns.',
    category: 'Clinical Practice',
    thumbnailUrl: undefined,
  });

  const [settingsData, setSettingsData] = useState<ClassSettingsFormData>({
    enrollmentLimit: 150,
    isFree: false,
    priceAmount: 149,
    prerequisites: ['Basic ECG Knowledge'],
  });

  const handleSaveDraft = async () => {
    setIsSaving(true);
    // Simulate backend call
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatus('DRAFT');
    setIsSaving(false);
    alert('Class draft saved successfully!');
  };

  const handlePublish = async () => {
    if (!detailsData.title.trim()) {
      alert('Please enter a class title before publishing.');
      setActiveTab('details');
      return;
    }
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatus('PUBLISHED');
    setIsSaving(false);
    alert('Class published successfully!');
    router.push('/admin/classes');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <BuilderHeader
        classTitle={detailsData.title}
        status={status}
        isSaving={isSaving}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />

      <main className="p-6 lg:p-8 space-y-6">
        <div className="mx-auto max-w-4xl border-b border-gray-200">
          <nav className="flex gap-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all ${
                activeTab === 'details'
                  ? 'border-[#3525cd] text-[#3525cd]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              Details
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all ${
                activeTab === 'curriculum'
                  ? 'border-[#3525cd] text-[#3525cd]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              Curriculum
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'border-[#3525cd] text-[#3525cd]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </nav>
        </div>

        <div className="pt-2">
          {activeTab === 'details' && (
            <DetailsTab data={detailsData} onChange={setDetailsData} />
          )}

          {activeTab === 'curriculum' && <CurriculumTab />}

          {activeTab === 'settings' && (
            <SettingsTab data={settingsData} onChange={setSettingsData} />
          )}
        </div>
      </main>
    </div>
  );
}
