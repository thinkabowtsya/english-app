import type { Metadata } from 'next';
import { LessonPracticeView } from '@/features/practice/lesson-practice-view';

export const metadata: Metadata = { title: 'Evaluasi materi' };

export default function EvaluationPracticePage() {
  return <LessonPracticeView kind="evaluation" />;
}
