/**
 * Boneyard — Admin Courses route-level skeleton.
 *
 * Next.js App Router renders this component instantly when navigating
 * to /admin/courses, eliminating the frozen-navigation lag while
 * course data loads from the API.
 */

import { CoursesLoadingSkeleton } from './_components/CoursesSkeletons';

export default function AdminCoursesLoading() {
  return <CoursesLoadingSkeleton />;
}
