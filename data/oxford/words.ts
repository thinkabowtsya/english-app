import rows from './words.json';

/**
 * Oxford 3000 per level CEFR A1–B2 (sumber: Oxford Learner's Dictionaries, lewat
 * github.com/winterdl/oxford-5000-vocabulary-audio-definition). Kata yang muncul di beberapa level
 * dimasukkan sekali di level terendahnya. Hanya kata, jenis kata, dan IPA (US); arti, contoh, dan
 * kata serupa dibuat lewat /api/oxford/detail.
 *
 * words.json dibuat otomatis (satu baris per kata: [word, level, pos[], ipa]) — jangan diedit manual.
 * Disimpan sebagai JSON karena literal TypeScript sebesar ini membuat tsc gagal (TS2590).
 */
export const OXFORD_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type OxfordLevel = (typeof OXFORD_LEVELS)[number];

export interface OxfordWord {
  word: string;
  level: OxfordLevel;
  pos: string[];
  ipa: string;
}

export const OXFORD_WORDS: OxfordWord[] = (rows as [string, OxfordLevel, string[], string][]).map(
  ([word, level, pos, ipa]) => ({ word, level, pos, ipa }),
);
