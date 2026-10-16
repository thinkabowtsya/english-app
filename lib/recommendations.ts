import type { CurriculumLevel } from '@/types/curriculum';
import type { AppData } from '@/types/learning';
import { flattenLessons, getLessonStatus, getNextLesson } from './curriculum';
import { formatDuration } from './date';
import { getDueReviews } from './progress';

export interface Recommendation {
  id: string;
  kind: 'review' | 'continue' | 'next' | 'goal';
  title: string;
  description: string;
  href: string;
}

/**
 * Rekomendasi berbasis aturan statis (urutan kurikulum + progres lokal), BUKAN AI.
 * Nantinya dapat diperkaya dengan hasil evaluasi atau Groq tanpa mengubah komponen UI.
 */
export function getRecommendations(
  data: AppData,
  curriculum: CurriculumLevel[],
  remainingGoalMs: number,
  now: number,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const refs = flattenLessons(curriculum);

  const due = getDueReviews(data.reviews, now);
  if (due.length > 0) {
    recs.push({
      id: 'review',
      kind: 'review',
      title: `Ulangi ${due.length} item review`,
      description: `Mulai dari "${due[0].label}".`,
      href: '/latihan#review',
    });
  }

  const inProgress = refs
    .filter((ref) => getLessonStatus(refs, ref, data.lessons) === 'in_progress')
    .sort(
      (a, b) =>
        (data.lessons[b.lesson.id]?.lastStudiedAt ?? 0) - (data.lessons[a.lesson.id]?.lastStudiedAt ?? 0),
    )[0];
  if (inProgress) {
    recs.push({
      id: `continue-${inProgress.lesson.id}`,
      kind: 'continue',
      title: `Lanjutkan ${inProgress.lesson.title}`,
      description: `${inProgress.module.title} · sedang dipelajari`,
      href: `/materi/${inProgress.lesson.id}`,
    });
  }

  const next = getNextLesson(refs, data.lessons);
  if (next && next.lesson.id !== inProgress?.lesson.id) {
    recs.push({
      id: `next-${next.lesson.id}`,
      kind: 'next',
      title: `Materi berikutnya: ${next.lesson.title}`,
      description: `${next.module.title} · urutan kurikulum`,
      href: `/materi/${next.lesson.id}`,
    });
  }

  if (remainingGoalMs > 0) {
    recs.push({
      id: 'goal',
      kind: 'goal',
      title: `Sesi ${formatDuration(remainingGoalMs)} lagi`,
      description: 'untuk mencapai target harian hari ini.',
      href: '/#timer',
    });
  }

  return recs.slice(0, 4);
}
