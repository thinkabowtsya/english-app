/**
 * Datamuse (https://www.datamuse.com/api/, gratis tanpa key) untuk "kata serupa" dan kata yang sering
 * dipakai bersama (collocation). Bagian ini murni (rencana query & penyaringan hasil) agar bisa dites;
 * pemanggilan jaringannya ada di lib/server/datamuse.ts.
 */

/** Hasil Datamuse yang disimpan di detail item. */
export interface WordLinks {
  /** Sinonim / kata dengan arti mirip (bahasa Inggris). */
  similar: string[];
  /** Kelompok frasa yang lazim, mis. "Sifat + decision": ["final decision", "important decision"]. */
  collocations: { label: string; phrases: string[] }[];
}

/** Relasi Datamuse yang dipakai. */
export type DatamuseRelation =
  | 'rel_syn' // sinonim
  | 'ml' // arti mirip
  | 'rel_jjb' // adjective yang sering menjelaskan noun ini
  | 'rel_jja' // noun yang sering dijelaskan adjective ini
  | 'rel_bga' // kata yang sering muncul SETELAH kata ini
  | 'rel_bgb'; // kata yang sering muncul SEBELUM kata ini

export interface LinkQuery {
  relation: DatamuseRelation;
  word: string;
  /** Judul kelompok di UI. */
  label: string;
  /** Susun frasa dari kata hasil Datamuse. */
  phrase: (found: string) => string;
}

export interface LinkPlan {
  /** Kata yang dicari sinonimnya (null = tanpa kata serupa, mis. untuk collocation). */
  similarOf: string | null;
  collocations: LinkQuery[];
  /** Saring kata serupa, mis. hanya kata Oxford 3000 agar tidak muncul kata langka (sullen, sonorous). */
  keepSimilar?: (word: string) => boolean;
}

/** Kata fungsi yang tidak berguna sebagai pasangan collocation. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'yet', 'if', 'than', 'that', 'this', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'has', 'have', 'had', 'do', 'does', 'did',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'which', 'who', 'whom', 'what', 'there', 'here',
  's', 't', 'not', 'no', 'as', 'also', 'such', 'other', 'own', 'same', 'any', 'some', 'all', 'one',
]);

const MAX_SIMILAR = 8;
const MAX_PHRASES = 8;

/** Hanya kata/frasa pendek berhuruf biasa (Datamuse kadang mengembalikan singkatan atau simbol). */
function usable(word: string): boolean {
  return /^[a-z]+(?:[ -][a-z]+)?$/.test(word) && word.length >= 2 && word.length <= 30;
}

/** Ambil kata dari respons Datamuse ([{ word, score }]) yang layak dipakai. */
export function datamuseWords(raw: unknown, exclude: string, allowStopwords = false): string[] {
  if (!Array.isArray(raw)) return [];
  const self = exclude.toLowerCase();
  const out: string[] = [];
  for (const row of raw) {
    const word = typeof row?.word === 'string' ? row.word.trim().toLowerCase() : '';
    if (!usable(word) || word === self || out.includes(word)) continue;
    if (!allowStopwords && STOPWORDS.has(word)) continue;
    out.push(word);
  }
  return out;
}

/** Gabungkan sinonim lalu kata ber-arti mirip, tanpa duplikat & tanpa yang sudah dijelaskan AI. */
export function mergeSimilar(synonyms: string[], meansLike: string[], already: string[] = []): string[] {
  const skip = new Set(already.map((w) => w.toLowerCase()));
  const out: string[] = [];
  for (const w of [...synonyms, ...meansLike]) {
    if (skip.has(w) || out.includes(w) || w.includes(' ')) continue;
    out.push(w);
    if (out.length >= MAX_SIMILAR) break;
  }
  return out;
}

/** Susun kelompok collocation; kelompok kosong dibuang. */
export function buildCollocations(results: { query: LinkQuery; words: string[] }[]): WordLinks['collocations'] {
  const groups: WordLinks['collocations'] = [];
  for (const { query, words } of results) {
    const phrases = words.slice(0, MAX_PHRASES).map(query.phrase);
    if (phrases.length === 0) continue;
    const existing = groups.find((g) => g.label === query.label);
    if (existing) existing.phrases = [...new Set([...existing.phrases, ...phrases])].slice(0, MAX_PHRASES);
    else groups.push({ label: query.label, phrases });
  }
  return groups;
}

/** Rencana query untuk satu kata Oxford berdasarkan jenis katanya. */
export function planForWord(word: string, pos: string[]): LinkPlan {
  const kinds = new Set(pos.map((p) => p.toLowerCase()));
  const has = (k: string) => [...kinds].some((p) => p.includes(k));
  const collocations: LinkQuery[] = [];
  if (has('noun')) {
    collocations.push({ relation: 'rel_jjb', word, label: `Sifat + ${word}`, phrase: (w) => `${w} ${word}` });
  }
  if (has('adjective')) {
    collocations.push({ relation: 'rel_jja', word, label: `${word} + benda`, phrase: (w) => `${word} ${w}` });
  }
  // Kata setelahnya hanya berguna untuk verb (depend on, make sure); untuk noun isinya kebanyakan kata fungsi.
  if (has('verb') || collocations.length === 0) {
    collocations.push({ relation: 'rel_bga', word, label: `${word} + …`, phrase: (w) => `${word} ${w}` });
  }
  return { similarOf: word, collocations };
}

/**
 * Rencana query untuk satu collocation: cari pasangan lain untuk kata intinya, mis.
 * "make a decision" → adjective untuk "decision" (final decision, important decision).
 */
export function planForCollocation(text: string, group: string): LinkPlan {
  const words = text.toLowerCase().split(/\s+/).filter((w) => /^[a-z]+$/.test(w));
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return { similarOf: null, collocations: [] };

  const nounAdjectives = (noun: string): LinkQuery => ({
    relation: 'rel_jjb',
    word: noun,
    label: `Sifat + ${noun}`,
    phrase: (w) => `${w} ${noun}`,
  });
  const followers = (head: string): LinkQuery => ({
    relation: 'rel_bga',
    word: head,
    label: `${head} + …`,
    phrase: (w) => `${head} ${w}`,
  });

  switch (group) {
    case 'verb-noun':
    case 'adj-noun':
    case 'noun-phrase':
      return { similarOf: null, collocations: [nounAdjectives(last)] };
    case 'adv-adj':
      return {
        similarOf: null,
        collocations: [{ relation: 'rel_bgb', word: last, label: `… + ${last}`, phrase: (w) => `${w} ${last}` }],
      };
    case 'verb-prep':
    case 'verb-adv':
      return { similarOf: null, collocations: [followers(first)] };
    default:
      return { similarOf: null, collocations: [followers(first)] };
  }
}
