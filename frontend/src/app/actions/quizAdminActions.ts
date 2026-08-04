'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export interface QuizCreateInput {
  id?: string;
  categoryId: string;
  subjectId?: string | null;
  title: string;
  subject?: string | null;
  year?: number;
  duration_sec?: number;
  is_published?: boolean;
  credit_cost?: number;
}

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'TRUE_FALSE'
  | 'MULTIPLE_SELECT'
  | 'MATCHING_PAIRS';

export interface QuizQuestionInput {
  id?: string;
  type: QuestionType;
  question_text: string;
  content?: Record<string, unknown>;
  correct_answer?: Record<string, unknown>;
  points?: number;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_option?: string | null;
  explanation?: string | null;
}

export interface SaveFullQuizInput {
  id?: string;
  title: string;
  categoryId: string;
  subjectId?: string | null;
  subject?: string | null;
  durationSec?: number;
  creditCost?: number;
  isPublished?: boolean;
  questions?: QuizQuestionInput[];
}

export async function createQuiz(quizData: QuizCreateInput) {
  try {
    const supabase = await createClient();
    const {
      id = crypto.randomUUID(),
      categoryId,
      subjectId = null,
      title,
      subject = null,
      year = 1,
      duration_sec = 3600,
      is_published = false,
      credit_cost = 0,
    } = quizData;

    // Sanitize subjectId: Empty string or invalid value must be null to avoid UUID casting error
    const validSubjectId =
      subjectId && typeof subjectId === 'string' && subjectId.trim().length > 0
        ? subjectId.trim()
        : null;

    const payload = {
      id: id || crypto.randomUUID(),
      category_id: categoryId,
      subject_id: validSubjectId,
      title: title.trim(),
      subject: subject ? subject.trim() : null,
      year: Number(year) || 1,
      duration_sec: Number(duration_sec) || 3600,
      is_published: Boolean(is_published),
      credit_cost: Number(credit_cost) || 0,
    };

    const { data, error } = await supabase
      .from('quizzes')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error('DB Error (createQuiz):', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/quizzes');
    revalidatePath('/admin/quizzes/library');
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while creating quiz';
    console.error('createQuiz unexpected error:', error);
    return { success: false, error: message };
  }
}

export async function addQuestionsToQuiz(quizId: string, questions: QuizQuestionInput[]) {
  try {
    const supabase = await createClient();
    const rows = questions.map((question) => ({
      id: question.id || crypto.randomUUID(),
      quiz_id: quizId,
      type: question.type,
      question_text: question.question_text,
      content: question.content ?? {},
      correct_answer: question.correct_answer ?? {},
      points: question.points ?? 1,
      option_a: question.option_a ?? null,
      option_b: question.option_b ?? null,
      option_c: question.option_c ?? null,
      option_d: question.option_d ?? null,
      correct_option: question.correct_option ?? null,
      explanation: question.explanation ?? null,
    }));

    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(rows)
      .select('id');

    if (error) {
      console.error('DB Error (addQuestionsToQuiz):', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while adding questions';
    console.error('addQuestionsToQuiz unexpected error:', error);
    return { success: false, error: message };
  }
}

export async function saveFullQuiz(input: SaveFullQuizInput) {
  try {
    const supabase = await createClient();

    if (!input.title || !input.title.trim()) {
      return { success: false, error: 'Quiz title is required.' };
    }

    if (!input.categoryId) {
      return { success: false, error: 'Quiz category is required.' };
    }

    const quizId = input.id || crypto.randomUUID();
    const validSubjectId =
      input.subjectId && typeof input.subjectId === 'string' && input.subjectId.trim().length > 0
        ? input.subjectId.trim()
        : null;

    const quizPayload = {
      id: quizId,
      category_id: input.categoryId,
      subject_id: validSubjectId,
      title: input.title.trim(),
      subject: input.subject ? input.subject.trim() : null,
      duration_sec: Number(input.durationSec) || 3600,
      credit_cost: Number(input.creditCost) || 0,
      is_published: Boolean(input.isPublished),
    };

    const { error: quizError } = await supabase
      .from('quizzes')
      .upsert([quizPayload]);

    if (quizError) {
      console.error('DB Error (saveFullQuiz quiz upsert):', quizError);
      return { success: false, error: quizError.message };
    }

    if (Array.isArray(input.questions) && input.questions.length > 0) {
      // Clear old questions if editing
      const { error: delError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      if (delError) {
        console.error('DB Error (saveFullQuiz delete questions):', delError);
        // Continue insertion attempt
      }

      const questionRows = input.questions.map((q) => ({
        id: q.id || crypto.randomUUID(),
        quiz_id: quizId,
        type: q.type || 'SINGLE_CHOICE',
        question_text: q.question_text,
        content: q.content ?? {},
        correct_answer: q.correct_answer ?? {},
        points: q.points ?? 1,
        option_a: q.option_a ?? null,
        option_b: q.option_b ?? null,
        option_c: q.option_c ?? null,
        option_d: q.option_d ?? null,
        correct_option: q.correct_option ?? null,
        explanation: q.explanation ?? null,
      }));

      const { error: qError } = await supabase
        .from('quiz_questions')
        .insert(questionRows);

      if (qError) {
        console.error('DB Error (saveFullQuiz questions insert):', qError);
        return { success: false, error: qError.message };
      }
    }

    revalidatePath('/admin/quizzes');
    revalidatePath('/admin/quizzes/library');

    return {
      success: true,
      quizId,
      message: input.isPublished
        ? 'Quiz published successfully!'
        : 'Quiz draft saved successfully!',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while saving quiz';
    console.error('saveFullQuiz unexpected error:', error);
    return { success: false, error: message };
  }
}

export async function publishQuiz(quizId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('quizzes')
      .update({ is_published: true })
      .eq('id', quizId);

    if (error) {
      console.error('DB Error (publishQuiz):', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/quizzes');
    revalidatePath('/admin/quizzes/library');
    return { success: true, message: 'Quiz published successfully!' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while publishing quiz';
    console.error('publishQuiz unexpected error:', error);
    return { success: false, error: message };
  }
}

export async function getAdminQuizzes() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, category:quiz_categories(id, name), subject:quiz_subjects(id, name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DB Error (getAdminQuizzes):', error);
      throw new Error(error.message);
    }

    return data ?? [];
  } catch (error) {
    console.error('getAdminQuizzes unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while fetching admin quizzes');
  }
}
