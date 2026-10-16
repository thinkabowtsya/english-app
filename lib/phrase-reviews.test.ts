import { describe, expect, it } from 'vitest';
import type { ReviewItem } from '@/types/learning';
import { NOTE_MAX_CHARS, PHRASE_REASONS, findOpenPhrase, getOpenPhrasesByReason, vocabNote } from './phrase-reviews';

let seq = 0;

function review(patch: Partial<ReviewItem>): ReviewItem {
  seq++;
  return {
    id: `r${seq}`,
    kind: 'phrase',
    label: `phrase ${seq}`,
    note: null,
    reason: PHRASE_REASONS.vocabulary,
    lessonId: null,
    source: 'manual',
    createdAt: seq,
    nextReviewAt: null,
    failCount: 0,
    resolvedAt: null,
    ...patch,
  };
}

describe('findOpenPhrase', () => {
  it('mencocokkan label tanpa membedakan huruf besar/kecil dan spasi tepi', () => {
    const item = review({ label: 'Leverage' });
    expect(findOpenPhrase([item], '  leverage ')).toBe(item);
  });

  it('mengabaikan item yang sudah selesai atau bukan frasa', () => {
    const reviews = [review({ label: 'cope', resolvedAt: 10 }), review({ label: 'cope', kind: 'pattern' })];
    expect(findOpenPhrase(reviews, 'cope')).toBeUndefined();
  });
});

describe('getOpenPhrasesByReason', () => {
  it('hanya mengambil frasa aktif dari alat yang sama, terbaru lebih dulu', () => {
    const older = review({ createdAt: 1 });
    const newer = review({ createdAt: 5 });
    const reviews = [
      older,
      newer,
      review({ reason: PHRASE_REASONS.practice }),
      review({ source: 'ai-coach' }),
      review({ resolvedAt: 7 }),
    ];
    expect(getOpenPhrasesByReason(reviews, PHRASE_REASONS.vocabulary)).toEqual([newer, older]);
  });
});

describe('vocabNote', () => {
  it('menggabungkan arti dan contoh kalimat', () => {
    expect(vocabNote({ definitionId: 'memanfaatkan', exampleEn: 'Leverage your skills.' })).toBe(
      'memanfaatkan · Contoh: Leverage your skills.',
    );
  });

  it('melewati contoh kosong dan memotong catatan yang terlalu panjang', () => {
    expect(vocabNote({ definitionId: 'arti', exampleEn: '  ' })).toBe('arti');
    expect(vocabNote({ definitionId: 'a'.repeat(900), exampleEn: 'x' }).length).toBe(NOTE_MAX_CHARS);
  });
});
