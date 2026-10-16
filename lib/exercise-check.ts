import type { ExerciseItem } from '@/types/curriculum';

/**
 * Pemeriksaan jawaban latihan yang longgar: abaikan huruf besar/kecil, spasi ganda,
 * tanda baca akhir, jenis apostrof, dan bentuk singkat (don't = do not).
 */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\bi'm\b/g, 'i am'],
  [/\b(you|we|they)'re\b/g, '$1 are'],
  [/\b(it|he|she|that|there|what|where)'s\b/g, '$1 is'],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
];

export function normalizeAnswer(text: string): string {
  let s = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/…/g, '...')
    .replace(/^(contoh|salah\s*→|salah\s*->)\s*:?\s*/i, '')
    .trim();
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  return s
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/[.!?,;:]+(?=\s|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Jawaban yang dianggap cocok: kunci utama + alternatif. */
export function acceptedAnswers(item: Pick<ExerciseItem, 'answer' | 'alternatives'>): string[] {
  return [item.answer, ...(item.alternatives ?? [])];
}

export function isAnswerMatch(user: string, item: Pick<ExerciseItem, 'answer' | 'alternatives'>): boolean {
  const u = normalizeAnswer(user);
  if (!u) return false;
  return acceptedAnswers(item).some((a) => normalizeAnswer(a) === u);
}
