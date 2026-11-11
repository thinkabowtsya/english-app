import { z } from 'zod';

/**
 * Riwayat & penilaian Telepon AI (tabel call_sessions). Setelah panggilan selesai, AI menilai
 * seluruh ucapan pengguna — tanpa menilai huruf kapital & tanda baca, karena teksnya berasal
 * dari pengenalan suara.
 */

export interface CallAssessment {
  overall: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  interaction: number;
  /** Perkiraan level CEFR dari panggilan ini, mis. "B1". */
  level: string;
  /** Ringkasan singkat (bahasa Indonesia). */
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Kalimat pengguna + versi yang lebih natural. */
  betterPhrases: { said: string; better: string; note: string }[];
}

export const ASSESSMENT_SCORES = [
  { key: 'fluency', label: 'Kelancaran' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'vocabulary', label: 'Kosakata' },
  { key: 'interaction', label: 'Interaksi' },
] as const;

const score = z.coerce.number().min(0).max(100).transform(Math.round);
const text = (max: number) => z.string().trim().min(1).max(max);

const aiAssessmentSchema = z.object({
  overall: score,
  fluency: score,
  grammar: score,
  vocabulary: score,
  interaction: score,
  level: z.string().trim().max(10).catch(''),
  summary: text(600),
  strengths: z.array(text(300)).max(5).catch([]),
  improvements: z.array(text(300)).max(5).catch([]),
  betterPhrases: z
    .array(z.object({ said: text(300), better: text(300), note: z.string().trim().max(300).catch('') }))
    .max(6)
    .catch([]),
});

/** Saran soal huruf kapital / tanda baca tidak relevan untuk teks dari pengenalan suara. */
const FORMATTING_ADVICE = /tanda baca|huruf (besar|kapital)|kapitalisasi|punctuation|capitali[sz]/i;

/**
 * Buang bagian kalimat yang membahas kapital/tanda baca (mis. "... serta tambahkan tanda baca").
 * Bila tidak ada pemisah sebelum bagian itu, seluruh catatan dibuang.
 */
export function stripFormattingAdvice(note: string): string {
  const match = FORMATTING_ADVICE.exec(note);
  if (!match) return note;
  const before = note.slice(0, match.index);
  const cut = Math.max(...[' serta ', ' dan ', '; ', ', '].map((sep) => before.lastIndexOf(sep)));
  return cut > 0 ? note.slice(0, cut).trim().replace(/[,;]$/, '') : '';
}

export function parseAiAssessment(raw: unknown): CallAssessment | null {
  const parsed = aiAssessmentSchema.safeParse(raw);
  if (!parsed.success) return null;
  // Contoh "lebih natural" yang hanya beda kapital/tanda baca tidak berguna untuk ucapan.
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const a = parsed.data;
  return {
    ...a,
    strengths: a.strengths.filter((s) => !FORMATTING_ADVICE.test(s)),
    improvements: a.improvements.filter((s) => !FORMATTING_ADVICE.test(s)),
    betterPhrases: a.betterPhrases
      .filter((p) => norm(p.said) !== norm(p.better))
      .map((p) => ({ ...p, note: stripFormattingAdvice(p.note) })),
  };
}

const lineSchema = z.object({
  role: z.enum(['user', 'ai']),
  text: z.string().trim().min(1).max(2_000),
  time: z.string().max(20),
  // Koreksi per kalimat dari /api/correction; disimpan apa adanya untuk ditinjau ulang.
  correction: z.unknown().optional(),
});

export const callSessionSchema = z.object({
  topic: text(200),
  durationSeconds: z.number().int().min(0).max(86_400),
  lines: z.array(lineSchema).min(1).max(600),
});

export type CallLineRecord = z.infer<typeof lineSchema>;

export interface CallSessionSummary {
  id: string;
  topic: string;
  durationSeconds: number;
  userTurns: number;
  overallScore: number | null;
  createdAt: string;
}

export interface CallSessionDetail extends CallSessionSummary {
  lines: CallLineRecord[];
  assessment: CallAssessment | null;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
