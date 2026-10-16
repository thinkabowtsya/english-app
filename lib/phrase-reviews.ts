import type { ReviewItem } from '@/types/learning';
import type { VocabCard } from '@/lib/types';

/**
 * Alasan (`reason`) untuk frasa yang disimpan dari alat latihan Vocab Builder, Studio role-play,
 * dan Panggilan suara AI. Semuanya memakai kind 'phrase' dan source 'manual'.
 */
export const PHRASE_REASONS = {
  vocabulary: 'Disimpan dari Vocab Builder',
  practice: 'Disimpan dari Studio role-play',
  call: 'Disimpan dari Panggilan suara AI',
} as const;

export const PHRASE_MAX_CHARS = 300;
export const NOTE_MAX_CHARS = 500;

/** Item frasa yang masih aktif dengan label sama (tanpa membedakan huruf besar/kecil). */
export function findOpenPhrase(reviews: ReviewItem[], label: string): ReviewItem | undefined {
  const key = label.trim().toLowerCase();
  return reviews.find((r) => r.kind === 'phrase' && r.resolvedAt === null && r.label.toLowerCase() === key);
}

/** Frasa aktif yang disimpan dari satu alat latihan, terbaru lebih dulu. */
export function getOpenPhrasesByReason(reviews: ReviewItem[], reason: string): ReviewItem[] {
  return reviews
    .filter((r) => r.kind === 'phrase' && r.resolvedAt === null && r.source === 'manual' && r.reason === reason)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Catatan review untuk kartu kosakata: arti + contoh kalimat. */
export function vocabNote(card: Pick<VocabCard, 'definitionId' | 'exampleEn'>): string {
  const parts = [card.definitionId.trim(), card.exampleEn.trim() && `Contoh: ${card.exampleEn.trim()}`].filter(Boolean);
  return parts.join(' · ').slice(0, NOTE_MAX_CHARS);
}
