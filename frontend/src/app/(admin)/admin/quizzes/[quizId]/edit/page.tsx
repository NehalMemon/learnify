"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
}

interface QuestionDraft {
  id?: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
}

/** Shape returned by the AI extraction endpoint */
interface AiQuestion {
  title: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

const CORRECT_OPTION_MAP = ["A", "B", "C", "D"] as const;

const BLANK_QUESTION: QuestionDraft = {
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  explanation: "",
};

/**
 * Normalises a raw AI question into the form's QuestionDraft shape.
 */
function aiQuestionToDraft(q: AiQuestion): QuestionDraft {
  const idx = Math.max(0, Math.min(3, q.correctOption ?? 0));
  return {
    questionText: q.title ?? "",
    optionA: q.options?.[0] ?? "",
    optionB: q.options?.[1] ?? "",
    optionC: q.options?.[2] ?? "",
    optionD: q.options?.[3] ?? "",
    correctOption: CORRECT_OPTION_MAP[idx],
    explanation: q.explanation ?? "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onRemove,
}: {
  question: QuestionDraft;
  index: number;
  total: number;
  onChange: (index: number, field: keyof QuestionDraft, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const options: ["A", "B", "C", "D"] = ["A", "B", "C", "D"];

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm p-6 transition-all hover:border-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-500">
            Question {index + 1} / {total}
          </span>
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove question ${index + 1}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-500"
          >
            ✕
          </button>
        )}
      </div>

      {/* Question Text */}
      <textarea
        required
        placeholder="Enter question text…"
        rows={2}
        value={question.questionText}
        onChange={(e) => onChange(index, "questionText", e.target.value)}
        className="mb-5 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
      />

      {/* Options grid */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <div key={opt} className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
              {opt}
            </span>
            <input
              required
              type="text"
              placeholder={`Option ${opt}`}
              value={question[`option${opt}` as keyof QuestionDraft] as string}
              onChange={(e) =>
                onChange(index, `option${opt}` as keyof QuestionDraft, e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-8 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        ))}
      </div>

      {/* Correct answer + explanation */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Correct
          </label>
          <select
            value={question.correctOption}
            onChange={(e) =>
              onChange(index, "correctOption", e.target.value as "A" | "B" | "C" | "D")
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-purple-400"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Explanation (optional)"
          value={question.explanation}
          onChange={(e) => onChange(index, "explanation", e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
        />
      </div>
    </div>
  );
}

// ─── AI Importer Dialog ───────────────────────────────────────────

function AiImporterDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: QuestionDraft[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFiles([]);
      setExtractError(null);
      setIsExtracting(false);
    }
  }, [open]);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const imageFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => {
      const combined = [...prev, ...imageFiles];
      return combined.slice(0, 10);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleExtract = async () => {
    if (files.length === 0) return;
    setIsExtracting(true);
    setExtractError(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));

    try {
      const res = await apiClient.post<{ success: boolean; data: AiQuestion[] }>(
        "/admin/quizzes/extract",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const drafts = res.data.data.map(aiQuestionToDraft);
      onImport(drafts);
      toast.success(`AI extracted ${drafts.length} questions successfully!`);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "AI extraction failed. Please try again.";
      setExtractError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-h-[85vh] overflow-y-auto border-gray-200 bg-white text-gray-900 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <span>🪄</span> AI Image Extractor
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Upload up to 10 textbook images. Gemini will extract all MCQs and
            auto-fill your quiz form.
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-purple-400 bg-purple-50"
              : "border-gray-300 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/50"
          }`}
        >
          <span className="text-3xl">🖼️</span>
          <p className="text-sm text-gray-500">
            {files.length > 0
              ? `${files.length} image${files.length !== 1 ? "s" : ""} selected — click to add more`
              : "Drag & drop images here, or click to browse"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        {files.length > 0 && (
          <ul className="mt-1 space-y-1 max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiles((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="shrink-0 text-gray-500 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {extractError && (
          <p role="alert" className="mt-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {extractError}
          </p>
        )}

        <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExtract}
            disabled={files.length === 0 || isExtracting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#A435F0] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8710D8] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isExtracting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing…
              </>
            ) : (
              "Process with AI"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const router = useRouter();
  const { quizId } = use(params);

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("60");
  const [isPublished, setIsPublished] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // ── Fetch data on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch categories and specific quiz details in parallel
        const [catRes, quizRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: Category[] }>("/quiz/categories"),
          apiClient.get<{ success: boolean; data: any }>(`/admin/quizzes/${quizId}`),
        ]);
        
        setCategories(catRes.data.data);
        const target = quizRes.data.data;

        setTitle(target.title || "");
        setCategoryId(target.categoryId || target.category?.id || "");
        setSubject(target.subject || "");
        setTimeLimitMinutes(target.durationSec ? Math.floor(target.durationSec / 60).toString() : "60");
        setIsPublished(target.isPublished ?? true);

        // Map nested questions directly into state
        const rawQuestions = target.questions || [];
        setQuestions(rawQuestions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText || "",
          optionA: q.optionA || "",
          optionB: q.optionB || "",
          optionC: q.optionC || "",
          optionD: q.optionD || "",
          correctOption: q.correctOption || "A",
          explanation: q.explanation || "",
        })));

      } catch (err: unknown) {
        setError("Failed to load quiz data. Please refresh the page.");
        console.error("[EditQuiz] Load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [quizId]);

  // ── Question mutation helpers ──────────────────────────────────
  const handleAddQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, { ...BLANK_QUESTION }]);
  }, []);

  const handleRemoveQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleQuestionChange = useCallback(
    (index: number, field: keyof QuestionDraft, value: string) => {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const handleAiImport = useCallback((aiDrafts: QuestionDraft[]) => {
    setQuestions((prev) => [...prev, ...aiDrafts]);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    const parsedTimeLimitMinutes = Number(timeLimitMinutes);
    if (!Number.isInteger(parsedTimeLimitMinutes) || parsedTimeLimitMinutes < 1) {
      setError("Please enter a valid time limit in minutes.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        categoryId,
        subject,
        durationSec: parsedTimeLimitMinutes * 60,
        isPublished,
        questions, // Backend updateFullQuiz handles the sync via IDs
      };
      
      const res = await apiClient.put<{ success: boolean; message: string }>(
        `/admin/quizzes/${quizId}`,
        payload
      );
      
      setSuccess("Quiz updated successfully!");
      toast.success("Quiz updated!");
      setTimeout(() => router.push("/admin/quizzes"), 1600);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ?? "Failed to update quiz. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600" />
          <p className="text-sm font-medium text-gray-500">Loading quiz data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <AiImporterDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onImport={handleAiImport}
      />

      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Edit Quiz</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update exam details and synchronize questions atomically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* Quiz metadata */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-500">
              Quiz Details
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Anatomy Midterm 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-purple-400"
                >
                  <option value="">Select category…</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Osteology"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                  Time Limit (Minutes) <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-xs font-semibold text-gray-500">
                  Visibility:
                </label>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    isPublished 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
                  {isPublished ? "Published" : "Draft"}
                </button>
              </div>
            </div>
          </section>

          {/* Questions */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                Questions
                <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-gray-900">
                  {questions.length}
                </span>
              </h2>

              <button
                type="button"
                onClick={() => setAiDialogOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-[#A435F0] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#8710D8]"
              >
                <span>🪄</span>
                Auto-Fill with AI
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id || idx}
                  index={idx}
                  total={questions.length}
                  question={q}
                  onChange={handleQuestionChange}
                  onRemove={handleRemoveQuestion}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-purple-400 hover:bg-gray-50 hover:text-gray-900"
            >
              <span className="text-lg leading-none">+</span>
              Add Another Question
            </button>
          </section>

          {/* Status messages */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              {success} Redirecting…
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating…
                </span>
              ) : (
                `Update Quiz (${questions.length} questions)`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
