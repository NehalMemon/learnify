import { adminApi, coursesApi, quizApi } from '@/lib/api';

export type SearchResultType = 'course' | 'quiz' | 'user';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  type: SearchResultType;
}

function unwrapList<T>(payload: unknown, key?: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (key && Array.isArray(record[key])) return record[key] as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
}

export async function fetchAutocompleteResults(
  query: string,
  variant: 'student' | 'admin'
): Promise<SearchResultItem[]> {
  const search = query.trim();
  if (!search) return [];

  if (variant === 'student') {
    const [coursesRes, quizzesRes] = await Promise.allSettled([
      coursesApi.listCourses({ search, limit: 5 }),
      quizApi.listQuizzes({ search, limit: 5 }),
    ]);

    const courses =
      coursesRes.status === 'fulfilled'
        ? unwrapList<{ id: string; title: string; instructor?: string }>(
            coursesRes.value.data?.data,
            'courses'
          )
        : [];

    const quizzes =
      quizzesRes.status === 'fulfilled'
        ? unwrapList<{ id: string; title: string; subject?: string }>(
            quizzesRes.value.data?.data,
            'quizzes'
          )
        : [];

    return [
      ...courses.map((course) => ({
        id: course.id,
        title: course.title,
        subtitle: course.instructor ? `Course · ${course.instructor}` : 'Course',
        href: `/courses/${course.id}`,
        type: 'course' as const,
      })),
      ...quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        subtitle: quiz.subject ? `Quiz · ${quiz.subject}` : 'Quiz',
        href: `/dashboard/quiz/${quiz.id}`,
        type: 'quiz' as const,
      })),
    ];
  }

  const [usersRes, coursesRes, quizzesRes] = await Promise.allSettled([
    adminApi.listUsers({ search, limit: 5 }),
    adminApi.listCourses({ search, limit: 5 }),
    adminApi.listQuizzes({ search, limit: 5 }),
  ]);

  const users =
    usersRes.status === 'fulfilled'
      ? unwrapList<{ id: string; fullName: string; email: string }>(
          usersRes.value.data?.data,
          'users'
        )
      : [];

  const courses =
    coursesRes.status === 'fulfilled'
      ? unwrapList<{ id: string; title: string }>(coursesRes.value.data?.data, 'courses')
      : [];

  const quizzes =
    quizzesRes.status === 'fulfilled'
      ? unwrapList<{ id: string; title: string; subject?: string | null }>(
          quizzesRes.value.data?.data
        )
      : [];

  return [
    ...users.map((user) => ({
      id: user.id,
      title: user.fullName,
      subtitle: user.email,
      href: `/admin/users/${user.id}`,
      type: 'user' as const,
    })),
    ...courses.map((course) => ({
      id: course.id,
      title: course.title,
      subtitle: 'Course',
      href: '/admin/courses',
      type: 'course' as const,
    })),
    ...quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      subtitle: quiz.subject ? `Quiz · ${quiz.subject}` : 'Quiz',
      href: `/admin/quizzes/${quiz.id}/edit`,
      type: 'quiz' as const,
    })),
  ];
}
