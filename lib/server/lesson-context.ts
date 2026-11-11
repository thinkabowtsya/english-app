import 'server-only';
import { CURRICULUM } from '@/data/curriculum';
import { findLesson } from '@/lib/curriculum';
import { getLessonContent } from '@/lib/curriculum-content';
import type { Lesson } from '@/types/curriculum';

/**
 * Ringkasan isi satu materi untuk prompt AI (Latihan grammar, Susun kalimat, Evaluasi):
 * tujuan, penjelasan, pola, contoh, dan kesalahan umum. Soal AI harus berpijak pada isi ini.
 */

const MAX_CHARS = 6_000;

export function findReadyLesson(lessonId: string): Lesson | null {
  const lesson = findLesson(CURRICULUM, lessonId)?.lesson;
  return lesson && lesson.contentStatus === 'ready' ? lesson : null;
}

export function lessonContext(lesson: Lesson): string {
  const c = getLessonContent(lesson.id);
  if (!c) return `Lesson: ${lesson.title}\nSummary: ${lesson.summary}`;
  const parts: string[] = [`Lesson: ${lesson.title}`, `Summary: ${lesson.summary}`];
  if (c.objectives.length) parts.push(`Objectives:\n- ${c.objectives.join('\n- ')}`);
  if (c.explanation?.length) parts.push(`Explanation:\n${c.explanation.join('\n')}`);
  if (c.patterns?.length)
    parts.push(
      `Patterns:\n${c.patterns
        .map((p) => `- ${p.pattern}${p.meaning ? ` (${p.meaning})` : ''}${p.examples?.length ? `: ${p.examples.join(' | ')}` : ''}`)
        .join('\n')}`,
    );
  if (c.examples?.length) parts.push(`Examples:\n${c.examples.map((e) => `- ${e.en}`).join('\n')}`);
  if (c.mistakes?.length)
    parts.push(`Common mistakes:\n${c.mistakes.map((m) => `- wrong: ${m.wrong} → correct: ${m.correct} (${m.reason})`).join('\n')}`);
  return parts.join('\n\n').slice(0, MAX_CHARS);
}
