import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import {
  PRACTICE_KIND_IDS,
  parsePracticeItems,
  type PracticeItem,
  type PracticeItemType,
  type PracticeKind,
} from '@/lib/practice';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { findReadyLesson, lessonContext } from '@/lib/server/lesson-context';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { MISTAKE_PATTERN_IDS, PATTERN_PROMPT_LIST, patternLabel } from '@/lib/mistakes';
import { buildVocabPool } from '@/lib/server/vocab-pool';
import { createSeed, seededShuffle } from '@/lib/shuffle';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Membuat soal latihan dengan AI.
 * - grammar / sentence / evaluation: berpijak pada isi satu materi (lessonId).
 * - vocab-type / vocab-dictation / vocab-write: dari kosakata (jatuh tempo → dipelajari → baru).
 * - mistakes: per pola dari Buku kesalahan, dengan kesalahan pengguna sendiri sebagai konteks.
 */

const schema = z.object({
  kind: z.enum(PRACTICE_KIND_IDS),
  lessonId: z.string().max(80).optional(),
  count: z.number().int().min(3).max(10).default(6),
  vocabSource: z.enum(['mix', 'oxford', 'collocation']).default('mix'),
  /** Untuk kind 'mistakes': pola dari Buku kesalahan yang dilatih. */
  pattern: z.enum(MISTAKE_PATTERN_IDS).optional(),
});

/** Contoh kesalahan pengguna yang dipakai sebagai konteks soal latihan per pola. */
const MISTAKE_EXAMPLES = 8;

/** Urutan tipe soal per jenis latihan (diulang/dipotong sesuai jumlah). */
const TYPE_PLAN: Record<'grammar' | 'sentence' | 'evaluation', PracticeItemType[]> = {
  grammar: ['choice', 'fill', 'fix', 'fill', 'choice', 'fix', 'fill', 'choice', 'fix', 'fill'],
  sentence: ['arrange', 'translate', 'arrange', 'translate', 'arrange', 'translate', 'arrange', 'translate', 'arrange', 'translate'],
  evaluation: ['choice', 'fill', 'fix', 'arrange', 'translate', 'choice', 'fill', 'fix', 'arrange', 'choice'],
};

const VOCAB_TYPE: Record<'vocab-type' | 'vocab-dictation' | 'vocab-write', PracticeItemType> = {
  'vocab-type': 'type-word',
  'vocab-dictation': 'dictation',
  'vocab-write': 'write',
};

const LESSON_FORMATS = `Item formats (all instructions/prompts in simple Indonesian, all English must be natural and 100% correct):
- "choice": "prompt" = question in Indonesian; "text" = an English sentence with "___" or "" ; "options" = 4 different English options; "answer" = the exact text of the ONE correct option.
- "fill": "prompt" = instruction in Indonesian (mention the base word in brackets if a form must be changed); "text" = an English sentence with exactly one "___"; "answer" = the missing word(s); "alternatives" = other fully correct fillers (e.g. contractions).
- "fix": "prompt" = "Perbaiki kalimat berikut."; "text" = an English sentence with exactly ONE typical Indonesian-learner mistake about this lesson; "answer" = the fully corrected sentence; "alternatives" = other correct versions.
- "arrange": "prompt" = "Susun kata menjadi kalimat yang benar."; "text" = the Indonesian meaning of the sentence; "answer" = one correct English sentence of 4-10 words without commas; "alternatives" = other correct word orders, if any.
- "translate": "prompt" = "Terjemahkan ke bahasa Inggris."; "text" = an Indonesian sentence; "answer" = a natural English translation; "alternatives" = 1-3 other correct translations.
Every item also has "explanation" = 1-2 short Indonesian sentences explaining the rule, and "pattern" = the id of the grammar rule it tests, from this list:
${PATTERN_PROMPT_LIST}`;

async function complete(system: string, user: string, effort: 'low' | 'medium') {
  const completion = await getGroq().chat.completions.create({
    model: MAIN_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
    ...modelOptions(effort),
  });
  return JSON.parse(completion.choices[0]?.message?.content || '{}') as { items?: unknown[] };
}

/**
 * Pemeriksaan kedua oleh AI: soal yang kuncinya salah (mis. "Does the team deploys…") dibuang.
 * Bila pemeriksaan gagal, soal dipakai apa adanya.
 */
async function dropWrongItems(items: PracticeItem[]): Promise<PracticeItem[]> {
  const spec = items.map((it, i) => ({
    i,
    type: it.type,
    text: it.text,
    options: it.options,
    answer: it.answer,
    alternatives: it.alternatives,
  }));
  const system = `You are a strict English grammar checker. Check every quiz item below and list the ones that are WRONG.
An item is wrong if:
- "choice": the sentence with "answer" filled in is not fully correct English, or another option also gives a grammatical sentence (insert every option and check each one).
- "fill": the sentence with "answer" (or any "alternatives") filled in is not fully correct English.
- "fix": "text" has no real mistake, or "answer" is not a fully correct sentence.
- "arrange" / "translate": "answer" or any "alternatives" is not fully correct, natural English (for translate: also must match the Indonesian "text").
Items (JSON):
${JSON.stringify(spec)}
Return ONLY a JSON object: {"wrong": [number]} (the "i" of wrong items; [] if all are correct).`;
  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: 'Check the items now.' },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      ...modelOptions('medium'),
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content || '{}') as { wrong?: unknown };
    const wrong = new Set(Array.isArray(raw.wrong) ? raw.wrong.filter((n): n is number => typeof n === 'number') : []);
    if (wrong.size) console.info(`[api/practice/generate] ${wrong.size} soal dibuang oleh pemeriksa`);
    return items.filter((_, i) => !wrong.has(i));
  } catch (error: unknown) {
    console.warn('[api/practice/generate] pemeriksaan gagal:', error instanceof Error ? error.message : error);
    return items;
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 2 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');
  const { kind, lessonId, vocabSource, pattern } = body.data;
  const count = kind === 'evaluation' ? 10 : body.data.count;
  const seed = createSeed();

  try {
    if (kind === 'grammar' || kind === 'sentence' || kind === 'evaluation') {
      const lesson = lessonId ? findReadyLesson(lessonId) : null;
      if (!lesson) return jsonError(400, 'Pilih materi yang sudah tersedia.');
      const types = TYPE_PLAN[kind].slice(0, count);
      // Minta beberapa soal cadangan, karena soal yang salah kunci akan dibuang oleh pemeriksa.
      const planned = [...types, ...TYPE_PLAN[kind].slice(0, 2)];
      const system = `You write English practice questions for an Indonesian learner (beginner, CEFR A1-A2), strictly based on the lesson below.
Test ONLY the grammar points of this lesson. Use simple everyday and office/IT work contexts. Vary the sentences; do not copy the lesson examples word for word.

LESSON:
${lessonContext(lesson)}

${LESSON_FORMATS}

Return ONLY a JSON object: {"items": [ {"type": string, "prompt": string, "text": string, "options"?: [string], "answer": string, "alternatives"?: [string], "explanation": string, "pattern": string} ]}
Write exactly ${planned.length} items with these types in this order: ${JSON.stringify(planned)}. Every item must have exactly one correct answer. DO NOT include markdown.`;
      const raw = await complete(system, `Write the ${planned.length} items now.`, 'low');
      const items = (await dropWrongItems(parsePracticeItems(raw, seed, [...new Set(planned)]))).slice(0, types.length);
      if (items.length === 0) return jsonError(502, 'Soal dari AI tidak lengkap. Coba lagi.');
      return NextResponse.json({ items, title: lesson.title, lessonId: lesson.id });
    }

    const supabase = auth.isGuest ? null : await createServerSupabase();

    if (kind === 'mistakes') {
      if (!pattern) return jsonError(400, 'Pilih pola kesalahan yang ingin dilatih.');
      if (!supabase) return jsonError(401, 'Login untuk memakai Buku kesalahan.');
      const { data, error } = await supabase
        .from('mistakes')
        .select('wrong, correct, explanation')
        .eq('pattern', pattern)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(MISTAKE_EXAMPLES);
      if (error) return jsonError(503, 'Buku kesalahan tidak dapat dibaca.');
      const examples = (data as { wrong: string; correct: string; explanation: string | null }[]) ?? [];
      if (examples.length === 0) return jsonError(400, 'Tidak ada kesalahan terbuka untuk pola ini.');
      const types = TYPE_PLAN.grammar.slice(0, count);
      const planned = [...types, ...TYPE_PLAN.grammar.slice(0, 2)];
      const system = `You write targeted English practice for an Indonesian learner who keeps making the same kind of mistake.
Rule to practise: ${patternLabel(pattern)}.
The learner's own recent mistakes (wrong → correct):
${examples.map((m) => `- ${m.wrong} → ${m.correct}${m.explanation ? ` (${m.explanation})` : ''}`).join('\n')}

Write NEW items that test exactly this rule in similar everyday and office/IT situations (do not copy the sentences above word for word; reuse the same kind of trap).

${LESSON_FORMATS}

Return ONLY a JSON object: {"items": [ {"type": string, "prompt": string, "text": string, "options"?: [string], "answer": string, "alternatives"?: [string], "explanation": string} ]}
Write exactly ${planned.length} items with these types in this order: ${JSON.stringify(planned)}. Every item must have exactly one correct answer. DO NOT include markdown.`;
      const raw = await complete(system, `Write the ${planned.length} items now.`, 'low');
      const items = (await dropWrongItems(parsePracticeItems(raw, seed, [...new Set(planned)])))
        .slice(0, types.length)
        .map((it) => ({ ...it, pattern }));
      if (items.length === 0) return jsonError(502, 'Soal dari AI tidak lengkap. Coba lagi.');
      return NextResponse.json({ items, title: patternLabel(pattern), lessonId: null, pattern });
    }

    const { pool, dueCount } = await buildVocabPool(supabase, vocabSource, count, seed);
    if (pool.length === 0) return jsonError(400, 'Belum ada kata atau collocation untuk latihan.');
    const type = VOCAB_TYPE[kind as Exclude<PracticeKind, 'grammar' | 'sentence' | 'evaluation' | 'mistakes'>];
    const spec = pool.map((p) => ({ item: p.item, kind: p.source === 'oxford' ? 'word' : 'collocation', info: p.hint }));
    const formats: Partial<Record<PracticeItemType, string>> = {
      'type-word': `"type": "type-word"; "prompt" = Indonesian meaning of the item as used in the sentence, e.g. "Arti: mengambil keputusan"; "text" = a natural English sentence (8-16 words) where the item is replaced by "___" (in the exact form the sentence needs); "answer" = exactly the words that fill "___"; "alternatives" = other forms that are also fully correct in that sentence (often none); "explanation" = short Indonesian translation of the full sentence.`,
      dictation: `"type": "dictation"; "prompt" = "Dengarkan, lalu ketik kalimatnya."; "text" = ""; "answer" = one natural English sentence (6-12 words, everyday or work context) that uses the item; "explanation" = the Indonesian translation of that sentence.`,
      write: `"type": "write"; "prompt" = "Buat satu kalimat bahasa Inggris memakai \\"<item>\\"." (with the real item); "text" = short Indonesian meaning of the item plus when to use it (max 20 words); "answer" = one natural example sentence using the item; "explanation" = one short Indonesian usage tip (e.g. common collocation or grammar pattern).`,
    };
    const system = `You create vocabulary practice items for an Indonesian learner of English.
Write exactly one item for each entry below, in the same order.
Format for every item: ${formats[type]}

Entries (JSON):
${JSON.stringify(spec)}

Return ONLY a JSON object: {"items": [ {"type": string, "prompt": string, "text": string, "answer": string, "alternatives"?: [string], "explanation": string} ]}
Use only natural, correct English. DO NOT include markdown.`;
    const raw = await complete(system, `Write the ${pool.length} items now.`, 'low');
    // Kosakata yang dilatih diambil dari server (bukan dari AI) agar jadwal ulangnya tepat.
    const withVocab = {
      items: (Array.isArray(raw.items) ? raw.items : []).slice(0, pool.length).map((it, i) =>
        it && typeof it === 'object' ? { ...it, type, vocab: { item: pool[i].item, source: pool[i].source } } : it,
      ),
    };
    const items = seededShuffle(parsePracticeItems(withVocab, seed, [type]), seed);
    if (items.length === 0) return jsonError(502, 'Soal dari AI tidak lengkap. Coba lagi.');
    return NextResponse.json({ items, title: `${pool.length} kosakata`, lessonId: null, dueCount });
  } catch (error: unknown) {
    console.error('[api/practice/generate]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Gagal membuat soal. Coba lagi nanti.');
  }
}
