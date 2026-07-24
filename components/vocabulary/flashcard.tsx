'use client';

import React, { useState } from 'react';
import { VocabCard } from '@/lib/types';
import { Volume2, RotateCw, Sparkles, Check, Bookmark } from 'lucide-react';
import { speakText } from '@/lib/speech';

interface FlashcardProps {
  card: VocabCard;
  onBookmark?: (card: VocabCard) => void;
  isBookmarked?: boolean;
}

export default function Flashcard({ card, onBookmark, isBookmarked }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speakText(text, undefined, 'en-US');
  };

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className="group relative h-80 w-full cursor-pointer perspective-1000"
    >
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 transform-style-3d ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        
        {/* FRONT OF CARD */}
        <div className="absolute inset-0 h-full w-full rounded-2xl glass-panel p-6 flex flex-col justify-between border border-slate-800 shadow-xl backface-hidden group-hover:border-indigo-500/40 transition-colors">
          
          {/* Header Badge & Audio */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-950/80 border border-indigo-700/50 px-3 py-1 text-xs font-bold text-indigo-300">
                {card.cefr}
              </span>
              <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                {card.category}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {onBookmark && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark(card);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    isBookmarked ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => handleSpeak(e, card.word)}
                className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 transition-colors"
                title="Pronounce word"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Word */}
          <div className="my-auto text-center">
            <span className="text-xs font-mono font-medium text-slate-400 block mb-1">
              [{card.phonetic}] • {card.partOfSpeech}
            </span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
              {card.word}
            </h3>
            <p className="mt-3 text-xs text-slate-300 font-medium max-w-xs mx-auto line-clamp-2">
              {card.definitionEn}
            </p>
          </div>

          {/* Flip Prompt Footer */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-semibold pt-3 border-t border-slate-800/60">
            <RotateCw className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Click card to see translation & example</span>
          </div>

        </div>

        {/* BACK OF CARD */}
        <div className="absolute inset-0 h-full w-full rounded-2xl glass-panel p-6 flex flex-col justify-between border border-indigo-800/60 bg-slate-900/95 shadow-2xl [transform:rotateY(180deg)] backface-hidden">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {card.word} ({card.partOfSpeech})
            </span>
            <span className="text-xs text-slate-400 italic">Bahasa Indonesia</span>
          </div>

          {/* Indonesian Definition & Example */}
          <div className="my-auto space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Arti:</span>
              <p className="text-sm font-semibold text-white">{card.definitionId}</p>
            </div>

            <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-indigo-400">Contoh Kalimat:</span>
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e, card.exampleEn)}
                  className="text-indigo-400 hover:text-white"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-200 font-medium">&ldquo;{card.exampleEn}&rdquo;</p>
              <p className="text-[11px] text-slate-400 italic">{card.exampleId}</p>
            </div>

            {card.collocations && card.collocations.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Kolokasi:</span>
                <div className="flex flex-wrap gap-1">
                  {card.collocations.map((c, i) => (
                    <span key={i} className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <RotateCw className="h-3.5 w-3.5" />
            <span>Click to flip back</span>
          </div>

        </div>

      </div>
    </div>
  );
}
