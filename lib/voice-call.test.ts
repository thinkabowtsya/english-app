import { describe, expect, it } from 'vitest';
import { isLikelyEcho, shouldBargeIn, takeSentences } from './voice-call';

describe('takeSentences', () => {
  it('mengambil kalimat lengkap dan menyisakan bagian yang belum selesai', () => {
    expect(takeSentences('Hi there! How was your day? I')).toEqual({
      sentences: ['Hi there!', 'How was your day?'],
      rest: ' I',
    });
  });

  it('tidak memotong kalimat di akhir buffer yang mungkin masih berlanjut', () => {
    expect(takeSentences('That sounds great.')).toEqual({ sentences: [], rest: 'That sounds great.' });
  });

  it('tidak memotong angka desimal', () => {
    expect(takeSentences('PHP 8.3 is fast. Next')).toEqual({ sentences: ['PHP 8.3 is fast.'], rest: ' Next' });
  });

  it('baris baru juga menutup kalimat', () => {
    expect(takeSentences('Great\nTell me more')).toEqual({ sentences: ['Great'], rest: 'Tell me more' });
  });
});

describe('deteksi gema & barge-in', () => {
  const ai = 'That sounds great! What do you usually cook on weekends?';

  it('suara AI yang tertangkap mikrofon dianggap gema', () => {
    expect(isLikelyEcho('what do you usually cook', ai)).toBe(true);
    expect(shouldBargeIn('what do you usually cook', ai)).toBe(false);
  });

  it('ucapan pengguna yang berbeda memotong AI', () => {
    expect(shouldBargeIn('wait I have a question', ai)).toBe(true);
  });

  it('satu kata saja tidak memotong (hindari salah deteksi)', () => {
    expect(shouldBargeIn('hmm', ai)).toBe(false);
  });

  it('tanpa ucapan AI, ucapan apa pun bukan gema', () => {
    expect(isLikelyEcho('hello there', '')).toBe(false);
  });
});
