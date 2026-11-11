import { describe, expect, it } from 'vitest';
import { callSessionSchema, formatDuration, parseAiAssessment } from './call-assessment';
import { ignoreSpeechFormatting, normalizeSpoken } from './correction-filter';
import type { Correction } from './types';

const correction = (over: Partial<Correction>): Correction => ({
  originalText: 'i went to the market yesterday',
  correctedText: 'I went to the market yesterday.',
  isCorrect: false,
  score: 70,
  summary: '',
  mistakes: [],
  nativeSuggestions: [],
  ...over,
});

describe('ignoreSpeechFormatting', () => {
  it('kesalahan yang hanya kapital/tanda baca dibuang dan ucapan dianggap benar', () => {
    const result = ignoreSpeechFormatting(
      correction({
        mistakes: [
          { type: 'spelling', original: 'i', correction: 'I', explanation: 'huruf kapital' },
          { type: 'punctuation', original: 'yesterday', correction: 'yesterday.', explanation: 'titik' },
        ],
      }),
    );
    expect(result).toMatchObject({ isCorrect: true, mistakes: [], score: 95 });
    expect(result.correctedText).toBe('i went to the market yesterday');
  });

  it('kesalahan grammar tetap dipertahankan', () => {
    const grammar = { type: 'grammar' as const, original: 'i go yesterday', correction: 'I went yesterday', explanation: 'past tense' };
    const result = ignoreSpeechFormatting(
      correction({
        originalText: 'i go yesterday',
        correctedText: 'I went yesterday.',
        mistakes: [grammar, { type: 'spelling', original: 'i', correction: 'I', explanation: '' }],
        score: 60,
      }),
    );
    expect(result).toMatchObject({ isCorrect: false, score: 60, mistakes: [grammar] });
  });

  it('normalisasi mengabaikan kapital, tanda baca, dan spasi', () => {
    expect(normalizeSpoken("  Hello, World!  It's me. ")).toBe("hello world it's me");
  });
});

describe('penilaian panggilan', () => {
  const raw = {
    overall: '78.6',
    fluency: 70,
    grammar: 80,
    vocabulary: 75,
    interaction: 90,
    level: 'B1',
    summary: 'Bagus.',
    strengths: ['Lancar menjawab'],
    improvements: ['Pakai past tense'],
    betterPhrases: [
      { said: 'i go there yesterday', better: 'I went there yesterday.', note: 'past tense' },
      { said: 'thank you', better: 'Thank you.', note: '' },
    ],
  };

  it('membulatkan skor dan membuang saran yang hanya beda kapital/tanda baca', () => {
    const a = parseAiAssessment(raw)!;
    expect(a.overall).toBe(79);
    expect(a.betterPhrases).toHaveLength(1);
    expect(a.betterPhrases[0].better).toBe('I went there yesterday.');
  });

  it('membuang saran soal kapital/tanda baca dari catatan dan daftar perbaikan', () => {
    const a = parseAiAssessment({
      ...raw,
      improvements: ['Gunakan past tense', 'Perhatikan huruf kapital di awal kalimat'],
      betterPhrases: [
        { said: 'we swimming', better: 'We swam.', note: 'Gunakan bentuk lampau "swam" serta tambahkan tanda baca agar jelas' },
        { said: 'two times in one year', better: 'Twice a year.', note: 'Tambahkan tanda baca' },
      ],
    })!;
    expect(a.improvements).toEqual(['Gunakan past tense']);
    expect(a.betterPhrases.map((p) => p.note)).toEqual(['Gunakan bentuk lampau "swam"', '']);
  });

  it('menolak penilaian tanpa skor/ringkasan', () => {
    expect(parseAiAssessment({ ...raw, summary: '' })).toBeNull();
    expect(parseAiAssessment({ ...raw, grammar: 'tinggi' })).toBeNull();
    expect(parseAiAssessment(null)).toBeNull();
  });

  it('validasi sesi dan format durasi', () => {
    expect(callSessionSchema.safeParse({ topic: 'Bebas', durationSeconds: 65, lines: [{ role: 'user', text: 'hi', time: '10.00' }] }).success).toBe(true);
    expect(callSessionSchema.safeParse({ topic: 'Bebas', durationSeconds: 65, lines: [] }).success).toBe(false);
    expect(formatDuration(65)).toBe('1:05');
  });
});
