'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PRACTICE_SCENARIOS } from '@/lib/scenarios';
import { Message, Scenario, Correction } from '@/lib/types';
import ScenarioSelector from '@/components/chat/scenario-selector';
import ChatMessage from '@/components/chat/chat-message';
import VoiceInput from '@/components/chat/voice-input';
import { Send, RefreshCw, Volume2, Sparkles, AlertCircle, Award, VolumeX } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speech';

export default function PracticeStudioPage() {
  const [currentScenario, setCurrentScenario] = useState<Scenario>(PRACTICE_SCENARIOS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [autoSpeakAI, setAutoSpeakAI] = useState(true);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize initial scenario message
  useEffect(() => {
    if (!mounted) return;
    setMessages([
      {
        id: 'init-1',
        role: 'assistant',
        content: currentScenario.initialMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setSessionScore([]);
  }, [currentScenario, mounted]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingAI]);

  // Handle Scenario Switch
  const handleScenarioChange = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    stopSpeaking();
  };

  // Perform Grammar Correction API Call
  const fetchGrammarCorrection = async (userText: string): Promise<Correction | null> => {
    try {
      const res = await fetch('/api/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, userLevel: currentScenario.level })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.score === 'number') {
          setSessionScore(prev => [...prev, data.score]);
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to get grammar correction:', err);
    }
    return null;
  };

  // Submit User Message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoadingAI) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'user-' + Date.now();

    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: textToSend.trim(),
      timestamp: timeStr,
      correction: null
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoadingAI(true);

    // Parallel fetch: Grammar Correction + AI Response
    const [correctionResult, aiResponse] = await Promise.all([
      fetchGrammarCorrection(textToSend.trim()),
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          scenarioPrompt: currentScenario.systemPrompt,
          userLevel: currentScenario.level
        })
      }).then(r => r.json()).catch(err => ({ error: err.message }))
    ]);

    // Attach correction to user message
    setMessages(prev =>
      prev.map(m => m.id === userMsgId ? { ...m, correction: correctionResult } : m)
    );

    setIsLoadingAI(false);

    if (aiResponse && aiResponse.reply) {
      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: aiResponse.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);

      // Auto-read AI message in en-US voice if enabled
      if (autoSpeakAI) {
        speakText(aiResponse.reply, undefined, 'en-US');
      }
    }
  };

  // Translate specific message
  const handleTranslateMessage = async (msgId: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg) return;

    setTranslatingId(msgId);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: targetMsg.content }],
          action: 'translate'
        })
      });
      const data = await res.json();
      if (data.translation) {
        setMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, translation: data.translation } : m)
        );
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  // Calculate Average Fluency Score for current session
  const avgScore = sessionScore.length > 0
    ? Math.round(sessionScore.reduce((a, b) => a + b, 0) / sessionScore.length)
    : null;

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Sparkles className="h-5 w-5 animate-spin" />
          <span>Loading AI Conversation Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Conversation Studio</h1>
          </div>
          <p className="text-xs text-slate-400">
            Practice speaking & typing with native AI, get instant grammar analysis and accent audio.
          </p>
        </div>

        {/* Controls & Fluency Tracker */}
        <div className="flex items-center gap-3">
          {avgScore !== null && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-1.5 shadow-sm">
              <Award className="h-4 w-4 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Session Score</span>
                <span className="text-sm font-extrabold text-indigo-400">{avgScore}/100</span>
              </div>
            </div>
          )}

          {/* Auto Voice Toggle */}
          <button
            type="button"
            onClick={() => {
              setAutoSpeakAI(!autoSpeakAI);
              if (autoSpeakAI) stopSpeaking();
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border ${
              autoSpeakAI
                ? 'bg-indigo-950/80 border-indigo-600/50 text-indigo-300 shadow-md shadow-indigo-500/10'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoSpeakAI ? <Volume2 className="h-4 w-4 text-indigo-400" /> : <VolumeX className="h-4 w-4" />}
            <span>Auto Voice {autoSpeakAI ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reset Chat */}
          <button
            type="button"
            onClick={() => handleScenarioChange(currentScenario)}
            title="Reset conversation"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scenario Selector */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
          Select Practice Scenario
        </label>
        <ScenarioSelector
          currentScenario={currentScenario}
          onSelectScenario={handleScenarioChange}
        />
      </div>

      {/* Main Chat Box Container */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[580px] shadow-2xl">
        
        {/* Chat Header Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <h3 className="text-sm font-bold text-white">{currentScenario.title}</h3>
              <p className="text-[11px] text-slate-400">Persona: {currentScenario.aiRole}</p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-0.5 rounded-full">
            {currentScenario.level}
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              scenarioName={currentScenario.aiRole}
              onTranslate={handleTranslateMessage}
              isTranslating={translatingId === msg.id}
            />
          ))}

          {isLoadingAI && (
            <div className="flex gap-3 my-4 items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white">
                <Sparkles className="h-5 w-5 animate-spin" />
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-xs text-indigo-300 animate-pulse font-medium">
                {currentScenario.aiRole} is thinking and formulating response...
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts Pill Container */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Try saying:</span>
            {currentScenario.suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white px-3 py-1 rounded-full border border-slate-700/60 shrink-0 transition-colors"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        )}

        {/* Input Bar with STT Mic & Send */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center gap-3">
          
          {/* Web Speech API Microphone Input */}
          <VoiceInput
            onTranscript={(transcribed) => {
              setInputText(transcribed);
            }}
            isDisabled={isLoadingAI}
          />

          {/* Text Input Field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your English response or use microphone to speak..."
              disabled={isLoadingAI}
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoadingAI}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

      </div>

    </div>
  );
}
