import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { COLLOCATIONS } from '@/data/collocations/items';
import { OXFORD_LEVELS, OXFORD_WORDS } from '@/data/oxford/words';
import { pickRecallItems, type RecallPoolItem, type RecallSource } from '@/lib/recall';
import { srsStatus } from '@/lib/srs';
import { readLearnedProgress, type ProgressEntry } from './vocab-progress';

/**
 * Kumpulan kata/collocation untuk soal latihan kosakata (Recall dan mode ketik/dikte/buat kalimat).
 * Urutan: jatuh tempo diulang → sudah dipelajari → belum dipelajari dari level/kelompok paling awal.
 */

/** Cadangan dibatasi agar pengacakan tetap ringan. */
const FALLBACK_LIMIT = 200;

const oxfordByWord = new Map(OXFORD_WORDS.map((w) => [w.word, w]));
const collocationByText = new Map(COLLOCATIONS.map((c) => [c.text, c]));

function oxfordItem(word: string, learned: boolean, due = false): RecallPoolItem | null {
  const w = oxfordByWord.get(word);
  return w ? { item: w.word, source: 'oxford', learned, due, hint: `${w.pos.join(', ')}; CEFR ${w.level}` } : null;
}

function collocationItem(text: string, learned: boolean, due = false): RecallPoolItem | null {
  const c = collocationByText.get(text);
  if (!c) return null;
  return { item: c.text, source: 'collocation', learned, due, hint: `meaning (Indonesian): ${c.meaningId}` };
}

export async function buildVocabPool(
  supabase: SupabaseClient | null,
  source: RecallSource,
  count: number,
  seed: number,
): Promise<{ pool: RecallPoolItem[]; learnedCount: number; dueCount: number }> {
  const useOxford = source !== 'collocation';
  const useCollocation = source !== 'oxford';

  const [oxfordLearned, collocationLearned] = supabase
    ? await Promise.all([
        useOxford ? readLearnedProgress(supabase, 'oxford') : Promise.resolve([]),
        useCollocation ? readLearnedProgress(supabase, 'collocation') : Promise.resolve([]),
      ])
    : [[], []];

  const now = Date.now();
  const isDue = (e: ProgressEntry) => srsStatus(e, now) === 'due';
  const learnedItems = (due: boolean) =>
    [
      ...(oxfordLearned ?? []).filter((e) => isDue(e) === due).map((e) => oxfordItem(e.item, true, due)),
      ...(collocationLearned ?? []).filter((e) => isDue(e) === due).map((e) => collocationItem(e.item, true, due)),
    ].filter((p): p is RecallPoolItem => p !== null);

  const oxfordSet = new Set((oxfordLearned ?? []).map((e) => e.item));
  const collocationSet = new Set((collocationLearned ?? []).map((e) => e.item));
  const level = OXFORD_LEVELS.find((l) => OXFORD_WORDS.some((w) => w.level === l && !oxfordSet.has(w.word))) ?? 'A1';
  const fallback = [
    ...(useOxford
      ? OXFORD_WORDS.filter((w) => w.level === level && !oxfordSet.has(w.word))
          .slice(0, FALLBACK_LIMIT)
          .map((w) => oxfordItem(w.word, false))
      : []),
    ...(useCollocation
      ? [...COLLOCATIONS]
          .filter((c) => !collocationSet.has(c.text))
          .sort((a, b) => a.level.localeCompare(b.level))
          .slice(0, FALLBACK_LIMIT)
          .map((c) => collocationItem(c.text, false))
      : []),
  ].filter((p): p is RecallPoolItem => p !== null);

  const dueItems = learnedItems(true);
  return {
    pool: pickRecallItems([dueItems, learnedItems(false), fallback], count, seed),
    learnedCount: oxfordSet.size + collocationSet.size,
    dueCount: dueItems.length,
  };
}
