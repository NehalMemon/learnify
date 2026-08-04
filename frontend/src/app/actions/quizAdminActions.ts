'use server';

import { createClient } from '@/utils/supabase/server';

interface QuizCreateInput {
  categoryId: string;
  subjectId?: string | null;
  title: string;
  subject?: string | null;
  year?: number;
  duration_sec?: number;
}

type QuestionType =
  | 'SINGLE_CHOICE'
  | 'TRUE_FALSE'
  | 'MULTIPLE_SELECT'
  | 'MATCHING_PAIRS';

interface QuizQuestionInput {
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

export async function createQuiz(quizData: QuizCreateInput) {
  try {
    const supabase = await createClient();
    const {
      categoryId,
      subjectId = null,
      title,
      subject = null,
      year = 1,
      duration_sec = 3600,
    } = quizData;

    const { data, error } = await supabase
      .from('quizzes')
      .insert([
        {
          category_id: categoryId,
          subject_id: subjectId,
          title,
          subject,
          year,
          duration_sec,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('createQuiz error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('createQuiz unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while creating quiz');
  }
}

export async function addQuestionsToQuiz(quizId: string, questions: QuizQuestionInput[]) {
  try {
    const supabase = await createClient();
    const rows = questions.map((question) => ({
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
      console.error('addQuestionsToQuiz error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('addQuestionsToQuiz unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while adding questions');
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
      console.error('publishQuiz error:', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('publishQuiz unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while publishing quiz');
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
      console.error('getAdminQuizzes error:', error);
      throw new Error(error.message);
    }

    return data ?? [];
  } catch (error) {
    console.error('getAdminQuizzes unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while fetching admin quizzes');
  }
}
