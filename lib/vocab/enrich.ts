import 'server-only';
import type { VocabCard, VocabImage } from '@/lib/types';

/**
 * Pelengkap kartu kosakata dari sumber di luar AI:
 * - Free Dictionary API (tanpa key) untuk IPA dan audio pengucapan asli.
 * - Pexels (PEXELS_API_KEY, hanya di server) untuk foto ilustrasi.
 * Keduanya opsional: bila gagal/timeout, kartu tetap dipakai dengan data dari AI.
 */

const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const PEXELS_URL = 'https://api.pexels.com/v1/search';
const TIMEOUT_MS = 5_000;
const DAY_SECONDS = 24 * 60 * 60;

export function isPexelsConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryEntry {
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
}

/** IPA tanpa garis miring pembungkus, karena kartu sudah menampilkannya di dalam [ ]. */
function cleanIpa(text: string): string {
  return text.trim().replace(/^\/+|\/+$/g, '').trim();
}

/** Ambil IPA dan audio terbaik dari respons Free Dictionary. Aksen US diutamakan. */
export function pickPronunciation(entries: unknown): { phonetic?: string; audioUrl?: string } {
  if (!Array.isArray(entries)) return {};
  const list = entries as DictionaryEntry[];
  const phonetics = list.flatMap((e) => (Array.isArray(e?.phonetics) ? e.phonetics : []));

  const audios = phonetics.filter((p) => typeof p.audio === 'string' && p.audio.startsWith('https://'));
  const audio = audios.find((p) => /-us\.mp3$/i.test(p.audio!)) ?? audios[0];

  const texts = [audio?.text, ...phonetics.map((p) => p.text), ...list.map((e) => e?.phonetic)];
  const text = texts.find((t): t is string => typeof t === 'string' && cleanIpa(t).length > 0);

  return {
    ...(text ? { phonetic: cleanIpa(text) } : {}),
    ...(audio?.audio ? { audioUrl: audio.audio } : {}),
  };
}

interface PexelsPhoto {
  url?: string;
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  src?: { medium?: string; landscape?: string };
}

/** Ubah foto pertama hasil pencarian Pexels menjadi VocabImage, atau undefined. */
export function pickPexelsImage(body: unknown): VocabImage | undefined {
  const photos = (body as { photos?: PexelsPhoto[] } | null)?.photos;
  const photo = Array.isArray(photos) ? photos[0] : undefined;
  const src = photo?.src?.medium;
  if (!photo || !src?.startsWith('https://images.pexels.com/')) return undefined;
  return {
    url: src,
    alt: photo.alt?.trim() || '',
    credit: photo.photographer?.trim() || 'Pexels',
    creditUrl: photo.photographer_url || photo.url || 'https://www.pexels.com',
    source: 'pexels',
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: DAY_SECONDS },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function lookupPronunciation(word: string): Promise<{ phonetic?: string; audioUrl?: string }> {
  try {
    return pickPronunciation(await fetchJson(DICTIONARY_URL + encodeURIComponent(word.trim().toLowerCase())));
  } catch {
    return {};
  }
}

export async function searchPexelsImage(query: string): Promise<VocabImage | undefined> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key || !query.trim()) return undefined;
  const params = new URLSearchParams({ query: query.trim(), per_page: '1', orientation: 'landscape' });
  try {
    return pickPexelsImage(await fetchJson(`${PEXELS_URL}?${params}`, { headers: { Authorization: key } }));
  } catch {
    return undefined;
  }
}

/** Lengkapi satu kartu: IPA/audio dari kamus (bila ada) dan foto dari Pexels. */
export async function enrichCard(card: VocabCard, imageQuery?: string): Promise<VocabCard> {
  const [pron, image] = await Promise.all([
    lookupPronunciation(card.word),
    searchPexelsImage(imageQuery || card.word),
  ]);
  return {
    ...card,
    ...(pron.phonetic ? { phonetic: pron.phonetic } : {}),
    ...(pron.audioUrl ? { audioUrl: pron.audioUrl } : {}),
    ...(image ? { image } : {}),
  };
}
