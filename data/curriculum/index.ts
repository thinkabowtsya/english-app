import type { CurriculumLevel } from '@/types/curriculum';
import { placeholderLevel } from './placeholder';

/**
 * Daftar level kurikulum berurutan.
 *
 * Saat ini hanya berisi kerangka placeholder. Konten nyata ditambahkan lewat file data
 * baru (mis. `level-1.ts`) yang mengikuti tipe di `types/curriculum.ts`, lalu didaftarkan
 * di sini. ID materi dipakai sebagai kunci progres di localStorage, jadi jangan diubah
 * setelah materi dipakai.
 */
export const CURRICULUM: CurriculumLevel[] = [placeholderLevel];
