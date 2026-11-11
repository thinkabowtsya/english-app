import rows from './collocations.json';

/**
 * 1.000 collocation (pasangan kata yang lazim) untuk menu Collocation, dikelompokkan per pola.
 * Daftar dibuat dengan bantuan AI (Groq, per pola & tema) lalu dibersihkan dari duplikat; detail tiap collocation
 * dibuat lewat /api/collocations/detail.
 *
 * collocations.json dibuat otomatis (satu baris per item: [text, group, level, meaningId]) — jangan
 * diedit manual. Kesalahan umum tidak disimpan di sini; AI membuatnya per item di detail.
 */
export const COLLOCATION_GROUPS = [
  { id: 'verb-noun', label: 'Kerja + Benda', example: 'make a decision' },
  { id: 'adj-noun', label: 'Sifat + Benda', example: 'heavy rain' },
  { id: 'verb-prep', label: 'Kerja + Preposisi', example: 'depend on' },
  { id: 'adv-adj', label: 'Keterangan + Sifat', example: 'highly recommended' },
  { id: 'noun-phrase', label: 'Frasa Benda', example: 'a piece of advice' },
  { id: 'verb-adv', label: 'Kerja + Keterangan', example: 'speak fluently' },
] as const;

export type CollocationGroup = (typeof COLLOCATION_GROUPS)[number]['id'];
export type CollocationLevel = 'A2' | 'B1' | 'B2';

export interface Collocation {
  text: string;
  group: CollocationGroup;
  level: CollocationLevel;
  meaningId: string;
}

export const COLLOCATIONS: Collocation[] = (rows as [string, CollocationGroup, CollocationLevel, string][]).map(
  ([text, group, level, meaningId]) => ({ text, group, level, meaningId }),
);
