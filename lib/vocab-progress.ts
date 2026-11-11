import { COLLOCATIONS } from '@/data/collocations/items';
import { OXFORD_LEVELS, OXFORD_WORDS, type OxfordLevel } from '@/data/oxford/words';
import { srsStatus, type SrsState, type SrsStatus } from '@/lib/srs';
import type { StudyStorage } from '@/lib/study-list';

/**
 * Ringkasan progres kosakata dari /api/kosakata (kata Oxford & collocation yang sudah dipelajari
 * beserta jadwal pengulangannya). Dipakai halaman Kosakata saya dan kartu Dashboard.
 */

export interface VocabProgressEntry extends SrsState {
  item: string;
}

export interface VocabProgress {
  oxford: VocabProgressEntry[];
  collocation: VocabProgressEntry[];
  storage: StudyStorage;
}

export type VocabSource = 'oxford' | 'collocation';

export interface VocabRow extends VocabProgressEntry {
  source: VocabSource;
  status: SrsStatus;
  /** Info singkat: level & jenis kata (Oxford) atau arti (collocation). */
  info: string;
}

export interface VocabSummary {
  rows: VocabRow[];
  learned: number;
  mastered: number;
  learning: number;
  due: number;
  oxfordByLevel: Record<OxfordLevel, { learned: number; total: number }>;
  collocation: { learned: number; total: number };
}

const oxfordInfo = new Map(OXFORD_WORDS.map((w) => [w.word, w]));
const collocationInfo = new Map(COLLOCATIONS.map((c) => [c.text, c]));

const STATUS_ORDER: Record<SrsStatus, number> = { due: 0, learning: 1, mastered: 2 };

export function summarizeVocab(progress: Pick<VocabProgress, 'oxford' | 'collocation'>, now: number): VocabSummary {
  const rows: VocabRow[] = [
    ...progress.oxford.map((e) => {
      const w = oxfordInfo.get(e.item);
      return { ...e, source: 'oxford' as const, status: srsStatus(e, now), info: w ? `${w.level} · ${w.pos.join(', ')}` : '' };
    }),
    ...progress.collocation.map((e) => ({
      ...e,
      source: 'collocation' as const,
      status: srsStatus(e, now),
      info: collocationInfo.get(e.item)?.meaningId ?? '',
    })),
  ].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.dueAt ?? '').localeCompare(b.dueAt ?? '') ||
      a.item.localeCompare(b.item),
  );

  const oxfordByLevel = Object.fromEntries(
    OXFORD_LEVELS.map((l) => [l, { learned: 0, total: OXFORD_WORDS.filter((w) => w.level === l).length }]),
  ) as VocabSummary['oxfordByLevel'];
  for (const e of progress.oxford) {
    const level = oxfordInfo.get(e.item)?.level;
    if (level) oxfordByLevel[level].learned += 1;
  }

  const count = (s: SrsStatus) => rows.filter((r) => r.status === s).length;
  return {
    rows,
    learned: rows.length,
    mastered: count('mastered'),
    learning: count('learning'),
    due: count('due'),
    oxfordByLevel,
    collocation: { learned: progress.collocation.length, total: COLLOCATIONS.length },
  };
}
