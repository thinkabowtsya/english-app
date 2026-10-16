import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CURRICULUM } from '@/data/curriculum';
import { LessonView } from '@/features/learning/lesson-view';
import { findLesson, flattenLessons } from '@/lib/curriculum';
import { getLessonContent } from '@/lib/curriculum-content';
import { createSeed } from '@/lib/shuffle';
import { requireLoginPage } from '@/lib/supabase/require-login';

export const dynamicParams = false;

export function generateStaticParams() {
  return flattenLessons(CURRICULUM).map((ref) => ({ lessonId: ref.lesson.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const ref = findLesson(CURRICULUM, lessonId);
  return { title: ref ? `${ref.lesson.title} · ${ref.module.title}` : 'Materi' };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!findLesson(CURRICULUM, lessonId)) notFound();
  // Materi khusus pengguna login.
  await requireLoginPage(`/materi/${lessonId}`);
  // Isi materi dimuat di server hanya untuk halaman ini (tidak ikut bundle halaman lain).
  return <LessonView lessonId={lessonId} content={getLessonContent(lessonId)} seed={createSeed()} />;
}
