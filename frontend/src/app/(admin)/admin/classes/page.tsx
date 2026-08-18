'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ClassItem, ClassFilters } from '@/types/class';
import { ClassHeader } from '@/components/admin/classes/ClassHeader';
import { ClassTable } from '@/components/admin/classes/ClassTable';

const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'cls-1',
    title: 'Advanced Clinical Cardiology & ECG Interpretation',
    description: 'Comprehensive guide to reading complex ECG patterns and treating acute coronary syndromes.',
    instructorName: 'Dr. Sarah Jenkins',
    category: 'Clinical Practice',
    status: 'PUBLISHED',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-15T14:30:00Z',
    modulesCount: 4,
    studentsEnrolled: 142,
    isFree: false,
    priceAmount: 149,
    prerequisites: ['Basic ECG Knowledge', 'Foundation Physiology'],
  },
  {
    id: 'cls-2',
    title: 'Emergency Pharmacology & High-Alert Medications',
    description: 'Mastering dosage calculation, contraindications, and emergency drug administration protocols.',
    instructorName: 'Prof. Michael Vance',
    category: 'Pharmacology',
    status: 'DRAFT',
    createdAt: '2026-02-14T11:20:00Z',
    updatedAt: '2026-02-16T08:15:00Z',
    modulesCount: 2,
    studentsEnrolled: 0,
    isFree: true,
    priceAmount: 0,
    prerequisites: [],
  },
  {
    id: 'cls-3',
    title: 'Surgical Anatomy & Laparoscopic Techniques',
    description: 'Interactive surgical procedures, cross-sectional anatomy, and instrument mastery.',
    instructorName: 'Dr. Elena Rostova',
    category: 'Surgical Skills',
    status: 'PUBLISHED',
    createdAt: '2026-01-28T16:45:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
    modulesCount: 6,
    studentsEnrolled: 89,
    isFree: false,
    priceAmount: 199,
    prerequisites: ['Gross Anatomy'],
  },
];

export default function AdminClassesPage() {
  const router = useRouter();
  const [classesList, setClassesList] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [filters, setFilters] = useState<ClassFilters>({
    searchQuery: '',
    statusFilter: 'ALL',
  });

  const filteredClasses = classesList.filter((cls) => {
    const matchesSearch =
      cls.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      cls.instructorName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      cls.category.toLowerCase().includes(filters.searchQuery.toLowerCase());

    const matchesStatus =
      filters.statusFilter === 'ALL' || cls.status === filters.statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (classItem: ClassItem) => {
    router.push(`/admin/classes/builder/${classItem.id}`);
  };

  const handleDuplicate = (classItem: ClassItem) => {
    const duplicated: ClassItem = {
      ...classItem,
      id: `cls-${Date.now()}`,
      title: `${classItem.title} (Copy)`,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setClassesList((prev) => [duplicated, ...prev]);
  };

  const handleDelete = (classItem: ClassItem) => {
    if (confirm(`Are you sure you want to delete "${classItem.title}"?`)) {
      setClassesList((prev) => prev.filter((item) => item.id !== classItem.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8 space-y-8">
      <ClassHeader
        filters={filters}
        onFilterChange={setFilters}
        totalClassesCount={filteredClasses.length}
      />

      <ClassTable
        classes={filteredClasses}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
