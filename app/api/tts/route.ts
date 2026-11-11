import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { TTS_MAX_CHARS, TTS_VOICE_IDS } from '@/lib/tts';

/**
 * Text-to-speech natural lewat Groq Orpheus (canopylabs/orpheus-v1-english), keluaran WAV.
 * Hasil disimpan di cache memori server (dibatasi ukurannya) dan klien juga menyimpannya
 * di Cache Storage browser, sehingga kalimat yang sama tidak dibuat ulang.
 * Bila gagal, klien kembali ke suara browser (lib/speech.ts).
 */

const MODEL = 'canopylabs/orpheus-v1-english';
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

const schema = z.object({
  text: z.string().trim().min(1).max(TTS_MAX_CHARS),
  voice: z.enum(TTS_VOICE_IDS),
});

/** Batas terpisah dari endpoint AI teks: satu halaman bisa memutar beberapa potongan berurutan. */
const TTS_RATE_LIMIT = { limit: 40, windowMs: 60_000 };

/** Cache LRU sederhana di memori proses (per instance server). */
const CACHE_MAX_BYTES = 40 * 1024 * 1024;
const cache = new Map<string, ArrayBuffer>();
let cacheBytes = 0;

function cacheGet(key: string): ArrayBuffer | undefined {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, audio: ArrayBuffer) {
  if (audio.byteLength > CACHE_MAX_BYTES / 4) return;
  cache.set(key, audio);
  cacheBytes += audio.byteLength;
  for (const [k, v] of cache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(k);
    cacheBytes -= v.byteLength;
  }
}

function wavResponse(audio: ArrayBuffer, cacheStatus: 'HIT' | 'MISS') {
  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'private, no-store',
      'X-TTS-Cache': cacheStatus,
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;

  const body = await readJsonBody(req, schema, 4 * 1024);
  if (!body.ok) return body.response;
  const { text, voice } = body.data;

  const key = `${voice}\n${text}`;
  const hit = cacheGet(key);
  if (hit) return wavResponse(hit, 'HIT');

  const limit = checkRateLimit(`tts:${auth.userId}`, TTS_RATE_LIMIT.limit, TTS_RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return jsonError(429, 'Terlalu banyak permintaan suara. Coba lagi sebentar lagi.', {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return jsonError(503, 'Suara natural belum dikonfigurasi di server.');
  const baseUrl = (process.env.GROQ_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');

  try {
    const res = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice, input: text, response_format: 'wav' }),
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[api/tts] Groq ${res.status}: ${detail.slice(0, 200)}`);
      return jsonError(res.status === 429 ? 429 : 502, 'Suara natural sedang tidak tersedia.');
    }
    const audio = await res.arrayBuffer();
    cacheSet(key, audio);
    return wavResponse(audio, 'MISS');
  } catch (error: unknown) {
    console.warn('[api/tts]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Suara natural sedang tidak tersedia.');
  }
}
