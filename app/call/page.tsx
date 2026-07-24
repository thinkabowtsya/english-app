'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Shuffle, Check, Award, RefreshCw, MessageCircle } from 'lucide-react';
import { speakText, stopSpeaking, createSpeechRecognizer, isSpeechRecognitionSupported } from '@/lib/speech';
import { Correction } from '@/lib/types';
import CorrectionCard from '@/components/chat/correction-card';

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
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
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
          handleUserSpokenSentence(text.trim());
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

  // Start Phone Call
  const handleStartCall = (presetTopic?: TopicSuggestion) => {
    const chosenTopic = presetTopic || selectedTopic;
    if (presetTopic) setSelectedTopic(presetTopic);

    setCallState('calling');
    setCallSeconds(0);
    setTranscriptHistory([]);
    setCallSummaryScores([]);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <PhoneCall className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Voice Call Studio</h1>
          </div>
          <p className="text-xs text-slate-400">
            Telepon bareng AI secara bebas membahas topik apa saja. (Stimuler Style Call)
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-950/50 border border-emerald-800/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Hands-free Voice Engine</span>
        </div>
      </div>

      {/* CALL STATE 1: IDLE / PRE-CALL SCREEN */}
      {callState === 'idle' && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          
          {/* Main Call Avatar & Quick Start Free Call Button */}
          <div className="text-center space-y-4 max-w-lg mx-auto py-2">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 p-1 shadow-xl shadow-emerald-500/25">
              <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center text-emerald-400">
                <PhoneCall className="h-9 w-9 animate-pulse" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white">Telepon Bareng AI (Bebas Apa Saja)</h2>
              <p className="text-xs text-slate-300 mt-1">
                Langsung telepon dan bicarakan topik apapun secara bebas tanpa batasan!
              </p>
            </div>

            {/* Primary Feature: Direct Free Call Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setSelectedTopic(null);
                  handleStartCall();
                }}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white font-extrabold text-base shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
              >
                <PhoneCall className="h-6 w-6" />
                <span>Mulai Telepon Bebas Sekarang</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              Atau (Opsional) Tentukan Topik Sendiri
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Custom Topic Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Tulis Topik Bebas Yang Ingin Dibahas (Opsional):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value) setSelectedTopic(null);
                }}
                placeholder="Contoh: Diskusi game favorit, hobi fotografi, rencana liburan..."
                className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {customTopic && (
                <button
                  onClick={() => handleStartCall()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  Telepon Topik Ini
                </button>
              )}
            </div>
          </div>

          {/* Optional Topic Suggestions (Saran Topik jika bingung) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Bingung Mau Bahas Apa? Pilihan Rekomendasi Topik (Opsional):
              </label>

              <button
                type="button"
                onClick={handlePickRandomTopic}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>Acak Topik</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TOPIC_SUGGESTIONS.map((topic) => {
                const isSelected = selectedTopic?.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setCustomTopic('');
                    }}
                    className={`text-left p-3.5 rounded-xl transition-all border flex items-start gap-3 ${
                      isSelected
                        ? 'bg-slate-900 border-2 border-emerald-500 shadow-lg shadow-emerald-500/15'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{topic.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{topic.title}</h4>
                        {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">
                        &ldquo;{topic.aiOpener}&rdquo;
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* CALL STATE 2: CALL IN PROGRESS (CALLING & CONNECTED) */}
      {(callState === 'calling' || callState === 'connected') && (
        <div className="glass-panel rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-between min-h-[550px] bg-slate-950/95">
          
          {/* Ambient Glows */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>

          {/* Call Top Bar */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                {callState === 'calling' ? 'Calling...' : 'Live Voice Call Connected'}
              </span>
            </div>

            <span className="font-mono text-sm font-extrabold text-slate-300 bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-full">
              {formatTimer(callSeconds)}
            </span>
          </div>

          {/* Center AI Contact Avatar & Waveform */}
          <div className="flex flex-col items-center text-center space-y-4 z-10 my-auto">
            <div className="relative">
              <div className={`h-28 w-28 rounded-full p-1 transition-all duration-500 ${
                isAiSpeaking
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 ring-8 ring-emerald-500/20 scale-110'
                  : 'bg-slate-800 border-2 border-slate-700'
              }`}>
                <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center text-white">
                  <Sparkles className={`h-12 w-12 ${isAiSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                </div>
              </div>

              {/* Sound Wave Indicator */}
              {isAiSpeaking && (
                <div className="absolute -bottom-3 inset-x-0 flex justify-center items-center gap-1">
                  <span className="w-1 bg-emerald-400 rounded-full animate-wave-bar"></span>
                  <span className="w-1 bg-teal-400 rounded-full animate-wave-bar-delay-1"></span>
                  <span className="w-1 bg-indigo-400 rounded-full animate-wave-bar-delay-2"></span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Antigravity AI Tutor</h3>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                {isAiSpeaking ? 'AI is speaking...' : isListening ? 'Listening to your voice...' : 'Call Active'}
              </p>
              <span className="inline-block mt-2 text-[11px] font-semibold text-slate-300 bg-slate-900 px-3.5 py-1 rounded-full border border-slate-800">
                Topik: {customTopic ? customTopic : selectedTopic ? selectedTopic.title : 'Bebas Apa Saja'}
              </span>
            </div>

            {/* Live Call Transcript Bubble */}
            <div className="max-w-md mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 shadow-inner">
              {currentTranscript ? (
                <p className="italic text-indigo-300 animate-pulse">&ldquo;{currentTranscript}&rdquo;</p>
              ) : transcriptHistory.length > 0 ? (
                <p className="line-clamp-2">
                  <strong className="text-emerald-400 mr-1">
                    {transcriptHistory[transcriptHistory.length - 1].role === 'ai' ? 'AI:' : 'You:'}
                  </strong>
                  &ldquo;{transcriptHistory[transcriptHistory.length - 1].text}&rdquo;
                </p>
              ) : (
                <p className="text-slate-500">Connecting audio channels...</p>
              )}
            </div>
          </div>

          {/* Call Action Controls (Mute, Speaker, Hangup) */}
          <div className="z-10 flex items-center justify-center gap-6 pt-4 w-full border-t border-slate-800/80">
            {/* Mute Button */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stopMicListener();
                else startMicListener();
              }}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg ${
                isMuted
                  ? 'bg-rose-950 border border-rose-800 text-rose-400'
                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              title="End Call"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/30 hover:scale-110 active:scale-95 transition-all"
            >
              <PhoneOff className="h-7 w-7" />
            </button>

            {/* Speaker Toggle */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              title={isSpeakerOn ? "Speaker On" : "Speaker Muted"}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg ${
                isSpeakerOn
                  ? 'bg-indigo-950 border border-indigo-700 text-indigo-300'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </button>
          </div>

        </div>
      )}

      {/* CALL STATE 3: CALL ENDED SUMMARY REPORT */}
      {callState === 'ended' && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-400">Call Summary Report</span>
              <h2 className="text-xl font-bold text-white">Post-Call Fluency & Analysis</h2>
            </div>

            <button
              onClick={() => setCallState('idle')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New Phone Call</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Call Duration</span>
              <span className="text-xl font-extrabold text-white">{formatTimer(callSeconds)}</span>
            </div>

            <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sentences Spoken</span>
              <span className="text-xl font-extrabold text-indigo-400">{transcriptHistory.filter(t => t.role === 'user').length}</span>
            </div>

            <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Call Fluency Score</span>
              <span className="text-xl font-extrabold text-emerald-400">{avgCallScore}/100</span>
            </div>
          </div>

          {/* Transcript & Grammar Corrections */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Call Conversation Log & Feedback:</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {transcriptHistory.map((item, idx) => (
                <div key={idx} className={`p-3 rounded-xl border text-xs space-y-1 ${
                  item.role === 'ai' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-indigo-950/40 border-indigo-800/40 text-indigo-200'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{item.role === 'ai' ? 'AI Tutor' : 'You (Learner)'}</span>
                    <span>{item.time}</span>
                  </div>
                  <p>&ldquo;{item.text}&rdquo;</p>
                  {item.correction && (
                    <div className="mt-2">
                      <CorrectionCard correction={item.correction} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
