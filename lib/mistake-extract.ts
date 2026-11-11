import { normalizeSpoken } from '@/lib/correction-filter';
import type { PracticeItem, PracticeKind } from '@/lib/practice';

/**
 * Mengubah hasil Telepon AI dan latihan menjadi entri Buku kesalahan (tabel mistakes).
 * Murni (tanpa I/O) agar mudah diuji; penyimpanan ada di lib/server/mistakes.ts.
 */

export interface MistakeDraft {
  source: 'call' | 'practice';
  sourceRef: string;
  /** Kunci unik dalam satu sesi (mis. "3:0" = baris 3, kesalahan ke-0) agar pengumpulan ulang tidak dobel. */
  refKey: string;
  /** Pola dari AI; boleh kosong/tidak valid — akan diklasifikasi ulang saat disimpan. */
  pattern?: string;
  wrong: string;
  correct: string;
  explanation?: string;
  context?: string;
}

interface CallLineLike {
  role: string;
  text: string;
  correction?: unknown;
}

interface MistakeLike {
  type?: string;
  original?: string;
  correction?: string;
  explanation?: string;
  pattern?: string;
}

/** Beda hanya huruf besar/kecil atau tanda baca = bukan kesalahan (teks dari pengenalan suara). */
function isRealChange(wrong: string, correct: string): boolean {
  return Boolean(wrong.trim() && correct.trim()) && normalizeSpoken(wrong) !== normalizeSpoken(correct);
}

/** Kesalahan dari koreksi per kalimat di Telepon AI. */
export function mistakesFromCall(sessionId: string, lines: CallLineLike[]): MistakeDraft[] {
  const out: MistakeDraft[] = [];
  lines.forEach((line, i) => {
    if (line.role !== 'user') return;
    const mistakes = (line.correction as { mistakes?: unknown } | undefined)?.mistakes;
    if (!Array.isArray(mistakes)) return;
    (mistakes as MistakeLike[]).forEach((m, j) => {
      if (m?.type === 'punctuation') return;
      const wrong = String(m?.original ?? '');
      const correct = String(m?.correction ?? '');
      if (!isRealChange(wrong, correct)) return;
      out.push({
        source: 'call',
        sourceRef: sessionId,
        refKey: `${i}:${j}`,
        pattern: m.pattern,
        wrong,
        correct,
        explanation: m.explanation,
        context: line.text,
      });
    });
  });
  return out;
}

/** Jenis latihan yang kesalahannya masuk Buku kesalahan (kosakata murni ditangani jadwal ulang kata). */
const GRAMMAR_KINDS: PracticeKind[] = ['grammar', 'sentence', 'evaluation', 'mistakes', 'vocab-write'];

const fillGap = (text: string, word: string) => text.replace(/_{3,}/, word);

/** Jawaban salah di latihan → kesalahan (kalimat utuh versi salah vs benar). */
export function mistakesFromPractice(sessionId: string, kind: PracticeKind, items: PracticeItem[]): MistakeDraft[] {
  if (!GRAMMAR_KINDS.includes(kind)) return [];
  const out: MistakeDraft[] = [];
  items.forEach((it, i) => {
    const response = (it.response ?? '').trim();
    if (it.correct !== false || !response) return;
    let wrong = response;
    let correct = it.corrected || it.answer;
    let context: string | undefined = it.text || undefined;
    if ((it.type === 'choice' || it.type === 'fill') && it.text.includes('___')) {
      wrong = fillGap(it.text, response);
      correct = fillGap(it.text, it.answer);
      context = undefined;
    }
    if (it.type === 'write') context = it.vocab ? `Memakai "${it.vocab.item}"` : undefined;
    if (!isRealChange(wrong, correct)) return;
    out.push({
      source: 'practice',
      sourceRef: sessionId,
      refKey: String(i),
      pattern: it.pattern,
      wrong,
      correct,
      explanation: it.feedback || it.explanation || undefined,
      context,
    });
  });
  return out;
}
