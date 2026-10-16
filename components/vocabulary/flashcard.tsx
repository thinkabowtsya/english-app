'use client';

import React, { useState } from 'react';
import { VocabCard } from '@/lib/types';
import { Volume2, RotateCw, Bookmark } from 'lucide-react';
import { speakText } from '@/lib/speech';
import { cn } from '@/lib/utils';

interface FlashcardProps {
  card: VocabCard;
  onBookmark?: (card: VocabCard) => void;
  isBookmarked?: boolean;
  /** Mis. data progres belum dimuat, atau kata sudah disimpan dari fitur lain. */
  bookmarkDisabled?: boolean;
  bookmarkLabel?: string;
}

export default function Flashcard({ card, onBookmark, isBookmarked, bookmarkDisabled, bookmarkLabel }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speakText(text, undefined, 'en-US');
  };

  const label = bookmarkLabel ?? (isBookmarked ? 'Hapus dari daftar review' : 'Simpan ke daftar review');

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className="group relative h-80 w-full cursor-pointer perspective-[1000px]"
    >
      <div
        className={cn(
          'relative h-full w-full rounded-2xl transition-transform duration-500 transform-3d',
          isFlipped && '[transform:rotateY(180deg)]'
        )}
      >

        {/* FRONT OF CARD */}
        <div className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-2xl border border-line bg-surface p-5 backface-hidden transition-colors group-hover:border-accent/50 sm:p-6">

          {/* Header Badge & Audio */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                {card.cefr}
              </span>
              <span className="truncate rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted">
                {card.category}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {onBookmark && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark(card);
                  }}
                  disabled={bookmarkDisabled}
                  aria-pressed={!!isBookmarked}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'rounded-lg p-2 transition-colors disabled:cursor-default disabled:opacity-60',
                    isBookmarked ? 'bg-warning-soft text-warning' : 'text-muted hover:bg-surface-muted hover:text-fg'
                  )}
                >
                  <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => handleSpeak(e, card.word)}
                className="rounded-lg bg-accent-soft p-2 text-accent transition-colors hover:bg-accent hover:text-accent-fg"
                title="Ucapkan kata"
                aria-label={`Ucapkan ${card.word}`}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Word */}
          <div className="my-auto text-center">
            <span className="mb-1 block font-mono text-xs text-muted">
              [{card.phonetic}] • {card.partOfSpeech}
            </span>
            <h3 className="text-2xl font-bold tracking-tight break-words text-fg transition-colors group-hover:text-accent sm:text-3xl">
              {card.word}
            </h3>
            <p className="mx-auto mt-3 line-clamp-3 max-w-xs text-xs text-muted">
              {card.definitionEn}
            </p>
          </div>

          {/* Flip Prompt Footer */}
          <div className="flex items-center justify-center gap-1.5 border-t border-line pt-3 text-xs font-medium text-accent">
            <RotateCw className="h-3.5 w-3.5" />
            <span>Klik kartu untuk melihat arti & contoh</span>
          </div>

        </div>

        {/* BACK OF CARD */}
        <div className="absolute inset-0 flex h-full w-full [transform:rotateY(180deg)] flex-col justify-between rounded-2xl border border-accent/40 bg-surface p-5 backface-hidden sm:p-6">

          <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
            <span className="truncate text-xs font-semibold tracking-wider text-accent uppercase">
              {card.word} ({card.partOfSpeech})
            </span>
            <span className="shrink-0 text-xs text-muted italic">Bahasa Indonesia</span>
          </div>

          {/* Indonesian Definition & Example */}
          <div className="my-auto space-y-3 overflow-y-auto">
            <div>
              <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Arti:</span>
              <p className="text-sm font-semibold text-fg">{card.definitionId}</p>
            </div>

            <div className="space-y-1 rounded-xl bg-surface-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-accent uppercase">Contoh Kalimat:</span>
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e, card.exampleEn)}
                  className="rounded p-0.5 text-accent hover:text-fg"
                  aria-label="Ucapkan contoh kalimat"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs font-medium text-fg">&ldquo;{card.exampleEn}&rdquo;</p>
              <p className="text-[11px] text-muted italic">{card.exampleId}</p>
            </div>

            {card.collocations && card.collocations.length > 0 && (
              <div>
                <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Kolokasi:</span>
                <div className="flex flex-wrap gap-1">
                  {card.collocations.map((c, i) => (
                    <span key={i} className="rounded bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t border-line pt-2 text-xs text-muted">
            <RotateCw className="h-3.5 w-3.5" />
            <span>Klik untuk membalik kembali</span>
          </div>

        </div>

      </div>
    </div>
  );
}
