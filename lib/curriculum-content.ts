import 'server-only';
import { module1Content } from '@/data/curriculum/content/module-1';
import { withExerciseBanks } from '@/data/curriculum/content/module-1-exercises';
import { module2Content } from '@/data/curriculum/content/module-2';
import type { LessonContent, LessonContentMap } from '@/types/curriculum';

/**
 * Isi materi lengkap, hanya untuk server. Tambahkan map modul baru di sini.
 * Komponen client cukup memakai katalog ringan dari data/curriculum.
 */
const CONTENT: LessonContentMap = {
  ...withExerciseBanks(module1Content),
  ...module2Content,
};

export function getLessonContent(lessonId: string): LessonContent | null {
  return CONTENT[lessonId] ?? null;
}
