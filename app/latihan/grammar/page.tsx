import type { Metadata } from 'next';
import { LessonPracticeView } from '@/features/practice/lesson-practice-view';

export const metadata: Metadata = { title: 'Latihan grammar' };

export default function GrammarPracticePage() {
  return <LessonPracticeView kind="grammar" />;
}
