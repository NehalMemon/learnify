'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Save, AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createQuiz, addQuestionsToQuiz, saveQuizDraft } from '@/app/actions/quizAdminActions';
import { quizApi } from '@/lib/api';

import { QuizSidebar } from '@/components/admin/quiz/QuizSidebar';
import { QuestionEditor } from '@/components/admin/quiz/QuestionEditor';
import { QuizBuilderSchema, QuizBuilderFormValues } from '@/lib/validations/quiz';

interface Category {
  id: string;
  name: string;
}

export default function QuizBuilderPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Standard medical categories used as a safe fallback when the backend
  // API is unreachable or the QuizCategory table hasn't been seeded yet.
  const FALLBACK_CATEGORIES: Category[] = [
    { id: 'fallback-anatomy', name: 'Anatomy' },
    { id: 'fallback-biology', name: 'Biology' },
    { id: 'fallback-chemistry', name: 'Chemistry' },
    { id: 'fallback-physics', name: 'Physics' },
    { id: 'fallback-general', name: 'General' },
  ];

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await quizApi.getCategories();
        const data: Category[] = res.data?.data || [];
        setCategories(data.length > 0 ? data : FALLBACK_CATEGORIES);
      } catch {
        // Graceful degradation: let the admin continue building the quiz
        // with fallback categories while the backend API is pending.
        setCategories(FALLBACK_CATEGORIES);
      }
    };
    fetchCategories();
  }, []);

  // Initialize React Hook Form with Zod validation
  const form = useForm<QuizBuilderFormValues>({
    resolver: zodResolver(QuizBuilderSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      durationSec: 600, // 10 minutes default
      questions: [],
    },
  });

  const { control, handleSubmit, register, watch, setValue, formState: { errors } } = form;

  // useFieldArray for managing questions list dynamically
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  /**
   * Maps the rich discriminated-union form state into the flat DB column
   * structure expected by the addQuestionsToQuiz server action.
   *
   * - SINGLE_CHOICE  → options stored in option_a..d, correct index in correct_option & correct_answer JSONB
   * - TRUE_FALSE      → correct boolean stored in correct_answer JSONB
   * - MULTIPLE_SELECT → options in option_a..d, correct indices in correct_answer JSONB
   * - MATCHING_PAIRS  → pairs stored in content JSONB
   */
  function mapQuestionToDbRow(q: QuizBuilderFormValues['questions'][number]) {
    const base = {
      type: q.type,
      question_text: q.questionText,
      content: {} as Record<string, unknown>,
      correct_answer: {} as Record<string, unknown>,
      points: 1,
      option_a: null as string | null,
      option_b: null as string | null,
      option_c: null as string | null,
      option_d: null as string | null,
      correct_option: null as string | null,
      explanation: q.explanation ?? null,
    };

    if (q.type === 'SINGLE_CHOICE') {
      const labels = ['A', 'B', 'C', 'D'] as const;
      q.options.forEach((opt, i) => {
        if (i < 4) {
          (base as Record<string, unknown>)[`option_${labels[i].toLowerCase()}`] = opt;
        }
      });
      base.correct_option = labels[q.correctOptionIndex] ?? null;
      base.correct_answer = { correctOptionIndex: q.correctOptionIndex };
      base.content = { options: q.options };
    } else if (q.type === 'TRUE_FALSE') {
      base.correct_answer = { value: q.correctAnswer };
    } else if (q.type === 'MULTIPLE_SELECT') {
      const labels = ['A', 'B', 'C', 'D'] as const;
      q.options.forEach((opt, i) => {
        if (i < 4) {
          (base as Record<string, unknown>)[`option_${labels[i].toLowerCase()}`] = opt;
        }
      });
      base.correct_answer = { correctOptionIndices: q.correctOptionIndices };
      base.content = { options: q.options };
    } else if (q.type === 'MATCHING_PAIRS') {
      base.content = { pairs: q.pairs };
      base.correct_answer = { pairs: q.pairs };
    }

    return base;
  }

  const onSubmit: SubmitHandler<QuizBuilderFormValues> = async (data) => {
    setIsSaving(true);
    try {
      // Step 1 – Create the quiz shell and retrieve its new ID
      const newQuiz = await createQuiz({
        categoryId: data.categoryId,
        title: data.title,
        duration_sec: Number(data.durationSec),
      });

      // Step 2 – Bulk-insert questions linked to the new quiz
      const dbRows = data.questions.map(mapQuestionToDbRow);
      await addQuestionsToQuiz(newQuiz.id, dbRows);

      toast.success('Quiz created successfully!');
      form.reset();
      setActiveIndex(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error occurred while saving the quiz.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const onInvalid = () => {
    toast.error('Please fix the errors in your questions before saving.');
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const title = watch('title') || 'Untitled Draft Quiz';
      const categoryId = watch('categoryId');
      const durationSec = watch('durationSec');

      const res = await saveQuizDraft({
        title,
        categoryId,
        duration_sec: durationSec ? Number(durationSec) : 3600,
      });

      if (res.success) {
        toast.success('Draft saved!');
        router.push('/admin/quizzes');
      } else {
        toast.error(res.error || 'Failed to save draft.');
      }
    } catch (err) {
      console.error('Draft Error:', err);
      toast.error('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit as unknown as SubmitHandler<any>, onInvalid)}
      className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 border border-gray-200 rounded-xl shadow-sm"
    >
      {/* Quiz Metadata / Control Header */}
      <header className="h-16 shrink-0 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-4 flex-1 max-w-4xl">
          {/* Title Input */}
          <div className="flex-1">
            <input
              type="text"
              {...register('title')}
              placeholder="Enter Quiz Title..."
              className="w-full bg-transparent border-0 font-bold text-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 px-0 py-1"
            />
            {errors.title && (
              <p className="text-[10px] font-semibold text-red-500 absolute -bottom-1 left-6 flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-56">
            <select
              {...register('categoryId')}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Input */}
          <div className="w-40 flex items-center gap-2">
            <input
              type="number"
              {...register('durationSec', { valueAsNumber: true })}
              placeholder="Duration (sec)"
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
            />
            <span className="text-xs text-gray-400 font-semibold shrink-0">sec</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/quizzes/ai-generator"
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            ✨ Generate Quiz with AI
          </Link>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </header>

      {/* Main Split-Pane Workspace */}
      <div className="flex flex-row h-[calc(100vh-64px)] overflow-hidden w-full">
        {/* Left Sidebar Pane */}
        <QuizSidebar
          questions={fields as any}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          append={append}
          remove={remove}
        />

        {/* Right Editor Canvas Pane */}
        <QuestionEditor
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          activeIndex={activeIndex}
        />
      </div>
    </form>
  );
}
