'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type BankQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface BankQuestionRelation {
  id?: string;
  name?: string | null;
}

export interface BankQuestion {
  id: string;
  category_id?: string | null;
  subject_id?: string | null;
  type: BankQuestionType;
  question_text: string;
  points?: number;
  explanation?: string | null;
  difficulty: QuestionDifficulty;
  tags?: string[] | null;
  content: Record<string, any>;
  correct_answer: Record<string, any>;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_option?: string | null;
  created_at?: string;
  updated_at?: string;
  category?: BankQuestionRelation | BankQuestionRelation[] | null;
  subject?: BankQuestionRelation | BankQuestionRelation[] | null;
}

export interface CreateBankQuestionInput {
  category_id?: string | null;
  subject_id?: string | null;
  type: BankQuestionType;
  question_text: string;
  points?: number;
  explanation?: string | null;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  content: Record<string, any>;
  correct_answer: Record<string, any>;
}

export async function createBankQuestion(input: CreateBankQuestionInput) {
  try {
    const supabase = await createClient();

    const payload = {
      category_id: input.category_id || null,
      subject_id: input.subject_id || null,
      type: input.type || 'SINGLE_CHOICE',
      question_text: input.question_text.trim(),
      points: Number(input.points) || 1,
      explanation: input.explanation ? input.explanation.trim() : null,
      difficulty: input.difficulty || 'MEDIUM',
      tags: Array.isArray(input.tags) ? input.tags : [],
      content: input.content ?? {},
      correct_answer: input.correct_answer ?? {},
    };

    const { data, error } = await supabase
      .from('question_bank')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error('createBankQuestion error:', error);
      throw new Error(error.message);
    }

    revalidatePath('/admin/question-bank');
    return { success: true, data };
  } catch (error) {
    console.error('createBankQuestion unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while adding question to bank');
  }
}

export async function getBankQuestions(filters?: {
  category_id?: string;
  subject_id?: string;
  type?: string;
  difficulty?: string;
  searchQuery?: string;
}) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('question_bank')
      .select('*, category:quiz_categories(id, name), subject:quiz_subjects(id, name)')
      .order('created_at', { ascending: false });

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.subject_id) {
      query = query.eq('subject_id', filters.subject_id);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }

    if (filters?.searchQuery?.trim()) {
      query = query.ilike('question_text', `%${filters.searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getBankQuestions error:', error);
      throw new Error(error.message);
    }

    return (data ?? []) as BankQuestion[];
  } catch (error) {
    console.error('getBankQuestions unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while fetching question bank');
  }
}

export async function deleteBankQuestion(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('question_bank')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteBankQuestion error:', error);
      throw new Error(error.message);
    }

    revalidatePath('/admin/question-bank');
    return { success: true };
  } catch (error) {
    console.error('deleteBankQuestion unexpected error:', error);
    throw error instanceof Error ? error : new Error('Unexpected error while deleting question');
  }
}
