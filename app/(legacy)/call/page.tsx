'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Shuffle, Check, RefreshCw, BookmarkPlus, Hand } from 'lucide-react';
import { stopSpeaking, createSpeechQueue, createSpeechRecognizer, isSpeechRecognitionSupported, type SpeechQueue } from '@/lib/speech';
import { createId } from '@/lib/id';
import { isLikelyEcho, micErrorInfo, shouldBargeIn, takeSentences } from '@/lib/voice-call';
import { Correction } from '@/lib/types';
import CorrectionCard from '@/components/chat/correction-card';
import { useHydrated } from '@/lib/storage/hooks';
import { PHRASE_MAX_CHARS, PHRASE_REASONS } from '@/lib/phrase-reviews';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, PageHeader } from '@/components/ui/feedback';
import { SavePhraseDialog, SavedPhraseNotice, type PhraseTarget } from '@/components/review/save-phrase-dialog';
import { CallAssessmentView, CallHistory } from '@/features/call/call-history';
import type { CallAssessment } from '@/lib/call-assessment';

interface CallLine {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  correction?: Correction | null;
}

interface TopicSuggestion {
  id: string;
  title: string;
  category: string;
  icon: string;
  aiOpener: string;
}

const FREE_CALL_OPENER = "Hey there! Thanks for getting on the call. I'm excited to talk with you today. What's on your mind, or what would you like to discuss?";

const TOPIC_SUGGESTIONS: TopicSuggestion[] = [
  {
    id: 'tech_future',
    title: 'Artificial Intelligence & Tech',
    category: 'Technology',
    icon: '🚀',
    aiOpener: "Hey! Thanks for getting on the call. I was just reading about AI tools. What's your personal view on how technology is changing our daily lives?"
  },
  {
    id: 'travel_memories',
    title: 'Travel & Dream Destinations',
    category: 'Travel',
    icon: '✈️',
    aiOpener: "Hello there! Great to talk to you. If you could pack your bags and fly anywhere in the world right now, where would you go?"
  },
  {
    id: 'career_dreams',
    title: 'Career & Work Experience',
    category: 'Business',
    icon: '💼',
    aiOpener: "Hi! Glad we connected today. I'd love to know more about what you do or what career goals you're pursuing right now!"
  },
  {
    id: 'movies_culture',
    title: 'Movies, Series & Hobbies',
    category: 'Pop Culture',
    icon: '🍿',
    aiOpener: "Hey there! What's a great movie, show, or hobby that you've been really passionate about recently?"
  },
  {
    id: 'food_culinary',
    title: 'Food & Daily Habits',
    category: 'Lifestyle',
    icon: '🍔',
    aiOpener: "Hi! Welcome to the call. Food is always my favorite topic! What is your ultimate comfort food when you've had a long day?"
  }
];

export default function VoiceCallStudioPage() {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  
  // Call Session State
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState<CallLine[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  // Penilaian AI setelah panggilan selesai (disimpan ke riwayat call_sessions).
  const [review, setReview] = useState<
    | { status: 'idle' | 'loading' | 'empty' | 'error' }
    | { status: 'done'; assessment: CallAssessment | null; storage: string }
  >({ status: 'idle' });
  const [historyVersion, setHistoryVersion] = useState(0);
  const [saveTarget, setSaveTarget] = useState<PhraseTarget | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  // Mode bebas-sela: mikrofon tetap aktif saat AI bicara (butuh headset). Default bergiliran,
  // karena di banyak perangkat mikrofon & suara AI yang aktif bersamaan saling mengganggu.
  const [autoInterrupt, setAutoInterrupt] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [typedReply, setTypedReply] = useState('');
  const mounted = useHydrated();
  const micSupported = mounted && isSpeechRecognitionSupported();

  // State panggilan yang dibaca callback mikrofon/stream (selalu nilai terbaru).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callActiveRef = useRef(false);
  const mutedRef = useRef(false);
  const speakerRef = useRef(true);
  const autoInterruptRef = useRef(false);
  /** Mikrofon dijeda selama giliran AI (mode bergiliran). */
  const pausedForAiRef = useRef(false);
  /** Error mikrofon yang butuh tindakan pengguna (izin ditolak, mic tidak ada): jangan restart otomatis. */
  const micFatalRef = useRef(false);
  /** Ucapan pengguna yang sudah final tapi belum dikirim (menunggu jeda bicara). */
  const pendingSpeechRef = useRef('');
  const interimSpeechRef = useRef('');
  const sendTimerRef = useRef<number | null>(null);
  const micRestartsRef = useRef<number[]>([]);
  const resumeMicRef = useRef<() => void>(() => {});
  const historyRef = useRef<CallLine[]>([]);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef(false);
  const queueRef = useRef<SpeechQueue | null>(null);
  const spokenHandlerRef = useRef<(text: string) => void>(() => {});
  const startMicRef = useRef<() => void>(() => {});

  /** Mengubah riwayat lewat ref (untuk request) dan state (untuk tampilan) sekaligus. */
  const updateHistory = useCallback((fn: (prev: CallLine[]) => CallLine[]) => {
    historyRef.current = fn(historyRef.current);
    setTranscriptHistory(historyRef.current);
  }, []);

  const getQueue = useCallback(() => {
    queueRef.current ??= createSpeechQueue({
      onStart: () => setIsAiSpeaking(true),
      onIdle: () => {
        if (streamingRef.current) return;
        setIsAiSpeaking(false);
        // AI selesai bicara → giliran pengguna.
        resumeMicRef.current();
      },
    });
    return queueRef.current;
  }, []);

  // Timer Counter for active call duration
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /** Memotong AI: hentikan suara dan stream balasan yang sedang berjalan. */
  const interruptAi = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    streamingRef.current = false;
    queueRef.current?.cancel();
    setIsAiSpeaking(false);
    setIsAiThinking(false);
  }, []);

  const clearSendTimer = useCallback(() => {
    if (sendTimerRef.current !== null) window.clearTimeout(sendTimerRef.current);
    sendTimerRef.current = null;
  }, []);

  /** Buang ucapan yang belum terkirim (mis. mikrofon dimatikan / panggilan diakhiri). */
  const resetPendingSpeech = useCallback(() => {
    clearSendTimer();
    pendingSpeechRef.current = '';
    interimSpeechRef.current = '';
    setCurrentTranscript('');
  }, [clearSendTimer]);

  /** Kirim ucapan yang terkumpul sebagai satu giliran bicara. */
  const flushSpeech = useCallback(() => {
    clearSendTimer();
    const text = `${pendingSpeechRef.current} ${interimSpeechRef.current}`.replace(/\s+/g, ' ').trim();
    pendingSpeechRef.current = '';
    interimSpeechRef.current = '';
    setCurrentTranscript('');
    if (text && callActiveRef.current) spokenHandlerRef.current(text);
  }, [clearSendTimer]);

  /** Matikan mikrofon. `abort` membuang audio yang belum diproses (dipakai saat giliran AI). */
  const stopMicListener = useCallback((abort = false) => {
    const rec = recognizerRef.current;
    recognizerRef.current = null;
    if (rec) {
      try {
        if (abort) rec.abort();
        else rec.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  /**
   * Mikrofon menyala selama giliran pengguna. Jika browser menghentikannya (diam lama/jaringan),
   * dinyalakan ulang otomatis — kecuali error yang butuh tindakan pengguna (izin ditolak dsb.).
   */
  const startMicListener = useCallback(() => {
    if (!isSpeechRecognitionSupported() || mutedRef.current || !callActiveRef.current) return;
    if (pausedForAiRef.current || micFatalRef.current || recognizerRef.current) return;

    const recognizer = createSpeechRecognizer({
      onResult: (text, isFinal) => {
        const heard = text.trim();
        if (!heard) return;
        const aiBusy = streamingRef.current || (queueRef.current?.isBusy() ?? false);
        if (aiBusy) {
          // Hanya terjadi di mode bebas-sela: abaikan gema suara AI, potong AI bila pengguna bicara.
          const aiSpeech = queueRef.current?.spokenText() ?? '';
          if (isLikelyEcho(heard, aiSpeech)) return;
          if (autoInterruptRef.current && shouldBargeIn(heard, aiSpeech)) interruptAi();
        }
        setMicError(null);
        clearSendTimer();
        if (isFinal) {
          pendingSpeechRef.current = `${pendingSpeechRef.current} ${heard}`.trim();
          interimSpeechRef.current = '';
          // Tunggu jeda singkat: kalimat berikutnya yang menyusul ikut terkirim dalam satu giliran.
          sendTimerRef.current = window.setTimeout(flushSpeech, 900);
        } else {
          interimSpeechRef.current = heard;
          // Pengaman bila browser tidak pernah menandai hasil sebagai final.
          sendTimerRef.current = window.setTimeout(flushSpeech, 2500);
        }
        setCurrentTranscript(`${pendingSpeechRef.current} ${interimSpeechRef.current}`.trim());
      },
      onError: (err) => {
        const info = micErrorInfo(err);
        if (info.fatal) micFatalRef.current = true;
        if (info.message) setMicError(info.message);
        if (err !== 'no-speech' && err !== 'aborted') console.warn('Call mic error:', err);
      },
      onEnd: () => {
        if (recognizerRef.current !== recognizer) return;
        recognizerRef.current = null;
        setIsListening(false);
        // Ucapan yang tertahan saat mic berhenti tetap dikirim.
        if (pendingSpeechRef.current || interimSpeechRef.current) flushSpeech();
        if (!callActiveRef.current || mutedRef.current || pausedForAiRef.current || micFatalRef.current) return;
        // Nyalakan ulang; perlambat bila browser terus menghentikannya dalam waktu singkat.
        const now = Date.now();
        micRestartsRef.current = [...micRestartsRef.current.filter((t) => now - t < 10_000), now];
        const delay = micRestartsRef.current.length > 4 ? 2000 : 250;
        window.setTimeout(() => startMicRef.current(), delay);
      },
      lang: 'en-US'
    });

    if (recognizer) {
      try {
        recognizer.start();
        recognizerRef.current = recognizer;
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start call mic:', err);
      }
    }
  }, [interruptAi, clearSendTimer, flushSpeech]);

  /** Mode bergiliran: matikan mikrofon selama AI menjawab & berbicara. */
  const pauseMicForAi = useCallback(() => {
    if (autoInterruptRef.current) return;
    pausedForAiRef.current = true;
    stopMicListener(true);
  }, [stopMicListener]);

  /** Nyalakan lagi mikrofon setelah AI selesai (tidak sedang stream & antrean suara kosong). */
  const resumeMicAfterAi = useCallback(() => {
    if (streamingRef.current || queueRef.current?.isBusy()) return;
    pausedForAiRef.current = false;
    startMicListener();
  }, [startMicListener]);

  useEffect(() => {
    startMicRef.current = startMicListener;
    resumeMicRef.current = resumeMicAfterAi;
  }, [startMicListener, resumeMicAfterAi]);

  const activeTopicContext = () =>
    customTopic.trim()
      ? `User's custom topic choice: ${customTopic.trim()}`
      : selectedTopic
      ? `Topic: ${selectedTopic.title}`
      : 'Free open conversation about any topic the user wants to talk about.';

  /** Koreksi grammar berjalan di belakang — tidak menahan balasan suara AI. */
  const fetchCorrection = (lineId: string, userText: string) => {
    fetch('/api/correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userText, userLevel: 'Intermediate', mode: 'speech' })
    })
      .then(r => (r.ok ? r.json() : null))
      .then((corrRes: Correction | null) => {
        if (!corrRes || typeof corrRes.score !== 'number') return;
        updateHistory(prev => prev.map(item => (item.id === lineId ? { ...item, correction: corrRes } : item)));
      })
      .catch(() => {});
  };

  // Process User Spoken Sentence in Voice Call
  const handleUserSpokenSentence = async (userText: string) => {
    // Jika AI masih bicara/berpikir, pengguna sedang memotong: hentikan dulu.
    interruptAi();
    // Giliran AI: mikrofon dijeda agar suara AI tidak tertangkap & tidak berebut audio dengan mic.
    pauseMicForAi();

    const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userLine: CallLine = { id: createId('u'), role: 'user', text: userText, time: timeNow() };
    updateHistory(prev => [...prev, userLine]);
    fetchCorrection(userLine.id, userText);

    const controller = new AbortController();
    streamAbortRef.current = controller;
    streamingRef.current = true;
    setIsAiThinking(true);

    const aiLine: CallLine = { id: createId('a'), role: 'ai', text: '', time: timeNow() };
    let buffer = '';
    let full = '';
    const speak = (sentence: string) => {
      if (speakerRef.current) getQueue().enqueue(sentence);
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          stream: true,
          messages: historyRef.current.filter(m => m.text).slice(-30).map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text
          })),
          scenarioPrompt: `You are on a direct live phone call with the user. ${activeTopicContext()}. Feel completely open to discuss ANY topic the user brings up. Keep replies concise (1-3 short sentences) so it feels like a real fast-paced phone call. The user may interrupt you; that is normal. The user's words come from speech recognition, so capitalization and punctuation are meaningless: never comment on or correct them.`,
          userLevel: 'Intermediate'
        })
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      updateHistory(prev => [...prev, aiLine]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setIsAiThinking(false);
        buffer += chunk;
        full += chunk;
        const shown = full.trim();
        updateHistory(prev => prev.map(item => (item.id === aiLine.id ? { ...item, text: shown } : item)));
        // Ucapkan setiap kalimat begitu lengkap, tanpa menunggu seluruh balasan.
        const { sentences, rest } = takeSentences(buffer);
        buffer = rest;
        sentences.forEach(speak);
      }
      speak(buffer);
      if (!full.trim()) {
        const fallback = 'Sorry, could you say that again?';
        updateHistory(prev => prev.map(item => (item.id === aiLine.id ? { ...item, text: fallback } : item)));
        speak(fallback);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // Dipotong pengguna: tandai balasan yang terpotong.
        const cut = full.trim();
        if (cut) updateHistory(prev => prev.map(item => (item.id === aiLine.id ? { ...item, text: `${cut} …` } : item)));
        return;
      }
      console.error('Call processing error:', err);
      const fallback = 'Sorry, the connection is a bit unstable. Could you repeat that?';
      updateHistory(prev => [...prev.filter(item => item.id !== aiLine.id), { ...aiLine, text: fallback }]);
      speak(fallback);
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
        streamingRef.current = false;
        setIsAiThinking(false);
        if (!queueRef.current?.isBusy()) {
          setIsAiSpeaking(false);
          // Tidak ada suara yang tersisa (atau speaker mati) → langsung giliran pengguna.
          resumeMicAfterAi();
        }
      }
    }
  };

  useEffect(() => {
    spokenHandlerRef.current = (text) => void handleUserSpokenSentence(text);
  });

  // Hentikan semua saat halaman ditinggalkan.
  useEffect(() => () => {
    callActiveRef.current = false;
    streamAbortRef.current?.abort();
    queueRef.current?.cancel();
    if (sendTimerRef.current !== null) window.clearTimeout(sendTimerRef.current);
    try { recognizerRef.current?.abort(); } catch {}
  }, []);

  // Start Phone Call
  const handleStartCall = (presetTopic?: TopicSuggestion) => {
    const chosenTopic = presetTopic || selectedTopic;
    if (presetTopic) setSelectedTopic(presetTopic);

    setCallState('calling');
    setCallSeconds(0);
    historyRef.current = [];
    setTranscriptHistory([]);
    setReview({ status: 'idle' });
    setSavedLabel(null);
    setMicError(null);
    micFatalRef.current = false;
    pausedForAiRef.current = false;
    micRestartsRef.current = [];
    resetPendingSpeech();

    setTimeout(() => {
      setCallState('connected');
      callActiveRef.current = true;

      let openerText = FREE_CALL_OPENER;
      if (customTopic.trim()) {
        openerText = `Hey there! Great to talk to you. I see you want to chat about "${customTopic.trim()}". I'd love to hear your thoughts on it!`;
      } else if (chosenTopic) {
        openerText = chosenTopic.aiOpener;
      }

      const initialTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      updateHistory(() => [{ id: createId('a'), role: 'ai', text: openerText, time: initialTime }]);

      // AI membuka panggilan. Mode bergiliran: mikrofon menyala setelah salam selesai diucapkan
      // (lewat onIdle antrean); mode bebas-sela / speaker mati: mikrofon langsung menyala.
      if (speakerRef.current) {
        pauseMicForAi();
        getQueue().enqueue(openerText);
      }
      startMicListener();
    }, 1500);
  };

  const topicLabel = () =>
    customTopic.trim() || selectedTopic?.title || 'Bebas apa saja';

  /** Nilai panggilan dengan AI lalu simpan ke riwayat (minimal satu ucapan pengguna). */
  const saveCall = async (durationSeconds: number) => {
    const lines = historyRef.current
      .filter(l => l.text.trim())
      .map(({ role, text, time, correction }) => ({ role, text, time, ...(correction ? { correction } : {}) }));
    if (!lines.some(l => l.role === 'user')) {
      setReview({ status: 'empty' });
      return;
    }
    setReview({ status: 'loading' });
    try {
      const res = await fetch('/api/call/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicLabel().slice(0, 200), durationSeconds, lines })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error(`HTTP ${res.status}`);
      setReview({ status: 'done', assessment: body.assessment ?? null, storage: body.storage });
      if (body.storage === 'saved') setHistoryVersion(v => v + 1);
    } catch {
      setReview({ status: 'error' });
    }
  };

  // End Phone Call
  const handleEndCall = () => {
    callActiveRef.current = false;
    pausedForAiRef.current = false;
    resetPendingSpeech();
    interruptAi();
    stopSpeaking();
    stopMicListener(true);
    setCallState('ended');
    void saveCall(callSeconds);
  };

  /** Tombol "Potong": hentikan AI dan langsung buka mikrofon untuk giliran pengguna. */
  const handleManualInterrupt = () => {
    interruptAi();
    resumeMicAfterAi();
  };

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setIsMuted(next);
    if (next) {
      resetPendingSpeech();
      stopMicListener(true);
    } else {
      // Menekan tombol mikrofon = coba lagi setelah izin diberikan / mic dipasang.
      micFatalRef.current = false;
      setMicError(null);
      startMicListener();
    }
  };

  const toggleSpeaker = () => {
    const next = !speakerRef.current;
    speakerRef.current = next;
    setIsSpeakerOn(next);
    if (!next) {
      queueRef.current?.cancel();
      setIsAiSpeaking(false);
      resumeMicAfterAi();
    }
  };

  const toggleAutoInterrupt = () => {
    const next = !autoInterruptRef.current;
    autoInterruptRef.current = next;
    setAutoInterrupt(next);
    // Bebas-sela: mikrofon tidak perlu dijeda saat AI bicara.
    if (next && pausedForAiRef.current) {
      pausedForAiRef.current = false;
      startMicListener();
    }
  };

  /** Balas dengan mengetik (bila mikrofon bermasalah atau sedang di tempat ramai). */
  const handleTypedReply = (e: React.FormEvent) => {
    e.preventDefault();
    const text = typedReply.trim();
    if (!text || !callActiveRef.current) return;
    setTypedReply('');
    resetPendingSpeech();
    spokenHandlerRef.current(text);
  };

  const handlePickRandomTopic = () => {
    const random = TOPIC_SUGGESTIONS[Math.floor(Math.random() * TOPIC_SUGGESTIONS.length)];
    setSelectedTopic(random);
    setCustomTopic('');
  };


  if (!mounted) return null;

  const lastLine = transcriptHistory[transcriptHistory.length - 1];

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      <PageHeader
        title="Panggilan Suara AI"
        description="Telepon bareng AI secara bebas membahas topik apa saja, hands-free dengan suara."
        action={
          <Badge tone="success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden></span>
            Mesin suara hands-free
          </Badge>
        }
      />

      {/* CALL STATE 1: IDLE / PRE-CALL SCREEN */}
      {callState === 'idle' && (
        <Card className="space-y-6 p-5 sm:p-8">

          {/* Main Call Avatar & Quick Start Free Call Button */}
          <div className="mx-auto max-w-lg space-y-4 py-2 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success ring-4 ring-success/15">
              <PhoneCall className="h-9 w-9" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-fg sm:text-2xl">Telepon Bareng AI (Bebas Apa Saja)</h2>
              <p className="mt-1 text-sm text-muted">
                Langsung telepon dan bicarakan topik apa pun secara bebas tanpa batasan!
              </p>
            </div>

            {/* Primary Feature: Direct Free Call Button */}
            <div className="pt-2">
              <Button
                size="lg"
                onClick={() => {
                  setSelectedTopic(null);
                  handleStartCall();
                }}
                className="w-full sm:w-auto"
              >
                <PhoneCall className="h-5 w-5" />
                Mulai Telepon Bebas Sekarang
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-grow border-t border-line"></div>
            <span className="shrink text-center text-[11px] font-medium tracking-wide text-muted uppercase">
              Atau (opsional) tentukan topik sendiri
            </span>
            <div className="flex-grow border-t border-line"></div>
          </div>

          {/* Custom Topic Input */}
          <div className="space-y-2">
            <label htmlFor="call-topic" className="block text-xs font-medium text-fg">
              Tulis topik bebas yang ingin dibahas (opsional):
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="call-topic"
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value) setSelectedTopic(null);
                }}
                placeholder="Contoh: game favorit, hobi fotografi, rencana liburan..."
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted"
              />
              {customTopic && (
                <Button onClick={() => handleStartCall()}>
                  Telepon Topik Ini
                </Button>
              )}
            </div>
          </div>

          {/* Optional Topic Suggestions (Saran Topik jika bingung) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Bingung mau bahas apa? Pilih rekomendasi topik (opsional):
              </h3>

              <Button size="sm" variant="ghost" onClick={handlePickRandomTopic} className="text-accent">
                <Shuffle className="h-3.5 w-3.5" />
                Acak Topik
              </Button>
            </div>

            <div role="radiogroup" aria-label="Rekomendasi topik" className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {TOPIC_SUGGESTIONS.map((topic) => {
                const isSelected = selectedTopic?.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setCustomTopic('');
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                      isSelected ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-muted'
                    )}
                  >
                    <span className="text-xl" aria-hidden>{topic.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={cn('text-xs font-semibold', isSelected ? 'text-accent' : 'text-fg')}>{topic.title}</h4>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-accent" />}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted italic">
                        &ldquo;{topic.aiOpener}&rdquo;
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </Card>
      )}

      {/* CALL STATE 2: CALL IN PROGRESS (CALLING & CONNECTED) */}
      {(callState === 'calling' || callState === 'connected') && (
        <Card className="relative flex min-h-[32rem] flex-col items-center justify-between gap-6 overflow-hidden p-5 sm:min-h-[550px] sm:p-10">

          {/* Call Top Bar */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success" aria-hidden></span>
              <span className="font-mono text-xs font-semibold tracking-widest text-success uppercase" role="status">
                {callState === 'calling' ? 'Memanggil...' : 'Panggilan tersambung'}
              </span>
            </div>

            <span className="rounded-full border border-line bg-surface-muted px-3.5 py-1 font-mono text-sm font-semibold text-fg tabular-nums">
              {formatTimer(callSeconds)}
            </span>
          </div>

          {/* Center AI Contact Avatar & Waveform */}
          <div className="my-auto flex w-full flex-col items-center space-y-4 text-center">
            <div className="relative">
              <div
                className={cn(
                  'flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-500',
                  isAiSpeaking
                    ? 'scale-110 border-success bg-success-soft text-success ring-8 ring-success/15'
                    : 'border-line bg-surface-muted text-muted'
                )}
              >
                <Sparkles className={cn('h-12 w-12', isAiSpeaking && 'animate-pulse')} />
              </div>

              {/* Sound Wave Indicator */}
              {isAiSpeaking && (
                <div className="absolute inset-x-0 -bottom-3 flex items-center justify-center gap-1" aria-hidden>
                  <span className="w-1 animate-wave-bar rounded-full bg-success"></span>
                  <span className="w-1 animate-wave-bar-delay-1 rounded-full bg-success"></span>
                  <span className="w-1 animate-wave-bar-delay-2 rounded-full bg-accent"></span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-fg sm:text-xl">My Journey AI Tutor</h3>
              <p className="mt-0.5 text-xs font-medium text-success" aria-live="polite">
                {isAiSpeaking
                  ? autoInterrupt
                    ? 'AI berbicara — kamu bisa langsung menyela'
                    : 'AI berbicara — tunggu giliranmu atau tekan "Potong"'
                  : isAiThinking
                  ? 'AI sedang menjawab…'
                  : isMuted
                  ? 'Mikrofon dimatikan'
                  : isListening
                  ? 'Giliranmu — silakan bicara…'
                  : micSupported
                  ? 'Menyiapkan mikrofon…'
                  : 'Panggilan aktif'}
              </p>
              <span className="mt-2 inline-block rounded-full border border-line bg-surface-muted px-3.5 py-1 text-[11px] font-medium text-fg">
                Topik: {customTopic ? customTopic : selectedTopic ? selectedTopic.title : 'Bebas Apa Saja'}
              </span>
            </div>

            {/* Live Call Transcript Bubble */}
            <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-muted p-4 text-left text-xs text-fg">
              {currentTranscript ? (
                <p className="animate-pulse text-accent italic">&ldquo;{currentTranscript}&rdquo;</p>
              ) : lastLine ? (
                <p className="line-clamp-3">
                  <strong className="mr-1 text-success">
                    {lastLine.role === 'ai' ? 'AI:' : 'Kamu:'}
                  </strong>
                  &ldquo;{lastLine.text}&rdquo;
                </p>
              ) : (
                <p className="text-muted">Menyambungkan saluran audio...</p>
              )}
            </div>
          </div>

          {/* Menyela AI seperti telepon biasa */}
          <div className="flex w-full flex-col items-center gap-2 pb-3">
            {(isAiSpeaking || isAiThinking) && (
              <Button size="sm" variant="secondary" onClick={handleManualInterrupt}>
                <Hand className="h-4 w-4" />
                Potong — giliranku bicara
              </Button>
            )}

            {!micSupported && (
              <p role="alert" className="max-w-md rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-center text-xs text-fg">
                Browser ini tidak mendukung pengenalan suara. Pakai Chrome atau Edge (laptop) / Chrome (Android),
                atau balas dengan mengetik di bawah.
              </p>
            )}
            {micSupported && micError && (
              <p role="alert" className="max-w-md rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-center text-xs text-fg">
                {micError}
              </p>
            )}

            {/* Balas dengan mengetik: cadangan bila mikrofon bermasalah */}
            <form onSubmit={handleTypedReply} className="flex w-full max-w-md items-center gap-2">
              <input
                type="text"
                value={typedReply}
                onChange={(e) => setTypedReply(e.target.value)}
                placeholder="Atau ketik jawabanmu di sini…"
                aria-label="Ketik jawaban"
                maxLength={500}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted"
              />
              <Button type="submit" size="sm" disabled={!typedReply.trim()}>
                Kirim
              </Button>
            </form>

            {micSupported && (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted">
                <input
                  type="checkbox"
                  checked={autoInterrupt}
                  onChange={toggleAutoInterrupt}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                Mode bebas-sela: mikrofon tetap aktif saat AI bicara (pakai headset)
              </label>
            )}
            <p className="text-center text-[11px] text-muted">
              Bicara bergiliran seperti telepon: AI bicara → mikrofon menyala → kamu bicara, jeda sebentar → terkirim.
            </p>
          </div>

          {/* Call Action Controls (Mute, Speaker, Hangup) */}
          <div className="flex w-full items-center justify-center gap-6 border-t border-line pt-4">
            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
              aria-label={isMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
              aria-pressed={isMuted}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full border transition-colors',
                isMuted
                  ? 'border-danger/40 bg-danger-soft text-danger'
                  : 'border-line bg-surface text-fg hover:bg-surface-muted'
              )}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={handleEndCall}
              title="Akhiri panggilan"
              aria-label="Akhiri panggilan"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white transition-transform hover:scale-105 active:scale-95 dark:text-bg"
            >
              <PhoneOff className="h-7 w-7" />
            </button>

            {/* Speaker Toggle */}
            <button
              type="button"
              onClick={toggleSpeaker}
              title={isSpeakerOn ? 'Matikan suara AI' : 'Nyalakan suara AI'}
              aria-label={isSpeakerOn ? 'Matikan suara AI' : 'Nyalakan suara AI'}
              aria-pressed={isSpeakerOn}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full border transition-colors',
                isSpeakerOn
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-surface text-muted hover:bg-surface-muted'
              )}
            >
              {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </button>
          </div>

        </Card>
      )}

      {/* CALL STATE 3: CALL ENDED SUMMARY REPORT */}
      {callState === 'ended' && (
        <Card className="space-y-6 p-5 sm:p-8">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <span className="text-xs font-semibold text-success uppercase">Ringkasan panggilan</span>
              <h2 className="text-lg font-semibold text-fg sm:text-xl">Analisis fluency setelah panggilan</h2>
            </div>

            <Button size="sm" onClick={() => setCallState('idle')}>
              <RefreshCw className="h-3.5 w-3.5" />
              Panggilan Baru
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-xl bg-surface-muted p-4">
              <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Durasi panggilan</span>
              <span className="text-xl font-semibold text-fg tabular-nums">{formatTimer(callSeconds)}</span>
            </div>

            <div className="rounded-xl bg-surface-muted p-4">
              <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Kalimat diucapkan</span>
              <span className="text-xl font-semibold text-accent tabular-nums">{transcriptHistory.filter(t => t.role === 'user').length}</span>
            </div>

            <div className="rounded-xl bg-surface-muted p-4">
              <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Skor panggilan</span>
              <span className="text-xl font-semibold text-success tabular-nums">
                {review.status === 'done' && review.assessment ? `${review.assessment.overall}/100` : review.status === 'loading' ? '…' : '–'}
              </span>
            </div>
          </div>

          {/* Penilaian AI */}
          <div className="rounded-xl border border-line p-4">
            <h3 className="mb-3 text-sm font-semibold text-fg">Penilaian panggilan</h3>
            {review.status === 'loading' && (
              <p className="flex items-center gap-2 text-xs text-muted" role="status">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                AI sedang menilai panggilanmu...
              </p>
            )}
            {review.status === 'empty' && (
              <p className="text-xs text-muted">Belum ada ucapanmu di panggilan ini, jadi tidak ada yang dinilai.</p>
            )}
            {review.status === 'error' && (
              <p className="text-xs text-danger">Penilaian gagal dibuat. Transkrip tetap bisa dilihat di bawah.</p>
            )}
            {review.status === 'done' && (
              <div className="space-y-3">
                {review.assessment ? (
                  <CallAssessmentView assessment={review.assessment} />
                ) : (
                  <p className="text-xs text-muted">Penilaian AI tidak tersedia saat ini.</p>
                )}
                <p className="text-[11px] text-muted">
                  {review.storage === 'saved'
                    ? 'Tersimpan di riwayat panggilan.'
                    : review.storage === 'guest'
                      ? 'Login untuk menyimpan riwayat panggilan.'
                      : 'Riwayat tidak dapat disimpan. Pastikan migrasi call_sessions sudah dijalankan.'}
                </p>
              </div>
            )}
          </div>

          {savedLabel && <SavedPhraseNotice label={savedLabel} onDismiss={() => setSavedLabel(null)} />}

          {/* Transcript & Grammar Corrections */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-fg">Log percakapan & feedback</h3>
              <p className="text-xs text-muted">Simpan frasa penting ke daftar review untuk diulang nanti.</p>
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {transcriptHistory.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'space-y-1 rounded-xl border p-3 text-xs',
                    item.role === 'ai' ? 'border-line bg-surface-muted text-fg' : 'border-accent/30 bg-accent-soft text-fg'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-muted">
                    <span>{item.role === 'ai' ? 'AI Tutor' : 'Kamu'}</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="break-words">&ldquo;{item.text}&rdquo;</p>
                  {item.role === 'ai' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSaveTarget({ phrase: item.text.length <= PHRASE_MAX_CHARS ? item.text : '' })}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-surface hover:text-fg"
                      >
                        <BookmarkPlus className="h-3 w-3" />
                        Simpan frasa
                      </button>
                    </div>
                  )}
                  {item.correction && (
                    <div className="mt-2">
                      <CorrectionCard
                        correction={item.correction}
                        onSavePhrase={(phrase, note) => setSaveTarget({ phrase, note })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </Card>
      )}

      {/* Riwayat panggilan + penilaian (di layar awal dan setelah panggilan selesai) */}
      {(callState === 'idle' || callState === 'ended') && <CallHistory version={historyVersion} />}

      <SavePhraseDialog
        target={saveTarget}
        reason={PHRASE_REASONS.call}
        onClose={() => setSaveTarget(null)}
        onSaved={(label) => {
          setSaveTarget(null);
          setSavedLabel(label);
        }}
      />

    </div>
  );
}
