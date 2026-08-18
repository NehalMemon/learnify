'use client';

import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import type { ClassFilters, ClassStatus } from '@/types/class';

interface ClassHeaderProps {
  filters: ClassFilters;
  onFilterChange: (filters: ClassFilters) => void;
  totalClassesCount: number;
}

export function ClassHeader({
  filters,
  onFilterChange,
  totalClassesCount,
}: ClassHeaderProps) {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      statusFilter: e.target.value as 'ALL' | ClassStatus,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Classes
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#3525cd]/10 px-2.5 py-0.5 text-xs font-semibold text-[#3525cd]">
              {totalClassesCount} total
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Create, manage, and organize interactive classes for your students.
          </p>
        </div>

        <Link
          href="/admin/classes/builder/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#3525cd]/20 transition-all hover:bg-[#2d1db7] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#3525cd]/30 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create New Class
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={handleSearch}
            placeholder="Search classes by title, instructor, or category..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all"
          />
        </div>

        <div className="relative sm:w-48">
          <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={filters.statusFilter}
            onChange={handleStatusChange}
            aria-label="Filter by status"
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-700 focus:border-[#3525cd] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>
    </div>
  );
}
