'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpeechRecognizer, isSpeechRecognitionSupported, stopSpeaking } from '@/lib/speech';
import { micErrorInfo } from '@/lib/voice-call';

/**
 * Rekam satu ucapan (tekan → bicara → berhenti otomatis setelah jeda). Kalimat yang menyusul
 * sebelum jeda ikut terkumpul. Suara AI dihentikan dulu agar tidak tertangkap mikrofon.
 */
export function useSpeechCapture() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const lastInterimRef = useRef('');
  const timerRef = useRef<number | null>(null);
  const hardStopRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (hardStopRef.current !== null) window.clearTimeout(hardStopRef.current);
    timerRef.current = null;
    hardStopRef.current = null;
  };

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(
    (onDone: (text: string) => void) => {
      if (recRef.current) return;
      if (!isSpeechRecognitionSupported()) {
        setError('Browser ini tidak mendukung pengenalan suara. Pakai Chrome/Edge, atau ketik jawabanmu.');
        return;
      }
      stopSpeaking();
      finalRef.current = '';
      lastInterimRef.current = '';
      setInterim('');
      setError(null);

      const scheduleStop = (ms: number) => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(stop, ms);
      };

      const rec = createSpeechRecognizer({
        lang: 'en-US',
        onResult: (text, isFinal) => {
          const heard = text.trim();
          if (!heard) return;
          if (isFinal) {
            finalRef.current = `${finalRef.current} ${heard}`.trim();
            lastInterimRef.current = '';
            setInterim(finalRef.current);
            scheduleStop(1300);
          } else {
            lastInterimRef.current = heard;
            setInterim(`${finalRef.current} ${heard}`.trim());
            scheduleStop(2500);
          }
        },
        onError: (err) => {
          const info = micErrorInfo(err);
          if (info.message) setError(info.message);
        },
        onEnd: () => {
          clearTimers();
          recRef.current = null;
          setListening(false);
          const text = `${finalRef.current} ${lastInterimRef.current}`.replace(/\s+/g, ' ').trim();
          setInterim('');
          onDone(text);
        },
      });
      if (!rec) return;
      try {
        rec.start();
        recRef.current = rec;
        setListening(true);
        // Diam di awal atau bicara terlalu lama: berhenti sendiri.
        timerRef.current = window.setTimeout(stop, 8000);
        hardStopRef.current = window.setTimeout(stop, 45_000);
      } catch (err) {
        console.error('Mic start failed:', err);
      }
    },
    [stop],
  );

  useEffect(
    () => () => {
      clearTimers();
      try {
        recRef.current?.abort();
      } catch {}
    },
    [],
  );

  return { listening, interim, error, start, stop, setError };
}
