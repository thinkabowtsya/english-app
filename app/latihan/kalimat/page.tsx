import type { Metadata } from 'next';
import { LessonPracticeView } from '@/features/practice/lesson-practice-view';

export const metadata: Metadata = { title: 'Susun kalimat' };

export default function SentencePracticePage() {
  return <LessonPracticeView kind="sentence" />;
}
