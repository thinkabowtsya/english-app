/**
 * Suara natural (Groq Orpheus, lewat /api/tts) — bagian yang dipakai bersama klien & server.
 * Suara browser (speechSynthesis) tetap jadi cadangan bila Orpheus gagal atau dimatikan.
 */

export const TTS_VOICES = [
  { id: 'hannah', label: 'Hannah', gender: 'Wanita' },
  { id: 'diana', label: 'Diana', gender: 'Wanita' },
  { id: 'autumn', label: 'Autumn', gender: 'Wanita' },
  { id: 'daniel', label: 'Daniel', gender: 'Pria' },
  { id: 'austin', label: 'Austin', gender: 'Pria' },
  { id: 'troy', label: 'Troy', gender: 'Pria' },
] as const;

export type TtsVoice = (typeof TTS_VOICES)[number]['id'];
/** 'browser' = selalu pakai suara bawaan browser. */
export type VoicePreference = TtsVoice | 'browser';

export const DEFAULT_VOICE: TtsVoice = 'hannah';
export const TTS_VOICE_IDS = TTS_VOICES.map((v) => v.id) as [TtsVoice, ...TtsVoice[]];

/** Batas teks per permintaan ke server; teks panjang dipecah per kalimat di klien. */
export const TTS_MAX_CHARS = 400;

/** Jeda minimum/maksimum setelah kuota Orpheus habis (429) sebelum suara natural dicoba lagi. */
export const TTS_COOLDOWN_MIN_MS = 60_000;
export const TTS_COOLDOWN_MAX_MS = 12 * 60 * 60_000;
/** Dipakai bila server tidak memberi Retry-After yang bisa dibaca. */
export const TTS_COOLDOWN_DEFAULT_MS = 5 * 60_000;

/**
 * Hitung sampai kapan suara natural diistirahatkan dari header Retry-After
 * (detik atau tanggal HTTP). Hasil dibatasi antara jeda minimum dan maksimum.
 */
export function ttsCooldownUntil(retryAfter: string | null | undefined, now: number): number {
  let ms = TTS_COOLDOWN_DEFAULT_MS;
  const value = retryAfter?.trim();
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) ms = seconds * 1000;
    else {
      const date = Date.parse(value);
      if (Number.isFinite(date)) ms = date - now;
    }
  }
  return now + Math.min(TTS_COOLDOWN_MAX_MS, Math.max(TTS_COOLDOWN_MIN_MS, ms));
}

/**
 * Pecah teks menjadi potongan ≤ `max` karakter di batas kalimat (lalu koma / spasi bila satu
 * kalimat terlalu panjang), agar teks panjang tetap bisa dibacakan berurutan.
 */
export function splitForTts(text: string, max = TTS_MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];

  const pieces: string[] = [];
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    if (sentence.length <= max) {
      pieces.push(sentence);
      continue;
    }
    // Kalimat sangat panjang: potong di koma, lalu di spasi.
    let rest = sentence;
    while (rest.length > max) {
      const window = rest.slice(0, max);
      const cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf(' '));
      const at = cut > max / 3 ? cut + 1 : max;
      pieces.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) pieces.push(rest);
  }

  // Gabungkan kalimat pendek berurutan sampai mendekati batas, agar jumlah permintaan sedikit.
  const chunks: string[] = [];
  for (const p of pieces) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + 1 + p.length <= max) chunks[chunks.length - 1] = `${last} ${p}`;
    else chunks.push(p);
  }
  return chunks;
}
