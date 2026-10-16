'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Shuffle, Check, RefreshCw, BookmarkPlus } from 'lucide-react';
import { speakText, stopSpeaking, createSpeechRecognizer, isSpeechRecognitionSupported } from '@/lib/speech';
import { Correction } from '@/lib/types';
import CorrectionCard from '@/components/chat/correction-card';
import { useHydrated } from '@/lib/storage/hooks';
import { PHRASE_MAX_CHARS, PHRASE_REASONS } from '@/lib/phrase-reviews';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, PageHeader } from '@/components/ui/feedback';
import { SavePhraseDialog, SavedPhraseNotice, type PhraseTarget } from '@/components/review/save-phrase-dialog';

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
  const [transcriptHistory, setTranscriptHistory] = useState<{ role: 'user' | 'ai'; text: string; time: string; correction?: Correction | null }[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [callSummaryScores, setCallSummaryScores] = useState<number[]>([]);
  const [saveTarget, setSaveTarget] = useState<PhraseTarget | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const mounted = useHydrated();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Handler terbaru untuk kalimat yang diucapkan (dipakai callback speech recognizer).
  const spokenHandlerRef = useRef<(text: string) => void>(() => {});

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

  // Start Voice Recognition Listener during call
  const startMicListener = useCallback(() => {
    if (!isSpeechRecognitionSupported() || isMuted) return;

    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch {}
    }

    const recognizer = createSpeechRecognizer({
      onResult: (text, isFinal) => {
        setCurrentTranscript(text);
        if (isFinal && text.trim()) {
          spokenHandlerRef.current(text.trim());
          setCurrentTranscript('');
        }
      },
      onError: (err) => {
        console.warn('Call mic error:', err);
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
        console.error('Failed to start call mic:', err);
      }
    }
  }, [isMuted]);

  const stopMicListener = useCallback(() => {
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch {}
      recognizerRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Process User Spoken Sentence in Voice Call
  const handleUserSpokenSentence = async (userText: string) => {
    stopMicListener();

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscriptHistory(prev => [...prev, { role: 'user', text: userText, time: timeNow }]);

    setIsAiSpeaking(true);

    const activeTopicContext = customTopic.trim()
      ? `User's custom topic choice: ${customTopic.trim()}`
      : selectedTopic
      ? `Topic: ${selectedTopic.title}`
      : 'Free open conversation about any topic the user wants to talk about.';

    try {
      const [corrRes, aiRes] = await Promise.all([
        fetch('/api/correction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: userText, userLevel: 'Intermediate' })
        }).then(r => r.json()).catch(() => null),

        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: transcriptHistory.concat({ role: 'user', text: userText, time: timeNow }).map(m => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.text
            })),
            scenarioPrompt: `You are on a direct live phone call with the user. ${activeTopicContext}. Feel completely open to discuss ANY topic the user brings up. Keep replies concise (1-3 sentences max) so it feels like a real fast-paced phone call.`,
            userLevel: 'Intermediate'
          })
        }).then(r => r.json()).catch(() => ({ reply: "That's awesome! Tell me more about that." }))
      ]);

      if (corrRes && typeof corrRes.score === 'number') {
        setCallSummaryScores(prev => [...prev, corrRes.score]);
        setTranscriptHistory(prev =>
          prev.map((item, idx) => idx === prev.length - 1 ? { ...item, correction: corrRes } : item)
        );
      }

      const aiReplyText = aiRes?.reply || "I hear you! What else comes to mind regarding this?";

      setTranscriptHistory(prev => [...prev, { role: 'ai', text: aiReplyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      // Play AI Speech Output
      if (isSpeakerOn) {
        speakText(
          aiReplyText,
          () => {
            setIsAiSpeaking(false);
            startMicListener();
          },
          'en-US'
        );
      } else {
        setIsAiSpeaking(false);
        startMicListener();
      }
    } catch (err) {
      console.error('Call processing error:', err);
      setIsAiSpeaking(false);
      startMicListener();
    }
  };

  useEffect(() => {
    spokenHandlerRef.current = (text) => void handleUserSpokenSentence(text);
  });

  // Start Phone Call
  const handleStartCall = (presetTopic?: TopicSuggestion) => {
    const chosenTopic = presetTopic || selectedTopic;
    if (presetTopic) setSelectedTopic(presetTopic);

    setCallState('calling');
    setCallSeconds(0);
    setTranscriptHistory([]);
    setCallSummaryScores([]);
    setSavedLabel(null);

    setTimeout(() => {
      setCallState('connected');

      let openerText = FREE_CALL_OPENER;
      if (customTopic.trim()) {
        openerText = `Hey there! Great to talk to you. I see you want to chat about "${customTopic.trim()}". I'd love to hear your thoughts on it!`;
      } else if (chosenTopic) {
        openerText = chosenTopic.aiOpener;
      }

      const initialTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setTranscriptHistory([{ role: 'ai', text: openerText, time: initialTime }]);
      setIsAiSpeaking(true);

      // AI speaks first on call connect!
      speakText(
        openerText,
        () => {
          setIsAiSpeaking(false);
          startMicListener();
        },
        'en-US'
      );
    }, 1500);
  };

  // End Phone Call
  const handleEndCall = () => {
    stopSpeaking();
    stopMicListener();
    setCallState('ended');
  };

  const handlePickRandomTopic = () => {
    const random = TOPIC_SUGGESTIONS[Math.floor(Math.random() * TOPIC_SUGGESTIONS.length)];
    setSelectedTopic(random);
    setCustomTopic('');
  };

  const avgCallScore = callSummaryScores.length > 0
    ? Math.round(callSummaryScores.reduce((a, b) => a + b, 0) / callSummaryScores.length)
    : 88;

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
                {isAiSpeaking ? 'AI sedang berbicara...' : isListening ? 'Mendengarkan suaramu...' : 'Panggilan aktif'}
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

          {/* Call Action Controls (Mute, Speaker, Hangup) */}
          <div className="flex w-full items-center justify-center gap-6 border-t border-line pt-4">
            {/* Mute Button */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stopMicListener();
                else startMicListener();
              }}
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
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
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
              <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Skor fluency</span>
              <span className="text-xl font-semibold text-success tabular-nums">{avgCallScore}/100</span>
            </div>
          </div>

          {savedLabel && <SavedPhraseNotice label={savedLabel} onDismiss={() => setSavedLabel(null)} />}

          {/* Transcript & Grammar Corrections */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-fg">Log percakapan & feedback</h3>
              <p className="text-xs text-muted">Simpan frasa penting ke daftar review untuk diulang nanti.</p>
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {transcriptHistory.map((item, idx) => (
                <div
                  key={idx}
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
