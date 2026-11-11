import { describe, expect, it } from 'vitest';
import {
  TTS_COOLDOWN_DEFAULT_MS,
  TTS_COOLDOWN_MAX_MS,
  TTS_COOLDOWN_MIN_MS,
  TTS_MAX_CHARS,
  splitForTts,
  ttsCooldownUntil,
} from './tts';

describe('ttsCooldownUntil', () => {
  const now = Date.UTC(2026, 10, 11, 5, 0, 0);

  it('membaca Retry-After dalam detik', () => {
    expect(ttsCooldownUntil('600', now)).toBe(now + 600_000);
  });

  it('membaca Retry-After berupa tanggal HTTP', () => {
    const date = new Date(now + 30 * 60_000).toUTCString();
    expect(ttsCooldownUntil(date, now)).toBe(now + 30 * 60_000);
  });

  it('memakai jeda bawaan bila header kosong atau tidak terbaca', () => {
    expect(ttsCooldownUntil(null, now)).toBe(now + TTS_COOLDOWN_DEFAULT_MS);
    expect(ttsCooldownUntil('nanti', now)).toBe(now + TTS_COOLDOWN_DEFAULT_MS);
  });

  it('jeda dibatasi minimum dan maksimum', () => {
    expect(ttsCooldownUntil('2', now)).toBe(now + TTS_COOLDOWN_MIN_MS);
    expect(ttsCooldownUntil(String(48 * 3600), now)).toBe(now + TTS_COOLDOWN_MAX_MS);
  });
});

describe('splitForTts', () => {
  it('teks pendek tetap satu potongan dan spasi dirapikan', () => {
    expect(splitForTts('  Hello   there. ')).toEqual(['Hello there.']);
    expect(splitForTts('   ')).toEqual([]);
  });

  it('memecah di batas kalimat dan menggabungkan kalimat pendek sampai batas', () => {
    const chunks = splitForTts('One two. Three four! Five six? Seven.', 20);
    expect(chunks).toEqual(['One two. Three four!', 'Five six? Seven.']);
  });

  it('kalimat yang sangat panjang dipotong di koma/spasi, tidak ada potongan melebihi batas', () => {
    const long = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ') + ', and the end.';
    const chunks = splitForTts(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(TTS_MAX_CHARS);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });
});
