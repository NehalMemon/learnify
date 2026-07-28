'use server';

import { createClient } from '@/utils/supabase/server';

export interface QuizSubject {
  id: string;
  category_id: string;
  name: string;
  code: string;
  created_at?: string;
}

export interface QuizCategoryWithSubjects {
  id: string;
  name: string;
  created_at?: string;
  subjects: QuizSubject[];
}

export interface CreateCategoryInput {
  name: string;
}

export interface UpdateCategoryInput {
  name: string;
}

export interface CreateSubjectInput {
  category_id: string;
  name: string;
  code: string;
}

export interface UpdateSubjectInput {
  name: string;
  code: string;
}

/**
 * Fetches all categories along with their nested subjects.
 */
export async function getCategoriesWithSubjects(): Promise<QuizCategoryWithSubjects[]> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      console.error('ADMIN PAGE FETCH ERROR:', new Error('Supabase client failed to initialize'));
      return [];
    }

    const { data, error } = await supabase
      .from('quiz_categories')
      .select('*, subjects:quiz_subjects(*)')
      .order('name', { ascending: true });

    if (error) {
      console.error('ADMIN PAGE FETCH ERROR (getCategoriesWithSubjects):', error);
      return [];
    }

    // Format subjects inside each category
    const result: QuizCategoryWithSubjects[] = (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      created_at: cat.created_at,
      subjects: Array.isArray(cat.subjects)
        ? cat.subjects.sort((a: QuizSubject, b: QuizSubject) => a.name.localeCompare(b.name))
        : [],
    }));

    return result;
  } catch (error) {
    console.error('ADMIN PAGE FETCH ERROR (getCategoriesWithSubjects exception):', error);
    return [];
  }
}

/**
 * Creates a new category. Payload strictly contains only non-id fields.
 */
export async function createCategory(name: string) {
  try {
    const supabase = await createClient();
    const payload: CreateCategoryInput = {
      name: name.trim(),
    };

    const { data, error } = await supabase
      .from('quiz_categories')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('createCategory error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('createCategory unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to create category');
  }
}

/**
 * Updates an existing category.
 */
export async function updateCategory(id: string, name: string) {
  try {
    const supabase = await createClient();
    const payload: UpdateCategoryInput = {
      name: name.trim(),
    };

    const { data, error } = await supabase
      .from('quiz_categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('updateCategory error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('updateCategory unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to update category');
  }
}

/**
 * Deletes a category.
 */
export async function deleteCategory(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('quiz_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteCategory error:', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('deleteCategory unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to delete category');
  }
}

/**
 * Creates a new subject under a category. Payload strictly contains only non-id fields.
 */
export async function createSubject(categoryId: string, name: string, code: string) {
  try {
    const cleanName = name.trim();
    const cleanCode = code.trim();

    if (!cleanName || !cleanCode) {
      throw new Error('Subject name and code are strictly required.');
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('quiz_subjects')
      .insert({ category_id: categoryId, name: cleanName, code: cleanCode })
      .select('*')
      .single();

    if (error) {
      console.error('createSubject error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('createSubject unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to create subject');
  }
}

/**
 * Updates an existing subject.
 */
export async function updateSubject(id: string, name: string, code: string) {
  try {
    const cleanName = name.trim();
    const cleanCode = code.trim();

    if (!cleanName || !cleanCode) {
      throw new Error('Subject name and code are strictly required.');
    }

    const supabase = await createClient();
    const payload: UpdateSubjectInput = {
      name: cleanName,
      code: cleanCode,
    };

    const { data, error } = await supabase
      .from('quiz_subjects')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('updateSubject error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('updateSubject unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to update subject');
  }
}

/**
 * Deletes a subject.
 */
export async function deleteSubject(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('quiz_subjects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteSubject error:', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('deleteSubject unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to delete subject');
  }
}
