import type { CurriculumLevel } from '@/types/curriculum';
import { module1 } from './module-1';
import { module2 } from './module-2';

/**
 * Level 1. Modul 1 sudah berisi materi (module-1.ts); Modul 2 lengkap (module-2.ts);
 * modul berikutnya ditambahkan berurutan.
 */
export const placeholderLevel: CurriculumLevel = {
  id: 'level-1',
  title: 'Level 1',
  description: 'Placeholder level. Judul dan deskripsi akan diganti oleh kurikulum resmi.',
  modules: [module1, module2],
};
