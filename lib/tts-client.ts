import { DEFAULT_VOICE, TTS_VOICE_IDS, splitForTts, type TtsVoice, type VoicePreference } from './tts';

/**
 * Pemutar suara natural (Groq Orpheus lewat /api/tts) untuk lib/speech.ts.
 * Audio disimpan di Cache Storage browser (bertahan antar kunjungan) dan di memori halaman,
 * jadi kalimat yang sama diputar langsung tanpa memanggil server lagi.
 */

const PREF_KEY = 'english-app:voice';
const CACHE_NAME = 'tts-orpheus-v1';
const listeners = new Set<() => void>();

export function getVoicePreference(): VoicePreference {
  try {
    const saved = window.localStorage.getItem(PREF_KEY);
    if (saved === 'browser' || (TTS_VOICE_IDS as string[]).includes(saved ?? '')) return saved as VoicePreference;
  } catch {
    // Storage diblokir: pakai default.
  }
  return DEFAULT_VOICE;
}

export function setVoicePreference(voice: VoicePreference) {
  try {
    window.localStorage.setItem(PREF_KEY, voice);
  } catch {
    // Storage diblokir: pilihan hanya berlaku sampai halaman ditutup.
  }
  for (const l of listeners) l();
}

export function subscribeVoicePreference(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function cacheKey(voice: TtsVoice, text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${voice}\n${text}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // URL palsu sebagai kunci Cache Storage; tidak pernah di-fetch.
  return `https://tts.cache.local/${voice}/${hex}`;
}

const memory = new Map<string, Promise<Blob>>();

/** Ambil audio satu potongan teks: memori → Cache Storage → /api/tts. */
export function getSpeech(text: string, voice: TtsVoice): Promise<Blob> {
  const memKey = `${voice}\n${text}`;
  const existing = memory.get(memKey);
  if (existing) return existing;

  const promise = (async () => {
    const store = typeof caches !== 'undefined' ? await caches.open(CACHE_NAME).catch(() => null) : null;
    const key = store ? await cacheKey(voice, text) : '';
    const cached = store ? await store.match(key).catch(() => undefined) : undefined;
    if (cached) return cached.blob();

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const blob = await res.blob();
    if (store) await store.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/wav' } })).catch(() => {});
    return blob;
  })();

  memory.set(memKey, promise);
  // Kegagalan tidak disimpan, agar bisa dicoba lagi lain kali.
  promise.catch(() => memory.delete(memKey));
  return promise;
}

export interface Playback {
  stop(): void;
}

/**
 * Putar teks dengan Orpheus potong demi potong (potongan berikutnya diambil selagi yang sekarang
 * diputar). Bila gagal, `fallback` dipanggil dengan teks yang belum terucap.
 */
export function playNatural(
  text: string,
  voice: TtsVoice,
  onEnd: () => void,
  fallback: (remaining: string) => void,
): Playback {
  const chunks = splitForTts(text);
  let stopped = false;
  // Selesai = onEnd sudah dipanggil atau tugas diserahkan ke suara browser.
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    onEnd();
  };
  const handOver = (remaining: string) => {
    if (settled) return;
    settled = true;
    fallback(remaining);
  };
  let audio: HTMLAudioElement | null = null;
  let url: string | null = null;

  const cleanup = () => {
    if (url) URL.revokeObjectURL(url);
    url = null;
  };

  (async () => {
    for (let i = 0; i < chunks.length; i++) {
      if (stopped) return;
      let blob: Blob;
      try {
        blob = await getSpeech(chunks[i], voice);
        if (i + 1 < chunks.length) getSpeech(chunks[i + 1], voice).catch(() => {});
      } catch {
        if (!stopped) handOver(chunks.slice(i).join(' '));
        return;
      }
      if (stopped) return;
      cleanup();
      url = URL.createObjectURL(blob);
      audio = new Audio(url);
      const ok = await new Promise<boolean>((resolve) => {
        audio!.onended = () => resolve(true);
        audio!.onerror = () => resolve(false);
        audio!.play().catch(() => resolve(false));
      });
      if (stopped) return;
      if (!ok) {
        cleanup();
        handOver(chunks.slice(i).join(' '));
        return;
      }
    }
    cleanup();
    if (!stopped) finish();
  })();

  return {
    // Seperti speechSynthesis.cancel(): menghentikan suara tetap memanggil onEnd sekali.
    stop() {
      stopped = true;
      audio?.pause();
      cleanup();
      finish();
    },
  };
}
