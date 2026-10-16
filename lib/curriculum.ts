import type { CurriculumLevel, CurriculumModule, Lesson } from '@/types/curriculum';
import type { LessonProgress, LessonStatus } from '@/types/learning';

export interface LessonRef {
  lesson: Lesson;
  module: CurriculumModule;
  level: CurriculumLevel;
  /** Posisi global dalam urutan kurikulum. */
  index: number;
}

export function flattenLessons(curriculum: CurriculumLevel[]): LessonRef[] {
  const refs: LessonRef[] = [];
  for (const level of curriculum) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        refs.push({ lesson, module: mod, level, index: refs.length });
      }
    }
  }
  return refs;
}

export function findLesson(curriculum: CurriculumLevel[], lessonId: string): LessonRef | null {
  return flattenLessons(curriculum).find((ref) => ref.lesson.id === lessonId) ?? null;
}

function isPassed(progress: LessonProgress | undefined): boolean {
  return progress?.status === 'completed' || progress?.status === 'needs_review';
}

/** Prasyarat eksplisit, atau materi sebelumnya dalam urutan kurikulum. */
export function getPrerequisiteIds(refs: LessonRef[], ref: LessonRef): string[] {
  if (ref.lesson.prerequisites) return ref.lesson.prerequisites;
  return ref.index > 0 ? [refs[ref.index - 1].lesson.id] : [];
}

export function getLessonStatus(
  refs: LessonRef[],
  ref: LessonRef,
  progress: Record<string, LessonProgress>,
): LessonStatus {
  const own = progress[ref.lesson.id];
  if (own) return own.status;
  const prereqs = getPrerequisiteIds(refs, ref);
  return prereqs.every((id) => isPassed(progress[id])) ? 'available' : 'locked';
}

/** Materi pertama yang belum selesai dan tidak terkunci. */
export function getNextLesson(
  refs: LessonRef[],
  progress: Record<string, LessonProgress>,
  afterLessonId?: string | null,
): LessonRef | null {
  const start = afterLessonId ? refs.findIndex((r) => r.lesson.id === afterLessonId) + 1 : 0;
  for (let i = Math.max(0, start); i < refs.length; i++) {
    const status = getLessonStatus(refs, refs[i], progress);
    if (status === 'available' || status === 'in_progress') return refs[i];
  }
  return null;
}

export interface ModuleProgress {
  total: number;
  completed: number;
  percent: number;
}

export function getModuleProgress(
  mod: CurriculumModule,
  progress: Record<string, LessonProgress>,
): ModuleProgress {
  const total = mod.lessons.length;
  const completed = mod.lessons.filter((l) => isPassed(progress[l.id])).length;
  return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}
