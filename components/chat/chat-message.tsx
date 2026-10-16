'use client';

import React, { useRef, useState } from 'react';
import { Message } from '@/lib/types';
import CorrectionCard from './correction-card';
import { Volume2, VolumeX, Languages, Bot, User, BookmarkPlus } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speech';
import { selectionWithin } from '@/components/review/save-phrase-dialog';
import { PHRASE_MAX_CHARS } from '@/lib/phrase-reviews';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  scenarioName?: string;
  onTranslate?: (messageId: string) => void;
  isTranslating?: boolean;
  /** Menyimpan frasa (seleksi teks atau seluruh pesan) ke daftar review. */
  onSavePhrase?: (phrase: string, note?: string | null) => void;
}

const toolButton =
  'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-muted hover:text-fg';

export default function ChatMessage({ message, scenarioName, onTranslate, isTranslating, onSavePhrase }: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const bubbleRef = useRef<HTMLParagraphElement>(null);

  const isAI = message.role === 'assistant';

  const handleSpeak = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(
        message.content,
        () => setIsPlaying(false),
        'en-US'
      );
    }
  };

  const handleToggleTranslation = () => {
    if (!message.translation && onTranslate) {
      onTranslate(message.id);
    }
    setShowTranslation(!showTranslation);
  };

  const handleSave = () => {
    if (!onSavePhrase) return;
    const selected = selectionWithin(bubbleRef.current);
    const whole = message.content.trim();
    onSavePhrase(selected || (whole.length <= PHRASE_MAX_CHARS ? whole : ''), message.translation ?? null);
  };

  return (
    <div className={cn('flex gap-2.5 sm:gap-3', isAI ? 'justify-start' : 'justify-end')}>

      {/* AI Avatar */}
      {isAI && (
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:flex">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div className={cn('min-w-0 max-w-[88%] sm:max-w-[75%]', !isAI && 'flex flex-col items-end')}>

        {/* Role & Sender Label */}
        <div className="mb-1 flex items-center gap-2 px-1">
          <span className="text-[11px] font-medium text-muted">
            {isAI ? (scenarioName || 'AI Coach') : 'Kamu'}
          </span>
          <span className="font-mono text-[10px] text-muted">{message.timestamp}</span>
        </div>

        {/* Speech Bubble */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isAI ? 'rounded-tl-md bg-surface-muted text-fg' : 'rounded-tr-md bg-accent text-accent-fg'
          )}
        >
          <p ref={bubbleRef} className="whitespace-pre-wrap break-words">{message.content}</p>

          {/* Translation View */}
          {showTranslation && (
            <div
              className={cn(
                'mt-2.5 border-t pt-2 text-xs italic',
                isAI ? 'border-line text-muted' : 'border-accent-fg/25 text-accent-fg/85'
              )}
            >
              {isTranslating ? (
                <span className="animate-pulse">Menerjemahkan ke Bahasa Indonesia...</span>
              ) : (
                message.translation || 'Terjemahan tidak tersedia.'
              )}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className={cn('mt-1 flex flex-wrap items-center gap-1', !isAI && 'justify-end')}>
          <button
            type="button"
            onClick={handleSpeak}
            title={isPlaying ? 'Hentikan suara' : 'Dengarkan dengan suara en-US'}
            className={cn(toolButton, isPlaying && 'bg-accent-soft text-accent')}
          >
            {isPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Stop' : 'Dengarkan'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleTranslation}
            title="Terjemahkan ke Bahasa Indonesia"
            className={cn(toolButton, showTranslation && 'bg-accent-soft text-accent')}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>{showTranslation ? 'Sembunyikan terjemahan' : 'Terjemahkan'}</span>
          </button>

          {isAI && onSavePhrase && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSave}
              title="Simpan frasa ke daftar review"
              className={toolButton}
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Simpan frasa</span>
            </button>
          )}
        </div>

        {/* Attached Grammar Correction Card for User messages */}
        {!isAI && message.correction && (
          <div className="w-full max-w-full">
            <CorrectionCard correction={message.correction} onSavePhrase={onSavePhrase} />
          </div>
        )}

      </div>

      {/* User Avatar */}
      {!isAI && (
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-muted sm:flex">
          <User className="h-5 w-5" />
        </div>
      )}

    </div>
  );
}
