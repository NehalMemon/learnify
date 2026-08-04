'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export interface QuizCreateInput {
  id?: string;
  categoryId: string;
  subjectId?: string | null;
  title: string;
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
  durationSec?: number;
  creditCost?: number;
  isPublished?: boolean;
  questions?: QuizQuestionInput[];
}

export async function createQuiz(quizData: QuizCreateInput) {
  console.log("STEP 1: Server action createQuiz triggered with data:", quizData);
  try {
    const supabase = await createClient();
    console.log("STEP 1.5: Supabase client created.");

    const {
      id = crypto.randomUUID(),
      categoryId,
      subjectId = null,
      title,
      duration_sec = 3600,
      is_published = false,
      credit_cost = 0,
    } = quizData;

    const validSubjectId =
      subjectId && typeof subjectId === 'string' && subjectId.trim().length > 0
        ? subjectId.trim()
        : null;

    const payload = {
      id: id || crypto.randomUUID(),
      category_id: categoryId,
      subject_id: validSubjectId,
      title: title.trim(),
      duration_sec: Number(duration_sec) || 3600,
      is_published: Boolean(is_published),
      credit_cost: Number(credit_cost) || 0,
      updated_at: new Date().toISOString(),
    };

    console.log("STEP 2: Data validated and ID generated. Preparing DB call with payload:", payload);

    const { data, error } = await supabase
      .from('quizzes')
      .insert([payload])
      .select('id')
      .single();

    console.log("STEP 3: DB Call finished. Error:", error, "Result:", data);

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
  console.log("STEP 1: addQuestionsToQuiz triggered for quizId:", quizId, "Count:", questions.length);
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

    console.log("STEP 2: Inserting questions rows into quiz_questions...");

    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(rows)
      .select('id');

    console.log("STEP 3: Questions DB insert finished. Error:", error, "Result:", data);

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
  console.log("STEP 1: Server action saveFullQuiz triggered with input:", JSON.stringify(input, null, 2));

  try {
    const supabase = await createClient();
    console.log("STEP 1.5: Supabase client instantiated successfully.");

    if (!input.title || !input.title.trim()) {
      console.error("EARLY RETURN: Quiz title is missing or empty.");
      return { success: false, error: 'Quiz title is required.' };
    }

    if (!input.categoryId) {
      console.error("EARLY RETURN: Quiz category is missing.");
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
      duration_sec: Number(input.durationSec) || 3600,
      credit_cost: Number(input.creditCost) || 0,
      is_published: Boolean(input.isPublished),
      updated_at: new Date().toISOString(),
    };

    console.log("STEP 2: Data validated & Quiz ID generated:", quizId, "Preparing DB upsert payload:", quizPayload);

    const { data: quizResult, error: quizError } = await supabase
      .from('quizzes')
      .upsert([quizPayload])
      .select();

    console.log("STEP 3: Quizzes DB upsert finished. Error:", quizError, "Result:", quizResult);

    if (quizError) {
      console.error('DB Error (saveFullQuiz quiz upsert):', quizError);
      return { success: false, error: quizError.message };
    }

    if (Array.isArray(input.questions) && input.questions.length > 0) {
      console.log("STEP 4: Deleting existing questions for quiz_id:", quizId);
      const { error: delError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      if (delError) {
        console.error('DB Error (saveFullQuiz delete questions warning):', delError);
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

      console.log("STEP 5: Inserting nested questions payload:", questionRows.length, "questions.");

      const { data: qResult, error: qError } = await supabase
        .from('quiz_questions')
        .insert(questionRows)
        .select();

      console.log("STEP 6: Quiz questions insert finished. Error:", qError, "Result:", qResult);

      if (qError) {
        console.error('DB Error (saveFullQuiz questions insert):', qError);
        return { success: false, error: qError.message };
      }
    }

    revalidatePath('/admin/quizzes');
    revalidatePath('/admin/quizzes/library');

    console.log("STEP 7: saveFullQuiz completed successfully for quizId:", quizId);

    return {
      success: true,
      quizId,
      message: input.isPublished
        ? 'Quiz published successfully!'
        : 'Quiz draft saved successfully!',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while saving quiz';
    console.error('saveFullQuiz unexpected error caught:', error);
    return { success: false, error: message };
  }
}

export async function publishQuiz(quizId: string) {
  console.log("STEP 1: publishQuiz triggered for quizId:", quizId);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('quizzes')
      .update({ is_published: true, updated_at: new Date().toISOString() })
      .eq('id', quizId)
      .select();

    console.log("STEP 2: publishQuiz finished. Error:", error, "Result:", data);

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

export const saveQuiz = saveFullQuiz;
