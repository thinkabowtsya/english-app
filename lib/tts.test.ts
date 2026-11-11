import { describe, expect, it } from 'vitest';
import { TTS_MAX_CHARS, splitForTts } from './tts';

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
