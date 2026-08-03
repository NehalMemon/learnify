'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  FolderPlus,
  BookOpen,
  Check,
  Tag,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getCategoriesWithSubjects,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubject,
  updateSubject,
  deleteSubject,
  type QuizCategoryWithSubjects,
  type QuizSubject,
} from '@/app/actions/taxonomyActions';

interface TaxonomyManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTaxonomyChange?: () => void;
  isInline?: boolean;
}

export function TaxonomyManager({
  isOpen = true,
  onClose,
  onTaxonomyChange,
  isInline = false,
}: TaxonomyManagerProps) {
  const [categories, setCategories] = useState<QuizCategoryWithSubjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set());

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Edit Category State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // New Subject Form State (mapped by categoryId)
  const [newSubjMap, setNewSubjMap] = useState<Record<string, { name: string; code: string }>>({});
  const [isCreatingSubjectMap, setIsCreatingSubjectMap] = useState<Record<string, boolean>>({});

  // Edit Subject State
  const [editingSubjId, setEditingSubjId] = useState<string | null>(null);
  const [editSubjName, setEditSubjName] = useState('');
  const [editSubjCode, setEditSubjCode] = useState('');
  const [isUpdatingSubject, setIsUpdatingSubject] = useState(false);

  const fetchTaxonomy = async () => {
    setIsLoading(true);
    try {
      const data = await getCategoriesWithSubjects();
      setCategories(data);
    } catch {
      toast.error('Failed to load taxonomy.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInline || isOpen) {
      fetchTaxonomy();
    }
  }, [isInline, isOpen]);

  if (!isInline && !isOpen) return null;

  const toggleExpand = (catId: string) => {
    setExpandedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  /* ── Category Handlers ────────────────────────────────────────── */

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Category name is required');
      return;
    }
    setIsCreatingCategory(true);
    try {
      await createCategory(newCatName);
      toast.success('Category created!');
      setNewCatName('');
      await fetchTaxonomy();
      onTaxonomyChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const startEditCategory = (cat: QuizCategoryWithSubjects) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
  };

  const handleUpdateCategory = async (catId: string) => {
    if (!editCatName.trim()) {
      toast.error('Category name is required');
      return;
    }
    setIsUpdatingCategory(true);
    try {
      await updateCategory(catId, editCatName);
      toast.success('Category updated!');
      setEditingCatId(null);
      await fetchTaxonomy();
      onTaxonomyChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Delete category "${catName}" and all its subjects?`)) return;
    try {
      await deleteCategory(catId);
      toast.success('Category deleted!');
      await fetchTaxonomy();
      onTaxonomyChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  /* ── Subject Handlers ─────────────────────────────────────────── */

  const handleCreateSubject = async (e: React.FormEvent, catId: string) => {
    e.preventDefault();
    const subjData = newSubjMap[catId] || { name: '', code: '' };
    if (!subjData.name.trim() || !subjData.code.trim()) {
      toast.error('Subject name and code are required');
      return;
    }
    setIsCreatingSubjectMap((prev) => ({ ...prev, [catId]: true }));
    try {
      await createSubject(catId, subjData.name.trim(), subjData.code.trim());
      toast.success('Subject added!');
      setNewSubjMap((prev) => ({ ...prev, [catId]: { name: '', code: '' } }));
      await fetchTaxonomy();
      onTaxonomyChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add subject');
    } finally {
      setIsCreatingSubjectMap((prev) => ({ ...prev, [catId]: false }));
    }
  };

  const startEditSubject = (subj: QuizSubject) => {
    setEditingSubjId(subj.id);
    setEditSubjName(subj.name);
    setEditSubjCode(subj.code || '');
  };

  const handleUpdateSubject = async (subjId: string) => {
    if (!editSubjName.trim() || !editSubjCode.trim()) {
      toast.error('Subject name and code are required');
      return;
    }
    setIsUpdatingSubject(true);
    try {
      await updateSubject(subjId, editSubjName.trim(), editSubjCode.trim());
      toast.success('Subject updated!');
      setEditingSubjId(null);
      await fetchTaxonomy();
      onTaxonomyChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subject');
    } finally {
      setIsUpdatingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjId: string, subjName: string) => {
    if (!window.confirm(`Delete subject "${subjName}"?`)) return;
    try {
      await deleteSubject(subjId);
      toast.success('Subject deleted!');
      await fetchTaxonomy();
      onTaxonomyChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete subject');
    }
  };

  const bodyContent = (
    <div className="space-y-6">
      {/* Create New Category Card */}
      <div className="rounded-xl border border-[#e4e6ef] bg-[#fbfbfd] p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#3525cd]">
          Create New Category
        </h3>
        <form onSubmit={handleCreateCategory} className="mt-3 flex items-center gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name (e.g. Cardiology)"
            className="flex-1 rounded-xl border border-[#dadce5] bg-white px-3.5 py-2.5 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/10"
          />
          <button
            type="submit"
            disabled={isCreatingCategory}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#3525cd] px-5 text-xs font-semibold text-white transition hover:bg-[#2f20b8] disabled:opacity-60 shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </form>
      </div>

      {/* Category Accordion List */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#696778]">
          Existing Categories ({categories.length})
        </h3>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-[#e4e6ef] bg-white text-sm text-[#696778]">
            Loading taxonomy...
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dadce5] bg-white p-8 text-center text-sm text-[#696778]">
            No categories found. Create one above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const isExpanded = expandedCatIds.has(cat.id);
              const isEditing = editingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white shadow-sm transition"
                >
                  {/* Category Header Row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#eceef5]">
                    <div className="flex flex-1 items-center gap-3 min-w-0 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cat.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dadce5] text-[#5b5a68] transition hover:bg-[#f7f7fb]"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-[#3525cd]" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 rounded-lg border border-[#3525cd] bg-white px-3 py-1 text-sm font-semibold text-[#191c1e] outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={isUpdatingCategory}
                            onClick={() => handleUpdateCategory(cat.id)}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#3525cd] px-3 text-xs font-semibold text-white transition hover:bg-[#2f20b8]"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#dadce5] px-3 text-xs font-semibold text-[#5b5a68] transition hover:bg-[#f7f7fb]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm font-bold text-[#191c1e] truncate">
                            {cat.name}
                          </span>
                          <span className="rounded-full bg-[#f1f0ff] px-2 py-0.5 text-[10px] font-bold text-[#3525cd]">
                            {cat.subjects.length} subject{cat.subjects.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditCategory(cat)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5b5a68] transition hover:bg-[#f7f7fb] hover:text-[#3525cd]"
                          title="Edit Category"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5b5a68] transition hover:bg-red-50 hover:text-red-600"
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Subjects Area */}
                  {isExpanded ? (
                    <div className="bg-[#fbfbfd] p-4 border-t border-[#eceef5] space-y-4">
                      {/* Subjects List */}
                      <div>
                        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#777586]">
                          Subjects in {cat.name}
                        </h4>

                        {cat.subjects.length === 0 ? (
                          <p className="text-xs text-[#8d8b99] italic py-1">
                            No subjects created yet for this category.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {cat.subjects.map((subj) => {
                              const isSubjEditing = editingSubjId === subj.id;

                              return (
                                <div
                                  key={subj.id}
                                  className="flex items-center justify-between rounded-lg border border-[#e4e6ef] bg-white px-3 py-2 shadow-xs"
                                >
                                  {isSubjEditing ? (
                                    <div className="flex items-center gap-2 flex-1 mr-2">
                                      <input
                                        type="text"
                                        value={editSubjName}
                                        onChange={(e) => setEditSubjName(e.target.value)}
                                        placeholder="Subject name"
                                        className="flex-1 rounded-lg border border-[#3525cd] bg-white px-2.5 py-1 text-xs font-semibold text-[#191c1e] outline-none"
                                        autoFocus
                                      />
                                      <input
                                        type="text"
                                        value={editSubjCode}
                                        onChange={(e) => setEditSubjCode(e.target.value)}
                                        placeholder="Code (optional)"
                                        className="w-24 rounded-lg border border-[#dadce5] bg-white px-2 py-1 text-xs text-[#5b5a68] outline-none"
                                      />
                                      <button
                                        type="button"
                                        disabled={isUpdatingSubject}
                                        onClick={() => handleUpdateSubject(subj.id)}
                                        className="inline-flex h-7 items-center justify-center rounded-lg bg-[#3525cd] px-2.5 text-xs font-semibold text-white transition hover:bg-[#2f20b8]"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubjId(null)}
                                        className="inline-flex h-7 items-center justify-center rounded-lg border border-[#dadce5] px-2.5 text-xs font-semibold text-[#5b5a68] transition hover:bg-[#f7f7fb]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Tag className="h-3.5 w-3.5 text-[#3525cd] shrink-0" />
                                      <span className="text-xs font-bold text-[#191c1e] truncate">
                                        {subj.name}
                                      </span>
                                      {subj.code && (
                                        <span className="rounded bg-[#f1f0ff] px-1.5 py-0.5 text-[9px] font-bold text-[#3525cd]">
                                          {subj.code}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {!isSubjEditing && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => startEditSubject(subj)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#5b5a68] transition hover:bg-[#f7f7fb] hover:text-[#3525cd]"
                                        title="Edit Subject"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSubject(subj.id, subj.name)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#5b5a68] transition hover:bg-red-50 hover:text-red-600"
                                        title="Delete Subject"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Add Subject Form */}
                      <form
                        onSubmit={(e) => handleCreateSubject(e, cat.id)}
                        className="flex items-center gap-2 pt-2 border-t border-[#eceef5]"
                      >
                        <input
                          type="text"
                          value={newSubjMap[cat.id]?.name || ''}
                          onChange={(e) =>
                            setNewSubjMap((prev) => ({
                              ...prev,
                              [cat.id]: {
                                name: e.target.value,
                                code: prev[cat.id]?.code || '',
                              },
                            }))
                          }
                          placeholder={`Add subject to ${cat.name}...`}
                          className="flex-1 rounded-xl border border-[#dadce5] bg-white px-3 py-1.5 text-xs text-[#191c1e] outline-none placeholder:text-[#8d8b99] focus:border-[#3525cd]"
                        />
                        <input
                          type="text"
                          value={newSubjMap[cat.id]?.code || ''}
                          onChange={(e) =>
                            setNewSubjMap((prev) => ({
                              ...prev,
                              [cat.id]: {
                                name: prev[cat.id]?.name || '',
                                code: e.target.value,
                              },
                            }))
                          }
                          placeholder="Code (opt)"
                          className="w-20 rounded-xl border border-[#dadce5] bg-white px-2.5 py-1.5 text-xs text-[#191c1e] outline-none placeholder:text-[#8d8b99] focus:border-[#3525cd]"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleCreateSubject(e, cat.id)}
                          disabled={isCreatingSubjectMap[cat.id]}
                          className="inline-flex min-h-8 items-center justify-center gap-1 rounded-xl bg-[#3525cd] px-3 text-xs font-semibold text-white transition hover:bg-[#2f20b8] disabled:opacity-60 shrink-0 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Add Subject
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return bodyContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal overlay"
      />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e4e6ef] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-[#3525cd]" />
              <h2 className="text-lg font-bold text-[#191c1e]">Taxonomy Manager</h2>
            </div>
            <p className="mt-0.5 text-xs text-[#696778]">
              Manage categories and nested subjects for your quiz catalog.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce5] text-[#5b5a68] transition hover:bg-[#f7f7fb]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {bodyContent}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#e4e6ef] px-6 py-4 bg-[#fbfbfd] flex justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#dadce5] bg-white px-5 py-2 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
