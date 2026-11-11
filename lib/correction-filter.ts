import type { Correction } from '@/lib/types';

/**
 * Teks dari pengenalan suara (panggilan AI) tidak punya huruf kapital & tanda baca yang andal,
 * jadi koreksi untuk ucapan mengabaikan keduanya: kesalahan yang hanya berbeda huruf besar/kecil
 * atau tanda baca dibuang, dan skor tidak dikurangi karenanya.
 */

/** Huruf kecil tanpa tanda baca & spasi berlebih — untuk membandingkan isi kata saja. */
export function normalizeSpoken(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ignoreSpeechFormatting(correction: Correction): Correction {
  const mistakes = (correction.mistakes ?? []).filter(
    (m) => m.type !== 'punctuation' && normalizeSpoken(m.original) !== normalizeSpoken(m.correction),
  );
  const sameWords = normalizeSpoken(correction.originalText) === normalizeSpoken(correction.correctedText);
  const isCorrect = mistakes.length === 0 || sameWords;
  return {
    ...correction,
    mistakes: isCorrect ? [] : mistakes,
    isCorrect,
    // Bila yang "salah" hanya kapital/tanda baca, ucapannya dianggap benar.
    score: isCorrect ? Math.max(correction.score, 95) : correction.score,
    correctedText: isCorrect ? correction.originalText : correction.correctedText,
  };
}
