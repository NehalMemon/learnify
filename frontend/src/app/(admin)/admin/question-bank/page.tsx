'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowRight,
  Database,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  getBankQuestions,
  type BankQuestion,
} from '@/app/actions/questionBankActions';
import {
  getCategoriesWithSubjects,
  type QuizCategoryWithSubjects,
} from '@/app/actions/taxonomyActions';
import { Spinner } from '@/components/ui/Spinner';

function getRelationName(relation?: { name?: string | null } | { name?: string | null }[] | null): string {
  if (!relation) return '';
  if (Array.isArray(relation)) return relation[0]?.name || '';
  return relation.name || '';
}

interface CategoryVaultStat {
  categoryId: string;
  categoryName: string;
  totalQuestions: number;
  uniqueSubjectsCount: number;
}

export default function QuestionBankLibraryPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [taxonomy, setTaxonomy] = useState<QuizCategoryWithSubjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gateway Modal State
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayCatId, setGatewayCatId] = useState<string>('');
  const [gatewaySubjId, setGatewaySubjId] = useState<string>('');

  const fetchTaxonomy = async () => {
    try {
      const data = await getCategoriesWithSubjects();
      setTaxonomy(data);
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
    }
  };

  const fetchQuestions = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);

    try {
      const [data] = await Promise.all([getBankQuestions(), fetchTaxonomy()]);
      setQuestions(data);
    } catch {
      setError('Failed to load question bank entries');
      setQuestions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const gatewayAvailableSubjects = useMemo(() => {
    if (!gatewayCatId) return [];
    const cat = taxonomy.find((c) => c.id === gatewayCatId);
    return cat ? cat.subjects : [];
  }, [taxonomy, gatewayCatId]);

  // Data Transformation: Compute stats per Category
  const categoryVaults = useMemo(() => {
    // Map category ID/Name -> stats
    const map = new Map<string, { categoryId: string; categoryName: string; questionCount: number; subjectIds: Set<string> }>();

    // Seed taxonomy categories first so empty categories show zero stats
    taxonomy.forEach((cat) => {
      map.set(cat.id, {
        categoryId: cat.id,
        categoryName: cat.name,
        questionCount: 0,
        subjectIds: new Set(cat.subjects.map((s) => s.id)),
      });
    });

    // Populate question stats
    questions.forEach((q) => {
      const catName = getRelationName(q.category) || 'General Category';
      const catId = q.category_id || taxonomy.find((c) => c.name === catName)?.id || catName;

      let entry = map.get(catId);
      if (!entry) {
        entry = {
          categoryId: catId,
          categoryName: catName,
          questionCount: 0,
          subjectIds: new Set(),
        };
        map.set(catId, entry);
      }

      entry.questionCount += 1;
      if (q.subject_id) {
        entry.subjectIds.add(q.subject_id);
      } else {
        const subjName = getRelationName(q.subject);
        if (subjName) entry.subjectIds.add(subjName);
      }
    });

    const result: CategoryVaultStat[] = [];
    map.forEach((value) => {
      result.push({
        categoryId: value.categoryId,
        categoryName: value.categoryName,
        totalQuestions: value.questionCount,
        uniqueSubjectsCount: value.subjectIds.size,
      });
    });

    return result;
  }, [questions, taxonomy]);

  const handleStartBuilding = () => {
    if (!gatewayCatId) {
      toast.error('Please select a target Category first.');
      return;
    }

    const params = new URLSearchParams();
    params.set('categoryId', gatewayCatId);
    if (gatewaySubjId) {
      params.set('subjectId', gatewaySubjId);
    }

    router.push(`/admin/question-bank/builder?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl pb-12 font-sans text-[#191c1e] antialiased">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#191c1e] md:text-4xl">
            Question Bank Library
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b5a68]">
            Master Category Vaults — Select a category vault to view questions, filter by subjects, and manage bank content.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fetchQuestions({ silent: true })}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 py-2 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Library
          </button>

          <button
            type="button"
            onClick={() => {
              setGatewayCatId('');
              setGatewaySubjId('');
              setIsGatewayModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add to Bank
          </button>
        </div>
      </div>

      {/* Main Vault Grid Container */}
      <div className="w-full">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : categoryVaults.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cfd1dc] bg-white p-12 text-center shadow-xs">
            <Database className="mx-auto h-10 w-10 text-[#8d8b99]" />
            <h3 className="mt-4 text-base font-bold text-[#191c1e]">No category vaults found</h3>
            <p className="mt-1 text-xs leading-5 text-[#696778]">
              Start populating the master question bank by adding your first entry.
            </p>
            <button
              type="button"
              onClick={() => {
                setGatewayCatId('');
                setGatewaySubjId('');
                setIsGatewayModalOpen(true);
              }}
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f20b8] whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Add to Bank
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[#696778]">
                Displaying {categoryVaults.length} Category Vault{categoryVaults.length === 1 ? '' : 's'} ({questions.length} total questions)
              </span>
            </div>

            {/* Clean Grid of Category Vault Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryVaults.map((vault) => {
                const openUrl = `/admin/question-bank/view?categoryId=${encodeURIComponent(vault.categoryId)}`;

                return (
                  <div
                    key={vault.categoryId}
                    className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      {/* Top Row: Icon & Category Name */}
                      <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3525cd]/10 text-[#3525cd]">
                            <Layers className="h-6 w-6" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-[#191c1e] line-clamp-1">
                              {vault.categoryName}
                            </h2>
                            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 mt-0.5 border border-slate-200">
                              Master Vault
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Clean Minimal Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100 my-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Total Questions
                          </p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {vault.totalQuestions}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Subjects
                          </p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {vault.uniqueSubjectsCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex justify-end pt-2">
                      <Link
                        href={openUrl}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#3525cd] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2f20b8]"
                      >
                        <span>Open Vault</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Gateway Modal for Mass Entry Builder */}
      {isGatewayModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-[#eceef5]">
            <div className="flex items-center justify-between border-b border-[#eceef5] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e]">Mass Question Builder</h3>
                  <p className="text-xs text-[#696778]">Select target Category & Subject to begin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGatewayModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777586] transition hover:bg-[#f7f7fb] hover:text-[#191c1e]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Target Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={gatewayCatId}
                  onChange={(e) => {
                    setGatewayCatId(e.target.value);
                    setGatewaySubjId('');
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="">Select Category...</option>
                  {taxonomy.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Target Subject <span className="text-[#777586] font-normal">(Optional)</span>
                </label>
                <select
                  value={gatewaySubjId}
                  onChange={(e) => setGatewaySubjId(e.target.value)}
                  disabled={!gatewayCatId || gatewayAvailableSubjects.length === 0}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white disabled:opacity-50"
                >
                  <option value="">All / No Specific Subject</option>
                  {gatewayAvailableSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#eceef5]">
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="min-h-10 rounded-xl border border-[#dadce5] bg-white px-4 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartBuilding}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-5 text-xs font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
                >
                  Start Building →
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
