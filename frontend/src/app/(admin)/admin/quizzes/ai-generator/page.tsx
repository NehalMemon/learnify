'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  BrainCircuit,
  CheckSquare,
  Layers,
  ArrowLeftRight,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

// ── Validation Schema ──────────────────────────────────────────

const QUESTION_TYPES = ['SINGLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'MATCHING_PAIRS'] as const;

const AiGeneratorSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(200),
  subtopics: z.string().max(500).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  numQuestions: z.number().min(1, 'At least 1 question').max(50, 'Maximum 50 questions'),
  questionTypes: z
    .array(z.enum(QUESTION_TYPES))
    .min(1, 'Select at least one question type'),
});

type AiGeneratorFormValues = z.infer<typeof AiGeneratorSchema>;

// ── Question Type Metadata ─────────────────────────────────────

const QUESTION_TYPE_INFO = [
  { value: 'SINGLE_CHOICE' as const, label: 'Single Choice', icon: HelpCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'TRUE_FALSE' as const, label: 'True / False', icon: Layers, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'MULTIPLE_SELECT' as const, label: 'Multiple Select', icon: CheckSquare, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'MATCHING_PAIRS' as const, label: 'Matching Pairs', icon: ArrowLeftRight, color: 'text-amber-600 bg-amber-50 border-amber-200' },
];

// ── Difficulty Options ─────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', description: 'Recall & recognition' },
  { value: 'medium', label: 'Medium', description: 'Application & analysis' },
  { value: 'hard', label: 'Hard', description: 'Synthesis & evaluation' },
  { value: 'expert', label: 'Expert', description: 'Clinical scenario-based' },
];

// ── Component ──────────────────────────────────────────────────

export default function AiGeneratorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AiGeneratorFormValues>({
    resolver: zodResolver(AiGeneratorSchema),
    defaultValues: {
      topic: '',
      subtopics: '',
      difficulty: 'medium',
      numQuestions: 10,
      questionTypes: ['SINGLE_CHOICE'],
    },
  });

  // ── File Handling ──────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast.error('Only images and PDFs are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10 MB.');
      return;
    }

    setUploadedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const removeFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submission ─────────────────────────────────────────────────

  const onSubmit = async (data: AiGeneratorFormValues) => {
    setIsGenerating(true);
    try {
      // Mock AI generation — replace with real LLM/Vision API call
      await new Promise((res) => setTimeout(res, 2000));

      toast.success('Quiz generated successfully! Redirecting to builder...');
      router.push('/admin/quizzes/builder');
    } catch {
      toast.error('AI generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Back Link */}
        <Link
          href="/admin/quizzes/builder"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Builder
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-sm shadow-purple-600/20">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              AI Quiz Architect
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Configure parameters and optionally upload source material. The AI will generate a structured quiz ready for review.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card: Topic & Subtopics */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Subject Matter
            </h2>

            {/* Topic */}
            <div className="space-y-1.5">
              <label htmlFor="ai-topic" className="text-sm font-semibold text-gray-700">
                Topic Name <span className="text-red-500">*</span>
              </label>
              <input
                id="ai-topic"
                type="text"
                {...register('topic')}
                placeholder="e.g. Human Anatomy"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
              />
              {errors.topic && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.topic.message}
                </p>
              )}
            </div>

            {/* Subtopics */}
            <div className="space-y-1.5">
              <label htmlFor="ai-subtopics" className="text-sm font-semibold text-gray-700">
                Subtopics
                <span className="text-xs font-normal text-gray-400 ml-1.5">(comma-separated)</span>
              </label>
              <input
                id="ai-subtopics"
                type="text"
                {...register('subtopics')}
                placeholder="e.g. Osteology, Nervous System, Cardiovascular"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
              />
            </div>
          </section>

          {/* Card: Generation Parameters */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Generation Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Difficulty */}
              <div className="space-y-1.5">
                <label htmlFor="ai-difficulty" className="text-sm font-semibold text-gray-700">
                  Difficulty Level
                </label>
                <select
                  id="ai-difficulty"
                  {...register('difficulty')}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-1.5">
                <label htmlFor="ai-num-questions" className="text-sm font-semibold text-gray-700">
                  Number of Questions <span className="text-red-500">*</span>
                </label>
                <input
                  id="ai-num-questions"
                  type="number"
                  min={1}
                  max={50}
                  {...register('numQuestions', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
                {errors.numQuestions && (
                  <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.numQuestions.message}
                  </p>
                )}
              </div>
            </div>

            {/* Question Types Checkboxes */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-gray-700">
                Question Types <span className="text-red-500">*</span>
              </label>
              <Controller
                name="questionTypes"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    {QUESTION_TYPE_INFO.map((qt) => {
                      const Icon = qt.icon;
                      const isChecked = field.value.includes(qt.value);
                      return (
                        <button
                          key={qt.value}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? field.value.filter((v) => v !== qt.value)
                              : [...field.value, qt.value];
                            field.onChange(next);
                          }}
                          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm font-medium transition-all duration-150 ${
                            isChecked
                              ? 'border-purple-400 bg-purple-50/60 text-purple-800 ring-1 ring-purple-200'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${qt.color}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>{qt.label}</span>
                          {isChecked && (
                            <CheckSquare className="ml-auto h-4 w-4 text-purple-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.questionTypes && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.questionTypes.message}
                </p>
              )}
            </div>
          </section>

          {/* Card: Source Material Upload */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Source Material
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Upload an image or PDF. The AI will extract content and generate questions based on the material.
              </p>
            </div>

            {uploadedFile ? (
              /* File Preview */
              <div className="relative flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {/* Thumbnail or Icon */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white overflow-hidden">
                  {filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="h-6 w-6 text-red-500" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                    {' · '}
                    {uploadedFile.type.startsWith('image/') ? 'Image' : 'PDF'}
                  </p>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={removeFile}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-red-500 transition-all"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Dropzone */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-purple-400 bg-purple-50/50'
                    : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full mb-3 transition-colors ${
                  isDragging ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <Upload className={`h-5 w-5 ${isDragging ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Upload Source Material
                </p>
                <p className="text-xs text-gray-400">
                  Drag & drop an image or PDF, or click to browse
                </p>
                <p className="text-[10px] text-gray-400 mt-2">
                  Max 10 MB · PNG, JPG, WEBP, PDF
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </section>

          {/* Submit */}
          <div className="flex justify-end pt-2 pb-8">
            <button
              type="submit"
              disabled={isGenerating}
              className={`flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 ${
                isGenerating
                  ? 'bg-purple-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/20 hover:shadow-purple-600/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing source material and generating questions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
