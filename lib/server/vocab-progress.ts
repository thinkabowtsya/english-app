import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecallItemSource, RecallQuestion } from '@/lib/recall';
import { SRS_COLUMNS, reviewColumns, toSrsState, type SrsRow, type SrsState } from '@/lib/srs';

/**
 * Progres kosakata (Oxford 3000 & collocation) dari oxford_words / collocation_progress:
 * dipakai Kosakata saya, kartu Dashboard, pembuat soal Recall, dan penyimpanan hasil Recall.
 */

export const PROGRESS_TABLES: Record<RecallItemSource, { table: string; column: string }> = {
  oxford: { table: 'oxford_words', column: 'word' },
  collocation: { table: 'collocation_progress', column: 'item' },
};

export interface ProgressEntry extends SrsState {
  item: string;
}

function logError(action: string, error: { message: string; code?: string }) {
  console.warn(`[vocab-progress] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

/** Semua item yang sudah ditandai dipelajari, atau null bila tabel tidak bisa dibaca. */
export async function readLearnedProgress(
  supabase: SupabaseClient,
  source: RecallItemSource,
): Promise<ProgressEntry[] | null> {
  const { table, column } = PROGRESS_TABLES[source];
  const { data, error } = await supabase
    .from(table)
    .select(`${column}, ${SRS_COLUMNS}`)
    .not('learned_at', 'is', null);
  if (error) {
    logError(`membaca ${table}`, error);
    return null;
  }
  return (data as unknown as (SrsRow & Record<string, string>)[]).map((r) => ({ item: r[column], ...toSrsState(r) }));
}

/**
 * Terapkan hasil latihan kosakata ke jadwal pengulangan: benar → jarak ulang makin panjang,
 * salah → ulang besok. Item yang sama muncul dua kali dihitung sekali (hasil terakhir).
 */
export async function applyVocabResults(
  supabase: SupabaseClient,
  answers: { item: string; source: RecallItemSource; correct: boolean }[],
  now: number,
): Promise<void> {
  for (const source of Object.keys(PROGRESS_TABLES) as RecallItemSource[]) {
    const { table, column } = PROGRESS_TABLES[source];
    const results = new Map<string, boolean>();
    for (const a of answers) if (a.source === source) results.set(a.item, a.correct);
    if (results.size === 0) continue;

    const { data, error } = await supabase
      .from(table)
      .select(`${column}, ${SRS_COLUMNS}`)
      .in(column, [...results.keys()]);
    if (error) {
      logError(`membaca ${table}`, error);
      continue;
    }
    const states = new Map(
      (data as unknown as (SrsRow & Record<string, string>)[]).map((r) => [r[column], toSrsState(r)]),
    );

    const rows = [...results].flatMap(([item, correct]) => {
      const cols = reviewColumns(states.get(item) ?? null, correct, now);
      return cols ? [{ [column]: item, ...cols }] : [];
    });
    if (rows.length === 0) continue;
    const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict: `user_id,${column}` });
    if (upsertError) logError(`memperbarui jadwal ${table}`, upsertError);
  }
}

/** Hasil satu sesi Recall (pilihan ganda) → jadwal pengulangan. */
export function applyRecallResults(
  supabase: SupabaseClient,
  questions: Pick<RecallQuestion, 'item' | 'source' | 'answer' | 'chosen'>[],
  now: number,
): Promise<void> {
  return applyVocabResults(
    supabase,
    questions.map((q) => ({ item: q.item, source: q.source, correct: q.chosen === q.answer })),
    now,
  );
}
