import { z } from 'zod';
import { seededShuffle } from '@/lib/shuffle';

/**
 * Vocabulary Recall: kuis pilihan ganda yang dibuat AI dari kata Oxford 3000 dan collocation.
 * Urutan prioritas item: jatuh tempo diulang → sudah dipelajari → belum dipelajari (cadangan).
 * Hasil tiap soal menggeser jadwal pengulangan item itu (lib/srs.ts).
 * Sesi yang selesai disimpan di tabel recall_sessions (lihat migrasi recall_sessions).
 */

export const RECALL_SOURCES = [
  { id: 'mix', label: 'Campuran' },
  { id: 'oxford', label: 'Oxford 3000' },
  { id: 'collocation', label: 'Collocation' },
] as const;

export type RecallSource = (typeof RECALL_SOURCES)[number]['id'];
export type RecallItemSource = Exclude<RecallSource, 'mix'>;

export const RECALL_COUNTS = [5, 10] as const;
export const RECALL_MAX_QUESTIONS = 20;

export type RecallQuestionType = 'meaning' | 'fill' | 'pair';

export interface RecallQuestion {
  /** Kata/collocation yang diuji. */
  item: string;
  source: RecallItemSource;
  type: RecallQuestionType;
  /** Perintah soal (bahasa Indonesia). */
  prompt: string;
  /** Kalimat bahasa Inggris dengan "___" untuk soal isian; kosong untuk tipe lain. */
  sentence: string;
  options: string[];
  answer: number;
  /** Pembahasan singkat (bahasa Indonesia). */
  explanation: string;
  /** Item sudah ditandai dipelajari saat soal dibuat. */
  learned: boolean;
  /** Item sedang jatuh tempo untuk diulang saat soal dibuat. */
  due?: boolean;
  /** Jawaban pengguna (indeks opsi); diisi saat sesi disimpan. */
  chosen?: number;
}

export interface RecallPoolItem {
  item: string;
  source: RecallItemSource;
  learned: boolean;
  /** Sudah jatuh tempo untuk diulang (lib/srs.ts). */
  due: boolean;
  /** Info tambahan untuk prompt AI, mis. jenis kata atau arti. */
  hint: string;
}

/**
 * Pilih `count` item dari beberapa tingkat prioritas secara berurutan (mis. jatuh tempo → sudah
 * dipelajari → cadangan). Tiap tingkat diacak, lalu sumber oxford & collocation diselang-seling.
 */
export function pickRecallItems(tiers: RecallPoolItem[][], count: number, seed: number): RecallPoolItem[] {
  const order = (list: RecallPoolItem[], s: number) => {
    const shuffled = seededShuffle(list, s);
    const bySource = { oxford: [] as RecallPoolItem[], collocation: [] as RecallPoolItem[] };
    for (const p of shuffled) bySource[p.source].push(p);
    const mixed: RecallPoolItem[] = [];
    for (let i = 0; mixed.length < shuffled.length; i++) {
      if (bySource.oxford[i]) mixed.push(bySource.oxford[i]);
      if (bySource.collocation[i]) mixed.push(bySource.collocation[i]);
    }
    return mixed;
  };
  const seen = new Set<string>();
  const result: RecallPoolItem[] = [];
  for (const p of tiers.flatMap((tier, i) => order(tier, seed + i))) {
    const key = `${p.source}:${p.item.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(p);
    if (result.length === count) break;
  }
  return result;
}

/** Tipe soal per item, bergiliran agar bervariasi. */
export function questionTypeFor(p: RecallPoolItem, index: number): RecallQuestionType {
  const types: RecallQuestionType[] = p.source === 'collocation' ? ['pair', 'fill', 'meaning'] : ['meaning', 'fill'];
  return types[index % types.length];
}

const text = (max: number) => z.string().trim().min(1).max(max);

const aiQuestionSchema = z.object({
  item: text(120),
  prompt: text(300),
  sentence: z.string().trim().max(300).catch(''),
  options: z.array(text(160)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(500).catch(''),
});

/**
 * Validasi soal dari AI terhadap item yang diminta (urutan sama). Soal rusak, opsi ganda, atau
 * soal isian tanpa "___" dibuang. Opsi diacak di server agar jawaban tidak selalu di posisi sama.
 */
export function parseAiRecallQuestions(raw: unknown, pool: RecallPoolItem[], seed: number): RecallQuestion[] {
  const list = (raw as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return [];
  const result: RecallQuestion[] = [];
  pool.forEach((p, i) => {
    const parsed = aiQuestionSchema.safeParse(list[i]);
    if (!parsed.success) return;
    const q = parsed.data;
    if (new Set(q.options.map((o) => o.toLowerCase())).size !== 4) return;
    const type = questionTypeFor(p, i);
    if (type === 'fill' && !q.sentence.includes('___')) return;
    const correct = q.options[q.answer];
    const options = seededShuffle(q.options, seed + i);
    result.push({
      item: p.item,
      source: p.source,
      type,
      prompt: q.prompt,
      sentence: type === 'fill' ? q.sentence : '',
      options,
      answer: options.indexOf(correct),
      explanation: q.explanation,
      learned: p.learned,
      due: p.due,
    });
  });
  return result;
}

/** Bentuk sesi yang dikirim saat menyimpan (jawaban wajib terisi). */
export const recallSessionSchema = z.object({
  source: z.enum(['mix', 'oxford', 'collocation']),
  questions: z
    .array(
      z.object({
        item: text(120),
        source: z.enum(['oxford', 'collocation']),
        type: z.enum(['meaning', 'fill', 'pair']),
        prompt: text(300),
        sentence: z.string().max(300),
        options: z.array(text(160)).length(4),
        answer: z.number().int().min(0).max(3),
        explanation: z.string().max(500),
        learned: z.boolean(),
        due: z.boolean().optional(),
        chosen: z.number().int().min(0).max(3),
      }),
    )
    .min(1)
    .max(RECALL_MAX_QUESTIONS),
});

export function scoreRecall(questions: Pick<RecallQuestion, 'answer' | 'chosen'>[]): number {
  return questions.filter((q) => q.chosen === q.answer).length;
}

/** Ringkasan satu sesi di daftar riwayat. */
export interface RecallSessionSummary {
  id: string;
  source: RecallSource;
  total: number;
  correct: number;
  createdAt: string;
  /** Beberapa item yang diuji, untuk pratinjau di daftar. */
  items: string[];
}

export interface RecallHistory {
  sessions: RecallSessionSummary[];
  totals: { sessions: number; questions: number; correct: number };
  storage: 'saved' | 'guest' | 'unavailable';
}
