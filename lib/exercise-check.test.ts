import { describe, expect, it } from 'vitest';
import { tidyCheckFeedback, toPlainText } from '@/services/ai/format';
import { isAnswerMatch, normalizeAnswer } from './exercise-check';

describe('isAnswerMatch', () => {
  it('mengabaikan huruf besar, spasi, dan tanda baca akhir', () => {
    expect(isAnswerMatch('  we use laravel ', { answer: 'We use Laravel.' })).toBe(true);
  });

  it('menyamakan bentuk singkat dan panjang', () => {
    expect(isAnswerMatch('I do not understand', { answer: "I don't understand." })).toBe(true);
    expect(isAnswerMatch("It's ready", { answer: 'It is ready.' })).toBe(true);
    expect(isAnswerMatch('I’m not late', { answer: "I'm not late." })).toBe(true);
  });

  it('menerima jawaban alternatif', () => {
    expect(isAnswerMatch('My team uses Jira', { answer: 'Contoh: I use Git.', alternatives: ['My team uses Jira.'] })).toBe(true);
  });

  it('jawaban berbeda tidak cocok', () => {
    expect(isAnswerMatch('She go to school', { answer: 'She goes to school.' })).toBe(false);
    expect(isAnswerMatch('', { answer: 'am' })).toBe(false);
  });

  it('membuang awalan "Salah →" dari kunci evaluasi', () => {
    expect(normalizeAnswer('Salah → I use Laravel.')).toBe('i use laravel');
  });
});

describe('tidyCheckFeedback', () => {
  it('membuang "Versi yang benar" bila penilaian Benar', () => {
    expect(tidyCheckFeedback('Benar\nAlasan.\nVersi yang benar: I am tired.\nTips: x')).toBe('Benar\nAlasan.\nTips: x');
  });
  it('mempertahankan versi benar bila jawaban belum tepat', () => {
    const t = 'Belum tepat\nAlasan.\nVersi yang benar: She pushes.';
    expect(tidyCheckFeedback(t)).toBe(t);
  });
});

describe('toPlainText', () => {
  it('menghapus tanda bold, italic, judul, dan backtick', () => {
    const input = '## Koreksi\n**I am work** → *salah*. Pakai `I work`.\n* poin satu';
    expect(toPlainText(input)).toBe('Koreksi\nI am work → salah. Pakai I work.\n- poin satu');
  });

  it('tidak merusak teks biasa dan daftar "- "', () => {
    expect(toPlainText('- Corrected: I work here.\n- 2 * 3 = 6')).toBe('- Corrected: I work here.\n- 2 * 3 = 6');
  });
});
