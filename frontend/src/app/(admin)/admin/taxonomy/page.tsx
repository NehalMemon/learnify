'use client';

import React from 'react';
import { TaxonomyManager } from '@/components/admin/dashboard/TaxonomyManager';
import { FolderTree } from 'lucide-react';

export default function AdminTaxonomyPage() {
  return (
    <div className="mx-auto w-full max-w-7xl pb-10 font-sans text-[#191c1e] antialiased">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-[#3525cd]" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            Admin Console
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#191c1e] md:text-4xl">
          Taxonomy Manager
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[#5b5a68]">
          Manage global quiz categories, subjects, and topics across Learnify.
        </p>
      </div>

      {/* ── Taxonomy Manager Container ─────────────────────────────── */}
      <div className="rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-sm">
        <TaxonomyManager isInline={true} />
      </div>
    </div>
  );
}
