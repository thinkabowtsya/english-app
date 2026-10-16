'use client';

import React, { useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { isSpeechRecognitionSupported, createSpeechRecognizer } from '@/lib/speech';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  isDisabled?: boolean;
}

const subscribeNoop = () => () => {};

export default function VoiceInput({ onTranscript, isDisabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const supported = useSyncExternalStore(subscribeNoop, isSpeechRecognitionSupported, () => true);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        // ignore
      }
      recognizerRef.current = null;
    }
    setIsListening(false);
    setTranscriptPreview('');
  }, []);

  const startListening = useCallback(() => {
    if (!supported) {
      setErrorMsg('Browser ini tidak mendukung input suara Web Speech API. Gunakan Chrome, Edge, atau Brave.');
      return;
    }

    setErrorMsg(null);
    setTranscriptPreview('');

    const recognizer = createSpeechRecognizer({
      onResult: (text, isFinal) => {
        setTranscriptPreview(text);
        if (isFinal && text.trim()) {
          onTranscript(text);
          stopListening();
        }
      },
      onError: (err) => {
        console.warn('STT Error:', err);
        setErrorMsg('Mic error: ' + err);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
      lang: 'en-US'
    });

    if (recognizer) {
      try {
        recognizer.start();
        recognizerRef.current = recognizer;
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  }, [supported, onTranscript, stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {errorMsg && (
        <div role="alert" className="mb-2 flex max-w-xs items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-1 text-[11px] text-fg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isListening && (
        <div className="mb-2 flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5" role="status">
          <div className="flex items-center gap-1">
            <span className="w-1 animate-wave-bar rounded-full bg-accent"></span>
            <span className="w-1 animate-wave-bar-delay-1 rounded-full bg-accent"></span>
            <span className="w-1 animate-wave-bar-delay-2 rounded-full bg-accent"></span>
          </div>
          <span className="animate-pulse text-xs font-medium text-accent">
            Mendengarkan... silakan bicara
          </span>
        </div>
      )}

      {transcriptPreview && isListening && (
        <div className="mb-2 max-w-md rounded-xl border border-line bg-surface p-2 text-xs text-muted italic">
          &ldquo;{transcriptPreview}&rdquo;
        </div>
      )}

      <button
        type="button"
        onClick={toggleListening}
        disabled={isDisabled}
        title={isListening ? 'Berhenti mendengarkan' : 'Bicara lewat mikrofon'}
        aria-label={isListening ? 'Berhenti mendengarkan' : 'Bicara lewat mikrofon'}
        aria-pressed={isListening}
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          isListening
            ? 'animate-pulse bg-danger text-white ring-4 ring-danger/25 dark:text-bg'
            : 'bg-accent text-accent-fg hover:bg-accent-hover'
        )}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
