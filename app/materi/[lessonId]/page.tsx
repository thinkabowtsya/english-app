import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CURRICULUM } from '@/data/curriculum';
import { LessonView } from '@/features/learning/lesson-view';
import { findLesson, flattenLessons } from '@/lib/curriculum';

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
  return <LessonView lessonId={lessonId} />;
}
