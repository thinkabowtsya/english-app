import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { createServerSupabase } from '@/lib/supabase/server';
import type { VocabCard } from '@/lib/types';
import { VOCAB_CATEGORIES, VOCAB_LEVELS, parseAiVocabItems, wordKey } from '@/lib/vocab/cards';
import { enrichCard } from '@/lib/vocab/enrich';

/**
 * Endpoint /vocabulary. POST membuat set kartu baru (Groq), melengkapinya dengan IPA/audio
 * (Free Dictionary) dan foto (Pexels), lalu menyimpannya ke tabel vocab_cards bila login.
 * GET mengembalikan koleksi kartu tersimpan untuk satu level & kategori.
 *
 * `storage`: 'saved' (tersimpan di Supabase), 'guest' (belum login), atau 'unavailable'
 * (Supabase belum dikonfigurasi / migrasi vocab_cards belum dijalankan).
 */

type Storage = 'saved' | 'guest' | 'unavailable';

const filterSchema = z.object({
  category: z.enum(VOCAB_CATEGORIES).default('Daily'),
  level: z.enum(VOCAB_LEVELS).default('B2'),
});

const schema = filterSchema.extend({
  count: z.number().int().min(1).max(12).default(6),
});

/** Kata yang sudah dikoleksi dikirim ke AI agar tidak dibuat ulang (dibatasi agar prompt tetap kecil). */
const AVOID_LIMIT = 60;
const COLLECTION_LIMIT = 200;

interface VocabRow {
  word_key: string;
  card: VocabCard;
}

async function getStore(isGuest: boolean): Promise<{ supabase: SupabaseClient | null; storage: Storage }> {
  if (isGuest) return { supabase: null, storage: 'guest' };
  const supabase = await createServerSupabase();
  return supabase ? { supabase, storage: 'saved' } : { supabase: null, storage: 'unavailable' };
}

function logStoreError(action: string, error: { message: string; code?: string }) {
  console.warn(`[api/vocabulary] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const filter = filterSchema.safeParse({
    category: url.searchParams.get('category') ?? undefined,
    level: url.searchParams.get('level') ?? undefined,
  });
  if (!filter.success) return jsonError(400, 'Filter tidak valid.');

  const { supabase, storage } = await getStore(auth.isGuest);
  if (!supabase) return NextResponse.json({ items: [], storage });

  const { data, error } = await supabase
    .from('vocab_cards')
    .select('word_key, card')
    .eq('cefr', filter.data.level)
    .eq('category', filter.data.category)
    .order('created_at', { ascending: false })
    .limit(COLLECTION_LIMIT);
  if (error) {
    logStoreError('membaca koleksi', error);
    return NextResponse.json({ items: [], storage: 'unavailable' satisfies Storage });
  }
  return NextResponse.json({ items: (data as VocabRow[]).map((r) => r.card), storage });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 2 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const { category, level, count } = body.data;
  let { supabase, storage } = await getStore(auth.isGuest);

  let avoidWords: string[] = [];
  if (supabase) {
    const { data, error } = await supabase
      .from('vocab_cards')
      .select('word')
      .eq('cefr', level)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(AVOID_LIMIT);
    if (error) {
      logStoreError('membaca kata tersimpan', error);
      supabase = null;
      storage = 'unavailable';
    } else {
      avoidWords = (data as { word: string }[]).map((r) => r.word);
    }
  }

  const avoidLine = avoidWords.length
    ? `\nThe learner already knows these words, so DO NOT use any of them: ${avoidWords.join(', ')}\n`
    : '';

  const systemPrompt = `You are a curriculum developer for English vocabulary learning.
Generate ${count} essential English vocabulary words or idioms for Indonesian learners.
Target Category: ${category}
Target CEFR Level: ${level}
${avoidLine}
Return ONLY a JSON object formatted as follows:
{
  "items": [
    {
      "id": string (unique slug/id),
      "word": string,
      "phonetic": string (IPA phonetic transcription),
      "partOfSpeech": string (noun, verb, adjective, phrase, idiom, etc.),
      "definitionEn": string (clear definition in simple English),
      "definitionId": string (Indonesian translation of definition),
      "exampleEn": string (natural example sentence in English),
      "exampleId": string (Indonesian translation of example sentence),
      "cefr": "${level}",
      "category": "${category}",
      "collocations": [string, string, string],
      "imageQuery": string (2-4 English words for a stock-photo search that visually shows the meaning, e.g. "people shaking hands" for "make a deal")
    }
  ]
}

DO NOT include markdown code blocks or extra text. Output ONLY valid JSON.`;

  let parsed: ReturnType<typeof parseAiVocabItems>;
  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} items now.` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });

    const content = completion.choices[0]?.message?.content || '{"items":[]}';
    parsed = parseAiVocabItems(JSON.parse(content), level, category);
  } catch (error: unknown) {
    console.error('[api/vocabulary]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Gagal membuat daftar kosakata. Coba lagi nanti.');
  }

  // Kata yang sudah ada di koleksi (mis. di level lain) dipakai ulang tanpa memanggil API pelengkap lagi.
  const existing = new Map<string, VocabCard>();
  if (supabase && parsed.length) {
    const { data, error } = await supabase
      .from('vocab_cards')
      .select('word_key, card')
      .in('word_key', parsed.map((p) => wordKey(p.card.word)));
    if (error) logStoreError('mencari kata yang sama', error);
    else for (const row of data as VocabRow[]) existing.set(row.word_key, row.card);
  }

  const items = await Promise.all(
    parsed.map((p) => existing.get(wordKey(p.card.word)) ?? enrichCard(p.card, p.imageQuery)),
  );

  const fresh = items.filter((c) => !existing.has(wordKey(c.word)));
  if (supabase && fresh.length) {
    const { error } = await supabase
      .from('vocab_cards')
      .upsert(
        fresh.map((card) => ({ word: card.word, cefr: card.cefr, category: card.category, card })),
        { onConflict: 'user_id,word_key', ignoreDuplicates: true },
      );
    if (error) {
      logStoreError('menyimpan kartu', error);
      storage = 'unavailable';
    }
  }

  return NextResponse.json({ items, storage });
}
