import { z } from 'zod';
import type { VocabCard } from '@/lib/types';

export const VOCAB_CATEGORIES = ['Daily', 'Business', 'Travel', 'Academic', 'Idioms & Slang'] as const;
export const VOCAB_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

/** Satu item dari Groq. Field opsional diberi default agar satu field kurang tidak membuang kartu. */
const aiItemSchema = z.object({
  word: text(120),
  // Kartu menampilkan IPA di dalam [ ], jadi pembungkus / atau [ ] dari AI dibuang.
  phonetic: z.string().trim().max(120).transform((s) => s.replace(/^[/[]+|[/\]]+$/g, '').trim()).catch(''),
  partOfSpeech: z.string().trim().max(40).catch(''),
  definitionEn: text(400),
  definitionId: text(400),
  exampleEn: z.string().trim().max(400).catch(''),
  exampleId: z.string().trim().max(400).catch(''),
  collocations: z.array(z.string().trim().min(1).max(80)).max(6).catch([]),
  imageQuery: z.string().trim().max(80).optional().catch(undefined),
});

export interface ParsedVocabItem {
  card: VocabCard;
  imageQuery?: string;
}

export function wordKey(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Validasi keluaran AI menjadi kartu. Item rusak dibuang, kata ganda (tanpa beda huruf besar)
 * hanya diambil sekali, dan level/kategori selalu mengikuti permintaan, bukan tebakan AI.
 */
export function parseAiVocabItems(
  raw: unknown,
  level: VocabCard['cefr'],
  category: VocabCard['category'],
): ParsedVocabItem[] {
  const items = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: ParsedVocabItem[] = [];
  for (const item of items) {
    const parsed = aiItemSchema.safeParse(item);
    if (!parsed.success) continue;
    const { imageQuery, ...fields } = parsed.data;
    const key = wordKey(fields.word);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      card: { id: key.replace(/[^a-z0-9]+/g, '-'), ...fields, cefr: level, category },
      imageQuery: imageQuery || undefined,
    });
  }
  return result;
}
