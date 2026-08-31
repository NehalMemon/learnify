import { redirect } from 'next/navigation';

export default function CreateLiveClassRedirectPage() {
  redirect('/admin/live-classes/builder');
}
