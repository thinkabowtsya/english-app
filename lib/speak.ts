import { z } from 'zod';

/**
 * Logika murni menu Speak: penilaian ucapan frasa kunci (dibandingkan dengan hasil pengenalan suara)
 * dan skema respons AI untuk role-play & umpan balik.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Kata yang sering ditulis berbeda oleh pengenal suara tapi bunyinya sama. */
const EQUIVALENT: Record<string, string> = {
  "i'm": 'i am',
  "it's": 'it is',
  "that's": 'that is',
  "i'll": 'i will',
  "i've": 'i have',
  "i'd": 'i would',
  "don't": 'do not',
  "doesn't": 'does not',
  "can't": 'can not',
  cannot: 'can not',
  "what's": 'what is',
  "let's": 'let us',
  ok: 'okay',
};

function expand(words: string[]): string[] {
  return words.flatMap((w) => (EQUIVALENT[w] ?? w).split(' '));
}

export interface SpokenWord {
  word: string;
  ok: boolean;
}

/**
 * Bandingkan kalimat target dengan yang terdengar (urutan kata, LCS). Skor 0–100 = persentase kata
 * target yang terucap dengan urutan benar. Tanda baca & huruf besar tidak dinilai.
 */
export function scoreSpoken(target: string, heard: string): { score: number; words: SpokenWord[] } {
  const display = target.split(/\s+/).filter(Boolean);
  const t = expand(normalize(target));
  const h = expand(normalize(heard));
  if (t.length === 0) return { score: 0, words: [] };

  // Tabel LCS untuk menandai kata target yang cocok.
  const dp = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = h.length - 1; j >= 0; j--) {
      dp[i][j] = t[i] === h[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Set<number>();
  for (let i = 0, j = 0; i < t.length && j < h.length; ) {
    if (t[i] === h[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const score = Math.round((matched.size / t.length) * 100);

  // Petakan hasil ke kata tampilan (kata tampilan bisa berisi singkatan yang diperluas).
  const words: SpokenWord[] = [];
  let cursor = 0;
  for (const word of display) {
    const parts = expand(normalize(word));
    const ok = parts.length === 0 || parts.every((_, k) => matched.has(cursor + k));
    cursor += parts.length;
    words.push({ word, ok });
  }
  return { score, words };
}

export const PASS_SCORE = 80;

/* ------------------------------- Skema AI ------------------------------- */

const text = (max: number) => z.string().trim().min(1).max(max);

/** Balasan AI per giliran role-play. */
export const speakTurnSchema = z.object({
  reply: text(600),
  goalsMet: z.array(z.string().max(40)).max(10).catch([]),
  tip: z
    .object({ wrong: text(300), better: text(300), note: z.string().trim().max(300).catch('') })
    .nullable()
    .optional()
    .catch(null),
});
export type SpeakTurn = z.infer<typeof speakTurnSchema>;

/** Umpan balik akhir percakapan. */
export const speakFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100).catch(0),
  grammar: z.number().min(0).max(100).catch(0),
  vocabulary: z.number().min(0).max(100).catch(0),
  task: z.number().min(0).max(100).catch(0),
  summary: text(600),
  improvements: z
    .array(z.object({ you: text(300), better: text(300), why: z.string().trim().max(300).catch('') }))
    .max(4)
    .catch([]),
  nextTip: z.string().trim().max(300).catch(''),
});
export type SpeakFeedback = z.infer<typeof speakFeedbackSchema>;

export interface SpeakLine {
  role: 'ai' | 'user';
  text: string;
}

/** Hanya ID misi yang valid untuk topik ini (AI kadang mengarang ID). */
export function validGoals(ids: string[], allowed: string[]): string[] {
  return [...new Set(ids.filter((id) => allowed.includes(id)))];
}

/** Progres per topik untuk daftar topik. */
export interface SpeakProgress {
  topicId: string;
  bestScore: number;
  attempts: number;
  lastAt: number;
}

export const MASTERED_SCORE = 70;
