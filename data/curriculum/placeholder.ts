import type { CurriculumLevel, Lesson } from '@/types/curriculum';

/**
 * Kerangka placeholder untuk menguji navigasi, status materi, dan progres.
 * Sengaja TIDAK berisi materi grammar — konten dibuat melalui prompt kurikulum terpisah.
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
    {
      id: 'level-1-m1',
      levelId: 'level-1',
      title: 'Modul 1',
      description: 'Placeholder modul — menunggu konten kurikulum.',
      lessons: [1, 2, 3].map((n) => placeholderLesson('level-1-m1', 1, n)),
    },
    {
      id: 'level-1-m2',
      levelId: 'level-1',
      title: 'Modul 2',
      description: 'Placeholder modul — menunggu konten kurikulum.',
      lessons: [1, 2].map((n) => placeholderLesson('level-1-m2', 2, n)),
    },
  ],
};
