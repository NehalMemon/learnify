import { redirect } from 'next/navigation';

export default function CreateQuizRedirectPage() {
  redirect('/admin/quizzes/builder/new');
}
