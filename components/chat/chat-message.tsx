'use client';

import React, { useState } from 'react';
import { Message } from '@/lib/types';
import CorrectionCard from './correction-card';
import { Volume2, VolumeX, Languages, Bot, User, Sparkles } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speech';

interface ChatMessageProps {
  message: Message;
  scenarioName?: string;
  onTranslate?: (messageId: string) => void;
  isTranslating?: boolean;
}

export default function ChatMessage({ message, scenarioName, onTranslate, isTranslating }: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

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

  return (
    <div className={`flex gap-3 my-4 ${isAI ? 'justify-start' : 'justify-end'}`}>
      
      {/* AI Avatar */}
      {isAI && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20 text-white">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div className={`max-w-[88%] sm:max-w-[75%] ${isAI ? '' : 'items-end flex flex-col'}`}>
        
        {/* Role & Sender Label */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[11px] font-semibold text-slate-400">
            {isAI ? (scenarioName || 'AI Coach') : 'You (Learner)'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{message.timestamp}</span>
        </div>

        {/* Speech Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
            isAI
              ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Translation View */}
          {showTranslation && (
            <div className="mt-2.5 pt-2 border-t border-white/10 text-xs italic font-medium text-indigo-200">
              {isTranslating ? (
                <span className="animate-pulse">Menerjemahkan ke Bahasa Indonesia...</span>
              ) : (
                message.translation || 'Terjemahan tidak tersedia.'
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="mt-2 flex items-center justify-end gap-2 pt-1 border-t border-slate-800/40">
            {/* Audio Speech Button */}
            <button
              type="button"
              onClick={handleSpeak}
              title={isPlaying ? "Stop speech" : "Read aloud in en-US voice"}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                isPlaying
                  ? 'bg-indigo-500 text-white animate-pulse'
                  : isAI
                  ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60'
                  : 'text-indigo-100 hover:text-white hover:bg-indigo-700/50'
              }`}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Listen</span>
                </>
              )}
            </button>

            {/* Translate Button */}
            <button
              type="button"
              onClick={handleToggleTranslation}
              title="Terjemahkan ke Bahasa Indonesia"
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                showTranslation
                  ? 'bg-slate-800 text-indigo-400 font-bold'
                  : isAI
                  ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60'
                  : 'text-indigo-100 hover:text-white hover:bg-indigo-700/50'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{showTranslation ? 'Hide ID' : 'Translate'}</span>
            </button>
          </div>
        </div>

        {/* Attached Grammar Correction Card for User messages */}
        {!isAI && message.correction && (
          <div className="w-full max-w-full">
            <CorrectionCard correction={message.correction} />
          </div>
        )}

      </div>

      {/* User Avatar */}
      {!isAI && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
          <User className="h-5 w-5" />
        </div>
      )}

    </div>
  );
}
