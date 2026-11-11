import { z } from 'zod';
import { isAnswerMatch, normalizeAnswer } from '@/lib/exercise-check';
import { MISTAKE_PATTERN_IDS, isMistakePattern } from '@/lib/mistakes';
import { seededShuffle } from '@/lib/shuffle';

/**
 * Mesin latihan bersama untuk Latihan grammar, Susun kalimat, Evaluasi (soal AI dari isi materi)
 * dan mode Ketik / Dikte / Buat kalimat di Vocabulary Recall (soal AI dari kosakata), serta latihan
 * per pola dari Buku kesalahan.
 * Sesi yang selesai disimpan di tabel practice_sessions.
 */

export const PRACTICE_KINDS = {
  grammar: { label: 'Latihan grammar', unit: 'soal' },
  sentence: { label: 'Susun kalimat', unit: 'soal' },
  evaluation: { label: 'Evaluasi', unit: 'soal' },
  'vocab-type': { label: 'Ketik jawaban', unit: 'kata' },
  'vocab-dictation': { label: 'Dikte', unit: 'kalimat' },
  'vocab-write': { label: 'Buat kalimat', unit: 'kalimat' },
  mistakes: { label: 'Latihan dari kesalahan', unit: 'soal' },
} as const;

export type PracticeKind = keyof typeof PRACTICE_KINDS;
export const PRACTICE_KIND_IDS = Object.keys(PRACTICE_KINDS) as [PracticeKind, ...PracticeKind[]];
export const LESSON_KINDS: PracticeKind[] = ['grammar', 'sentence', 'evaluation'];
export const VOCAB_KINDS: PracticeKind[] = ['vocab-type', 'vocab-dictation', 'vocab-write'];

/**
 * choice    pilihan ganda (4 opsi)
 * fill      isi bagian kosong "___" (diketik)
 * fix       perbaiki kalimat yang salah (diketik)
 * arrange   susun potongan kata menjadi kalimat
 * translate terjemahkan kalimat Indonesia ke Inggris (diketik)
 * type-word ketik kata/collocation dari arti + kalimat berlubang
 * dictation dengar kalimat lalu ketik
 * write     buat kalimat sendiri memakai kata/collocation
 */
export type PracticeItemType = 'choice' | 'fill' | 'fix' | 'arrange' | 'translate' | 'type-word' | 'dictation' | 'write';

/** Tipe yang jawabannya bisa beragam: bila tidak cocok dengan kunci, AI yang menilai. */
export const AI_CHECKED_TYPES: PracticeItemType[] = ['fix', 'translate', 'write'];

export interface PracticeItem {
  type: PracticeItemType;
  /** Perintah soal (bahasa Indonesia). */
  prompt: string;
  /** Teks soal: kalimat dengan "___", kalimat salah, kalimat Indonesia, atau arti kata. */
  text: string;
  options?: string[];
  /** Potongan kata yang sudah diacak (arrange). */
  tokens?: string[];
  /** Jawaban kunci (untuk choice: teks opsi yang benar; untuk write: contoh kalimat). */
  answer: string;
  alternatives?: string[];
  explanation: string;
  /** Kata/collocation yang dilatih (mode kosakata) — hasilnya menggeser jadwal ulang. */
  vocab?: { item: string; source: 'oxford' | 'collocation' };
  /** Pola grammar yang diuji (lib/mistakes.ts); jawaban salah masuk Buku kesalahan dengan pola ini. */
  pattern?: string;
  // Diisi setelah dijawab:
  response?: string;
  correct?: boolean;
  /** Umpan balik pemeriksaan (bahasa Indonesia), mis. dari AI. */
  feedback?: string;
  /** Versi perbaikan dari jawaban pengguna (AI). */
  corrected?: string;
}

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).catch('');

const aiItemSchema = z.object({
  type: z.enum(['choice', 'fill', 'fix', 'arrange', 'translate', 'type-word', 'dictation', 'write']),
  prompt: text(300),
  text: optText(400),
  options: z.array(text(160)).optional().catch(undefined),
  answer: text(400),
  alternatives: z.array(text(400)).max(6).optional().catch(undefined),
  explanation: optText(500),
  vocab: z
    .object({ item: text(120), source: z.enum(['oxford', 'collocation']) })
    .optional()
    .catch(undefined),
  pattern: z.string().trim().max(40).optional().catch(undefined),
});

const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Potong kalimat jadi token kata untuk soal susun kalimat (tanda baca akhir dibuang). */
export function arrangeTokens(sentence: string, seed: number): string[] {
  const tokens = wordsOf(sentence.replace(/[.!?]+$/, ''));
  let shuffled = seededShuffle(tokens, seed);
  // Jangan biarkan urutan acak sama persis dengan jawaban.
  for (let i = 1; i < 5 && shuffled.join(' ') === tokens.join(' '); i++) shuffled = seededShuffle(tokens, seed + i);
  return shuffled;
}

/**
 * Validasi soal dari AI. Soal rusak dibuang: pilihan ganda tanpa 4 opsi unik atau kunci di luar
 * opsi, isian tanpa "___", kalimat salah yang sama dengan kuncinya, susun kalimat terlalu
 * pendek/panjang. Opsi & potongan kata diacak di server.
 */
export function parsePracticeItems(raw: unknown, seed: number, allowed: PracticeItemType[]): PracticeItem[] {
  const list = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return [];
  const out: PracticeItem[] = [];
  list.forEach((entry, i) => {
    const parsed = aiItemSchema.safeParse(entry);
    if (!parsed.success || !allowed.includes(parsed.data.type)) return;
    const q = parsed.data;
    const item: PracticeItem = {
      type: q.type,
      prompt: q.prompt,
      text: q.text,
      answer: q.answer,
      explanation: q.explanation,
      ...(q.alternatives?.length ? { alternatives: q.alternatives } : {}),
      ...(q.vocab ? { vocab: q.vocab } : {}),
      ...(isMistakePattern(q.pattern) ? { pattern: q.pattern } : {}),
    };
    switch (q.type) {
      case 'choice': {
        const options = q.options ?? [];
        if (options.length !== 4 || new Set(options.map((o) => o.toLowerCase())).size !== 4) return;
        if (!options.some((o) => o === q.answer)) return;
        item.options = seededShuffle(options, seed + i);
        break;
      }
      case 'fill':
      case 'type-word':
        if (!q.text.includes('___')) return;
        break;
      case 'fix':
        if (!q.text || normalizeAnswer(q.text) === normalizeAnswer(q.answer)) return;
        break;
      case 'arrange': {
        const n = wordsOf(q.answer).length;
        if (n < 3 || n > 14) return;
        item.tokens = arrangeTokens(q.answer, seed + i);
        // "text" seharusnya arti bahasa Indonesia; bila AI malah menulis potongan kata Inggrisnya,
        // petunjuk itu dibuang agar jawaban tidak bocor.
        const answerWords = new Set(comparableWords(q.answer));
        const hintWords = comparableWords(q.text);
        if (hintWords.length && hintWords.filter((w) => answerWords.has(w)).length / hintWords.length > 0.5) item.text = '';
        break;
      }
      case 'translate':
        if (!q.text) return;
        break;
      case 'dictation':
        // Teks yang didengar = kunci; tidak ditampilkan sebelum dijawab.
        item.text = '';
        break;
      case 'write':
        if (!q.vocab) return;
        break;
    }
    out.push(item);
  });
  return out;
}

/** Kata dalam kalimat untuk dibandingkan (huruf kecil, tanpa tanda baca, bentuk singkat dibuka). */
export function comparableWords(s: string): string[] {
  return normalizeAnswer(s)
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Kemiripan dikte berbasis kata (LCS / panjang kunci): 1 = sama persis.
 * Huruf besar/kecil dan tanda baca diabaikan.
 */
export function dictationSimilarity(response: string, answer: string): number {
  const a = comparableWords(answer);
  const b = comparableWords(response);
  if (a.length === 0) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const lcs = dp[a.length][b.length];
  // Kata berlebih juga mengurangi skor.
  return lcs / Math.max(a.length, b.length);
}

/** Batas lulus dikte: hampir semua kata benar (salah 1 kata di kalimat 10 kata masih lulus). */
export const DICTATION_PASS = 0.9;

/**
 * Pemeriksaan lokal tanpa AI. Mengembalikan null bila jawaban tidak cocok dengan kunci tapi
 * tipenya boleh dinilai AI (jawaban lain bisa saja benar).
 */
export function checkLocally(item: PracticeItem, response: string): { correct: boolean; feedback?: string } | null {
  const r = response.trim();
  if (!r) return { correct: false, feedback: 'Belum dijawab.' };
  if (item.type === 'choice') return { correct: r === item.answer };
  if (item.type === 'dictation') {
    const sim = dictationSimilarity(r, item.answer);
    return {
      correct: sim >= DICTATION_PASS,
      feedback: sim >= DICTATION_PASS ? undefined : `${Math.round(sim * 100)}% kata sesuai.`,
    };
  }
  if (isAnswerMatch(r, item)) return { correct: true };
  if (item.type === 'arrange') {
    // Susun kalimat: cukup urutan kata sama (tanda baca & kapital diabaikan).
    const same = [item.answer, ...(item.alternatives ?? [])].some(
      (a) => comparableWords(a).join(' ') === comparableWords(r).join(' '),
    );
    return { correct: same };
  }
  if (item.type === 'write') return null;
  return AI_CHECKED_TYPES.includes(item.type) ? null : { correct: false };
}

/** Bentuk sesi yang dikirim saat menyimpan. */
export const practiceSessionSchema = z.object({
  kind: z.enum(PRACTICE_KIND_IDS),
  title: text(200),
  lessonId: z.string().max(80).nullable().default(null),
  /** Untuk kind 'mistakes': pola yang dilatih. */
  pattern: z.enum(MISTAKE_PATTERN_IDS).nullable().default(null),
  items: z
    .array(
      z.object({
        type: z.enum(['choice', 'fill', 'fix', 'arrange', 'translate', 'type-word', 'dictation', 'write']),
        prompt: text(300),
        text: z.string().max(400),
        options: z.array(z.string().max(160)).max(4).optional(),
        tokens: z.array(z.string().max(80)).max(20).optional(),
        answer: text(400),
        alternatives: z.array(z.string().max(400)).max(6).optional(),
        explanation: z.string().max(500),
        vocab: z.object({ item: text(120), source: z.enum(['oxford', 'collocation']) }).optional(),
        pattern: z.string().max(40).optional(),
        response: z.string().max(1000).default(''),
        correct: z.boolean(),
        feedback: z.string().max(800).optional(),
        corrected: z.string().max(600).optional(),
      }),
    )
    .min(1)
    .max(30),
});

export type PracticeSessionInput = z.infer<typeof practiceSessionSchema>;

export interface PracticeSessionSummary {
  id: string;
  kind: PracticeKind;
  title: string;
  lessonId: string | null;
  total: number;
  correct: number;
  score: number;
  createdAt: string;
}

export function practiceScore(items: Pick<PracticeItem, 'correct'>[]): { correct: number; score: number } {
  const correct = items.filter((i) => i.correct).length;
  return { correct, score: items.length ? Math.round((correct / items.length) * 100) : 0 };
}
