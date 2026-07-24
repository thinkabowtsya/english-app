'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { isSpeechRecognitionSupported, createSpeechRecognizer } from '@/lib/speech';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  isDisabled?: boolean;
}

export default function VoiceInput({ onTranscript, isDisabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

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
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-950/60 border border-amber-800/40 px-3 py-1 text-[11px] text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isListening && (
        <div className="mb-2 flex items-center gap-2 rounded-full bg-indigo-950/80 border border-indigo-500/40 px-4 py-1.5 shadow-lg shadow-indigo-500/20">
          <div className="flex items-center gap-1">
            <span className="w-1 bg-indigo-400 rounded-full animate-wave-bar"></span>
            <span className="w-1 bg-purple-400 rounded-full animate-wave-bar-delay-1"></span>
            <span className="w-1 bg-pink-400 rounded-full animate-wave-bar-delay-2"></span>
          </div>
          <span className="text-xs font-semibold text-indigo-200 animate-pulse">
            Listening... Speak now
          </span>
        </div>
      )}

      {transcriptPreview && isListening && (
        <div className="mb-2 max-w-md rounded-xl bg-slate-900/90 border border-slate-700 p-2 text-xs text-slate-300 italic">
          &ldquo;{transcriptPreview}&rdquo;
        </div>
      )}

      <button
        type="button"
        onClick={toggleListening}
        disabled={isDisabled}
        title={isListening ? "Stop listening" : "Speak using Microphone"}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 shadow-md ${
          isListening
            ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 shadow-indigo-500/20'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
