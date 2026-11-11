import 'server-only';
import {
  buildCollocations,
  datamuseWords,
  mergeSimilar,
  type DatamuseRelation,
  type LinkPlan,
  type WordLinks,
} from '@/lib/datamuse';

/**
 * Pemanggil Datamuse (gratis, tanpa key; batas wajar ±100.000 permintaan/hari). Opsional: bila gagal
 * atau timeout, detail tetap dipakai tanpa data Datamuse. Hasil per query di-cache di memori server.
 */

const BASE_URL = 'https://api.datamuse.com/words';
const TIMEOUT_MS = 4_000;
const CACHE_MAX = 1_000;
/** bga/bgb banyak berisi kata fungsi; ambil lebih banyak agar setelah disaring masih ada isinya. */
const MAX_BY_RELATION: Record<DatamuseRelation, number> = {
  rel_syn: 12,
  ml: 15,
  rel_jjb: 15,
  rel_jja: 15,
  rel_bga: 40,
  rel_bgb: 40,
};

const cache = new Map<string, unknown[]>();

/** Satu query Datamuse; null bila gagal (bukan hasil kosong). */
async function query(relation: DatamuseRelation, word: string): Promise<unknown[] | null> {
  const key = `${relation}:${word}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url = `${BASE_URL}?${relation}=${encodeURIComponent(word)}&max=${MAX_BY_RELATION[relation]}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[datamuse] ${relation}=${word}: HTTP ${res.status}`);
      return null;
    }
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return null;
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, rows);
    return rows;
  } catch (error: unknown) {
    console.warn(`[datamuse] ${relation}=${word}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Jalankan rencana query. `complete` = semua query berhasil (hasil boleh disimpan permanen);
 * bila ada yang gagal, hasil tetap dikembalikan tetapi sebaiknya tidak disimpan agar dicoba lagi.
 */
export async function lookupWordLinks(
  plan: LinkPlan,
  alreadySimilar: string[] = [],
): Promise<{ links: WordLinks; complete: boolean }> {
  const keepSimilar = plan.keepSimilar ?? (() => true);
  const similarOf = plan.similarOf;
  const [syn, ml, ...colloc] = await Promise.all([
    similarOf ? query('rel_syn', similarOf) : Promise.resolve([]),
    similarOf ? query('ml', similarOf) : Promise.resolve([]),
    ...plan.collocations.map((q) => query(q.relation, q.word)),
  ]);

  const similar = similarOf
    ? mergeSimilar(
        datamuseWords(syn, similarOf).filter(keepSimilar),
        datamuseWords(ml, similarOf).filter(keepSimilar),
        [similarOf, ...alreadySimilar],
      )
    : [];
  const collocations = buildCollocations(
    plan.collocations.map((q, i) => ({
      query: q,
      // Preposition setelah verb (depend on) tetap dipakai; kata fungsi lain dibuang.
      words: datamuseWords(colloc[i], q.word),
    })),
  );
  const complete = syn !== null && ml !== null && colloc.every((r) => r !== null);
  return { links: { similar, collocations }, complete };
}
