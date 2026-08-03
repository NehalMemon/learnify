import { redirect } from 'next/navigation';

export default async function EditQuizAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/quizzes/${id}/edit`);
}
