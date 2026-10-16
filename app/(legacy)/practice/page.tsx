'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PRACTICE_SCENARIOS } from '@/lib/scenarios';
import { Message, Scenario, Correction } from '@/lib/types';
import ScenarioSelector from '@/components/chat/scenario-selector';
import ChatMessage from '@/components/chat/chat-message';
import VoiceInput from '@/components/chat/voice-input';
import { Send, RefreshCw, Volume2, Award, VolumeX, LoaderCircle } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speech';
import { createId } from '@/lib/id';
import { useHydrated } from '@/lib/storage/hooks';
import { PHRASE_REASONS } from '@/lib/phrase-reviews';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, PageHeader } from '@/components/ui/feedback';
import { SavePhraseDialog, SavedPhraseNotice, type PhraseTarget } from '@/components/review/save-phrase-dialog';

function initialMessages(scenario: Scenario): Message[] {
  return [
    {
      id: 'init-1',
      role: 'assistant',
      content: scenario.initialMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];
}

export default function PracticeStudioPage() {
  const [currentScenario, setCurrentScenario] = useState<Scenario>(PRACTICE_SCENARIOS[0]);
  // Server merender loader (mounted=false), jadi timestamp awal tidak menimbulkan hydration mismatch.
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(PRACTICE_SCENARIOS[0]));
  const [inputText, setInputText] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [autoSpeakAI, setAutoSpeakAI] = useState(true);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number[]>([]);
  const [saveTarget, setSaveTarget] = useState<PhraseTarget | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const mounted = useHydrated();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Gulir hanya area pesan (bukan seluruh halaman) ke pesan terbaru.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoadingAI]);

  // Handle Scenario Switch
  const handleScenarioChange = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setMessages(initialMessages(scenario));
    setSessionScore([]);
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
    const userMsgId = createId('user');

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
        id: createId('ai'),
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
        <div className="flex items-center gap-2 text-sm text-muted" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span>Memuat Studio Role-play...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Studio Role-play"
        description="Latihan bicara & mengetik dengan AI sesuai skenario, lengkap dengan koreksi grammar dan audio aksen."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {avgScore !== null && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs text-muted">
                <Award className="h-3.5 w-3.5 text-warning" />
                Skor sesi
                <span className="font-semibold tabular-nums text-fg">{avgScore}/100</span>
              </span>
            )}

            {/* Auto Voice Toggle */}
            <Button
              size="sm"
              variant="secondary"
              aria-pressed={autoSpeakAI}
              onClick={() => {
                setAutoSpeakAI(!autoSpeakAI);
                if (autoSpeakAI) stopSpeaking();
              }}
              className={cn(autoSpeakAI && 'border-accent bg-accent-soft text-accent hover:bg-accent-soft')}
            >
              {autoSpeakAI ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Suara otomatis {autoSpeakAI ? 'ON' : 'OFF'}
            </Button>

            {/* Reset Chat */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleScenarioChange(currentScenario)}
              title="Ulangi percakapan"
              aria-label="Ulangi percakapan"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Scenario Selector */}
      <section aria-labelledby="scenario-heading">
        <h2 id="scenario-heading" className="mb-2 px-1 text-xs font-medium text-muted">
          Pilih skenario latihan
        </h2>
        <ScenarioSelector
          currentScenario={currentScenario}
          onSelectScenario={handleScenarioChange}
        />
      </section>

      {savedLabel && <SavedPhraseNotice label={savedLabel} onDismiss={() => setSavedLabel(null)} />}

      {/* Main Chat Box Container */}
      <Card className="flex h-[70vh] min-h-[28rem] flex-col overflow-hidden p-0 lg:h-[580px]">

        {/* Chat Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-success" aria-hidden></span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-fg">{currentScenario.title}</h3>
              <p className="truncate text-[11px] text-muted">Persona: {currentScenario.aiRole}</p>
            </div>
          </div>

          <Badge tone="accent">{currentScenario.level}</Badge>
        </div>

        {/* Messages Stream */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              scenarioName={currentScenario.aiRole}
              onTranslate={handleTranslateMessage}
              isTranslating={translatingId === msg.id}
              onSavePhrase={(phrase, note) => setSaveTarget({ phrase, note })}
            />
          ))}

          {isLoadingAI && (
            <div className="flex items-center gap-2 text-sm text-muted" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {currentScenario.aiRole} sedang menyusun balasan...
            </div>
          )}
        </div>

        {/* Suggested Prompts Pill Container */}
        {messages.length <= 2 && (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-line px-4 py-2">
            <span className="shrink-0 text-[11px] font-medium text-muted">Coba katakan:</span>
            {currentScenario.suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-fg transition-colors hover:bg-surface-muted"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        )}

        {/* Input Bar with STT Mic & Send */}
        <div className="flex items-end gap-2 border-t border-line p-3 sm:gap-3">

          {/* Web Speech API Microphone Input */}
          <VoiceInput
            onTranscript={(transcribed) => {
              setInputText(transcribed);
            }}
            isDisabled={isLoadingAI}
          />

          {/* Text Input Field */}
          <div className="relative min-w-0 flex-1">
            <label htmlFor="practice-input" className="sr-only">
              Jawaban kamu
            </label>
            <input
              id="practice-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ketik jawaban dalam bahasa Inggris atau pakai mikrofon..."
              disabled={isLoadingAI}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-muted disabled:opacity-60"
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoadingAI}
            aria-label="Kirim pesan"
            className="h-11 w-11 rounded-xl px-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

      </Card>

      <SavePhraseDialog
        target={saveTarget}
        reason={PHRASE_REASONS.practice}
        onClose={() => setSaveTarget(null)}
        onSaved={(label) => {
          setSaveTarget(null);
          setSavedLabel(label);
        }}
      />

    </div>
  );
}
