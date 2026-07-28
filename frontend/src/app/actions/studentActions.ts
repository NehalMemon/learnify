'use server';

import { createClient } from '@/utils/supabase/server';

export interface PublishedQuiz {
  id: string;
  title: string;
  description?: string | null;
  duration_sec: number;
  is_published: boolean;
  category_id?: string | null;
  subject_id?: string | null;
  category_name?: string;
  subject_name?: string;
  subject_code?: string;
  created_at?: string;
}

/**
 * Fetches all published quizzes with joined category and subject names.
 */
export async function getPublishedQuizzes(): Promise<PublishedQuiz[]> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      console.error('getPublishedQuizzes error: Supabase client failed to initialize');
      return [];
    }

    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        duration_sec,
        is_published,
        category_id,
        subject_id,
        created_at,
        category:quiz_categories(id, name),
        subject:quiz_subjects(id, name, code)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getPublishedQuizzes query error:', error);
      return [];
    }

    const result: PublishedQuiz[] = (data || []).map((q: any) => {
      const categoryObj = Array.isArray(q.category) ? q.category[0] : q.category;
      const subjectObj = Array.isArray(q.subject) ? q.subject[0] : q.subject;

      return {
        id: q.id,
        title: q.title,
        description: q.description || null,
        duration_sec: q.duration_sec || 0,
        is_published: Boolean(q.is_published),
        category_id: q.category_id || null,
        subject_id: q.subject_id || null,
        category_name: categoryObj?.name || 'General Category',
        subject_name: subjectObj?.name || 'General Subject',
        subject_code: subjectObj?.code || null,
        created_at: q.created_at,
      };
    });

    return result;
  } catch (error) {
    console.error('getPublishedQuizzes unexpected error:', error);
    return [];
  }
}
