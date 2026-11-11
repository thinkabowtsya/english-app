/**
 * Buku kesalahan pribadi: kesalahan dari Telepon AI dan latihan dikelompokkan ke pola tetap ini,
 * agar kesalahan yang mirip terkumpul dan bisa dilatih ulang per pola (tabel mistakes).
 * ID pola juga dipakai AI saat mengoreksi (/api/correction) dan membuat soal (/api/practice/generate).
 */

export const MISTAKE_PATTERNS = [
  { id: 'verb-s', label: 'Akhiran -s/-es (he/she/it)', hint: 'She works, he goes, the system runs' },
  { id: 'do-does-did', label: 'Do / does / did di tanya & negatif', hint: "Does he work? · I don't know · Did you see?" },
  { id: 'be-verb', label: 'Am / is / are / was / were', hint: 'I am tired · they are ready · it was slow' },
  { id: 'past-tense', label: 'Bentuk lampau (V2)', hint: 'yesterday I went · we fixed the bug' },
  { id: 'perfect', label: 'Present perfect', hint: "I have finished · she hasn't replied yet" },
  { id: 'continuous', label: 'Bentuk -ing (sedang)', hint: 'I am working on it · we were testing' },
  { id: 'future-modal', label: 'Will / can / should + verb dasar', hint: 'I will send · you can try · it should work' },
  { id: 'verb-form', label: 'Bentuk kata kerja lain', hint: 'enjoy working · want to go · make it work' },
  { id: 'article', label: 'A / an / the', hint: 'a bug · an issue · the server' },
  { id: 'plural-noun', label: 'Jamak & kata benda tak terhitung', hint: 'two files · some information (bukan informations)' },
  { id: 'preposition', label: 'Preposisi', hint: 'at 9 · on Monday · in the office · depend on' },
  { id: 'pronoun', label: 'Kata ganti', hint: 'me/my/mine · he/him/his' },
  { id: 'word-order', label: 'Urutan kata', hint: 'What does it mean? · I always check · a big new server' },
  { id: 'word-choice', label: 'Pilihan kata & collocation', hint: 'make a decision · do homework · say vs tell' },
  { id: 'adjective-adverb', label: 'Kata sifat vs keterangan', hint: 'work quickly · a quick fix · good vs well' },
  { id: 'conjunction', label: 'Kata sambung & kalimat', hint: 'because · so · although · kalimat terlalu panjang' },
  { id: 'other', label: 'Lainnya', hint: 'Kesalahan lain yang tidak masuk pola di atas' },
] as const;

export type MistakePatternId = (typeof MISTAKE_PATTERNS)[number]['id'];
export const MISTAKE_PATTERN_IDS = MISTAKE_PATTERNS.map((p) => p.id) as [MistakePatternId, ...MistakePatternId[]];

const IDS = new Set<string>(MISTAKE_PATTERN_IDS);
export function isMistakePattern(value: unknown): value is MistakePatternId {
  return typeof value === 'string' && IDS.has(value);
}

export function patternLabel(id: string): string {
  return MISTAKE_PATTERNS.find((p) => p.id === id)?.label ?? 'Lainnya';
}

/** Daftar pola untuk prompt AI: "id: label (contoh)". */
export const PATTERN_PROMPT_LIST = MISTAKE_PATTERNS.map((p) => `${p.id}: ${p.label} (${p.hint})`).join('\n');

/** Latihan pola dianggap berhasil (kesalahan pola itu ditandai teratasi) bila skornya minimal ini. */
export const RESOLVE_SCORE = 80;

export type MistakeStatus = 'open' | 'resolved' | 'dismissed';

export interface MistakeEntry {
  id: string;
  source: 'call' | 'practice';
  pattern: MistakePatternId;
  wrong: string;
  correct: string;
  explanation: string | null;
  context: string | null;
  status: MistakeStatus;
  createdAt: string;
}

export interface MistakePatternSummary {
  id: MistakePatternId;
  label: string;
  hint: string;
  open: number;
  resolved: number;
  lastAt: string | null;
  entries: MistakeEntry[];
}

/** Kelompokkan per pola; pola dengan kesalahan terbuka terbanyak (lalu terbaru) di atas. */
export function groupMistakes(entries: MistakeEntry[]): MistakePatternSummary[] {
  const groups = new Map<MistakePatternId, MistakePatternSummary>();
  for (const e of entries) {
    if (e.status === 'dismissed') continue;
    const def = MISTAKE_PATTERNS.find((p) => p.id === e.pattern) ?? MISTAKE_PATTERNS[MISTAKE_PATTERNS.length - 1];
    const g =
      groups.get(def.id) ??
      ({ id: def.id, label: def.label, hint: def.hint, open: 0, resolved: 0, lastAt: null, entries: [] } as MistakePatternSummary);
    if (e.status === 'open') g.open += 1;
    else g.resolved += 1;
    if (!g.lastAt || e.createdAt > g.lastAt) g.lastAt = e.createdAt;
    g.entries.push(e);
    groups.set(def.id, g);
  }
  for (const g of groups.values()) g.entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...groups.values()].sort((a, b) => b.open - a.open || (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}
