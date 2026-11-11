import { z } from 'zod';
import type { WordLinks } from './datamuse';

/**
 * Bentuk bersama untuk menu daftar belajar (Oxford 3000, Collocation): detail satu item dibuat AI
 * sekali lalu disimpan di Supabase, dan item bisa ditandai "sudah dipelajari".
 * Nama field mengikuti detail Oxford yang sudah tersimpan di oxford_words.detail.
 */
export interface StudyDetail {
  /** Arti singkat dalam bahasa Indonesia. */
  meaningId: string;
  /** Penjelasan/definisi sederhana dalam bahasa Inggris. */
  definitionEn: string;
  examples: { en: string; id: string }[];
  /** Kata/collocation yang mirip atau terkait + bedanya (bahasa Indonesia). */
  similar: { word: string; note: string }[];
  /** Kesalahan umum penutur Indonesia (dipakai menu Collocation). */
  mistake?: { wrong: string; note: string };
  /** MP3 pengucapan asli dari Free Dictionary API; tanpa ini dipakai TTS browser. */
  audioUrl?: string;
  /** Kata serupa & collocation dari Datamuse (bukan AI). Tidak ada pada detail lama sampai dibuka ulang. */
  links?: WordLinks;
}

/** 'saved' (Supabase), 'guest' (belum login), 'unavailable' (Supabase/migrasi belum siap). */
export type StudyStorage = 'saved' | 'guest' | 'unavailable';

const text = (max: number) => z.string().trim().min(1).max(max);

const aiDetailSchema = z.object({
  meaningId: text(200),
  definitionEn: text(300),
  examples: z.array(z.object({ en: text(300), id: text(300) })).min(1).max(4),
  similar: z.array(z.object({ word: text(80), note: z.string().trim().max(200).catch('') })).max(5).catch([]),
  mistake: z
    .object({ wrong: text(80), note: z.string().trim().max(200).catch('') })
    .optional()
    .catch(undefined),
});

/** Validasi keluaran AI; null bila bentuknya tidak bisa dipakai. */
export function parseAiStudyDetail(raw: unknown, item: string): StudyDetail | null {
  const parsed = aiDetailSchema.safeParse(raw);
  if (!parsed.success) return null;
  const key = item.toLowerCase();
  const { mistake, ...rest } = parsed.data;
  return {
    ...rest,
    // Item itu sendiri tidak dihitung sebagai "serupa".
    similar: rest.similar.filter((s) => s.word.toLowerCase() !== key),
    ...(mistake && mistake.wrong.toLowerCase() !== key ? { mistake } : {}),
  };
}
