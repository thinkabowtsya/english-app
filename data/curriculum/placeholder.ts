import type { CurriculumLevel, Lesson } from '@/types/curriculum';
import { module1 } from './module-1';

/**
 * Level 1. Modul 1 sudah berisi materi (module-1.ts); modul lain masih placeholder
 * sampai kontennya dibuat.
 */
function placeholderLesson(moduleId: string, moduleNo: number, lessonNo: number): Lesson {
  return {
    id: `${moduleId}-l${lessonNo}`,
    moduleId,
    title: `Materi ${moduleNo}.${lessonNo}`,
    summary: 'Placeholder — konten materi belum ditambahkan.',
    estimatedMinutes: 15,
    contentStatus: 'placeholder',
    content: null,
  };
}

export const placeholderLevel: CurriculumLevel = {
  id: 'level-1',
  title: 'Level 1',
  description: 'Placeholder level. Judul dan deskripsi akan diganti oleh kurikulum resmi.',
  modules: [
    module1,
    {
      id: 'level-1-m2',
      levelId: 'level-1',
      title: 'Modul 2',
      description: 'Placeholder modul — menunggu konten kurikulum.',
      lessons: [1, 2].map((n) => placeholderLesson('level-1-m2', 2, n)),
    },
  ],
};
