'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleCheck,
  LoaderCircle,
  Mic,
  RotateCcw,
  Send,
  Square,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { SpeakTopic } from '@/data/speak/topics';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, ProgressBar } from '@/components/ui/feedback';
import { PASS_SCORE, scoreSpoken, type SpeakFeedback, type SpeakLine, type SpokenWord } from '@/lib/speak';
import { speakText, stopSpeaking } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useSpeechCapture } from './use-speech-capture';
import { useSpeakProgress } from './use-speak-progress';

type Step = 'phrases' | 'talk' | 'result';
interface Tip {
  wrong: string;
  better: string;
  note: string;
}
type Line = SpeakLine & { tip?: Tip | null };

const STEPS: { id: Step; label: string }[] = [
  { id: 'phrases', label: '1. Frasa kunci' },
  { id: 'talk', label: '2. Percakapan' },
  { id: 'result', label: '3. Hasil' },
];
const MAX_USER_TURNS = 12;

function ListenButton({ text, label = 'Dengarkan' }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => speakText(text)}
      aria-label={`${label}: ${text}`}
      title={label}
      className="shrink-0 rounded-lg p-1.5 text-accent hover:bg-accent-soft"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}

function ScoreChip({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        score >= PASS_SCORE ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
      )}
    >
      {score}%
    </span>
  );
}

export function SpeakTopicView({ topic }: { topic: SpeakTopic }) {
  const [step, setStep] = useState<Step>('phrases');
  const capture = useSpeechCapture();
  const { record } = useSpeakProgress();

  // Langkah 1: frasa kunci
  const [drill, setDrill] = useState<Record<number, { score: number; words: SpokenWord[]; heard: string }>>({});
  const [activePhrase, setActivePhrase] = useState<number | null>(null);

  // Langkah 2: percakapan
  const [lines, setLines] = useState<Line[]>([]);
  const [goalsMet, setGoalsMet] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [talkError, setTalkError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  // Langkah 3: hasil
  const [feedback, setFeedback] = useState<SpeakFeedback | null>(null);
  const [rating, setRating] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, waiting]);

  const passed = Object.values(drill).filter((d) => d.score >= PASS_SCORE).length;
  const userTurns = lines.filter((l) => l.role === 'user').length;
  const allGoals = goalsMet.length === topic.goals.length;

  /* ------------------------------ Frasa kunci ------------------------------ */

  const practicePhrase = (index: number) => {
    if (capture.listening) {
      capture.stop();
      return;
    }
    setActivePhrase(index);
    capture.start((heard) => {
      setActivePhrase(null);
      if (!heard) return;
      setDrill((d) => ({ ...d, [index]: { ...scoreSpoken(topic.phrases[index].en, heard), heard } }));
    });
  };

  /* ------------------------------ Percakapan ------------------------------ */

  const startTalk = () => {
    capture.stop();
    setStep('talk');
    if (lines.length === 0) {
      setLines([{ role: 'ai', text: topic.opener }]);
      if (voiceOn) speakText(topic.opener);
    }
  };

  const restartTalk = () => {
    stopSpeaking();
    setLines([{ role: 'ai', text: topic.opener }]);
    setGoalsMet([]);
    setFeedback(null);
    setResultError(null);
    setSaveError(null);
    setTalkError(null);
    setStep('talk');
    if (voiceOn) speakText(topic.opener);
  };

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || waiting) return;
    stopSpeaking();
    const next: Line[] = [...lines, { role: 'user', text: clean }];
    setLines(next);
    setTyped('');
    setWaiting(true);
    setTalkError(null);
    try {
      const res = await fetch('/api/speak/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, lines: next.map(({ role, text: t }) => ({ role, text: t })), goalsMet }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.reply) throw new Error(body?.error ?? 'AI tidak membalas.');
      setGoalsMet(body.goalsMet ?? []);
      setLines((cur) => {
        const copy = [...cur];
        const last = copy.length - 1;
        if (copy[last]?.role === 'user') copy[last] = { ...copy[last], tip: body.tip ?? null };
        return [...copy, { role: 'ai', text: body.reply }];
      });
      if (voiceOn) speakText(body.reply);
    } catch (e) {
      setTalkError(e instanceof Error ? e.message : 'AI tidak membalas.');
    } finally {
      setWaiting(false);
    }
  };

  const talk = () => {
    if (capture.listening) {
      capture.stop();
      return;
    }
    capture.start((heard) => {
      if (heard) void send(heard);
    });
  };

  /* --------------------------------- Hasil -------------------------------- */

  const finish = async () => {
    capture.stop();
    stopSpeaking();
    setStep('result');
    setRating(true);
    setResultError(null);
    setSaveError(null);
    try {
      const res = await fetch('/api/speak/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, lines: lines.map(({ role, text }) => ({ role, text })), goalsMet }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.feedback) throw new Error(body?.error ?? 'Gagal menilai percakapan.');
      setFeedback(body.feedback);
      setSaveError(await record(topic.id, body.feedback.score));
    } catch (e) {
      setResultError(e instanceof Error ? e.message : 'Gagal menilai percakapan.');
    } finally {
      setRating(false);
    }
  };

  /* --------------------------------- Tampilan ------------------------------- */

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/speak" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Semua topik
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <span className="text-3xl leading-none" aria-hidden>
            {topic.icon}
          </span>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-fg">
              {topic.title} <Badge>{topic.level}</Badge>
            </h1>
            <p className="text-sm text-muted italic">{topic.titleEn}</p>
          </div>
        </div>
      </div>

      <nav aria-label="Langkah latihan" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => (s.id === 'talk' ? startTalk() : s.id === 'result' ? feedback && setStep('result') : setStep(s.id))}
            disabled={s.id === 'result' && !feedback}
            aria-current={step === s.id ? 'step' : undefined}
            className={cn(
              'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
              step === s.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {capture.error && <Alert tone="warning">{capture.error}</Alert>}

      {/* ---------------------------- 1. Frasa kunci ---------------------------- */}
      {step === 'phrases' && (
        <Card>
          <CardHeader
            title="Frasa kunci"
            description={`Dengarkan, lalu tekan mikrofon dan ucapkan. Lulus bila ≥ ${PASS_SCORE}%. ${passed}/${topic.phrases.length} lulus.`}
          />
          <ul className="space-y-2">
            {topic.phrases.map((p, i) => {
              const r = drill[i];
              const active = activePhrase === i && capture.listening;
              return (
                <li key={p.en} className="rounded-xl border border-line px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {r ? (
                        <p className="text-sm">
                          {r.words.map((w, k) => (
                            <span key={k} className={w.ok ? 'text-success' : 'font-medium text-danger underline'}>
                              {w.word}{' '}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-fg">{p.en}</p>
                      )}
                      <p className="text-xs text-muted italic">{p.id}</p>
                      {active && capture.interim && <p className="mt-1 text-xs text-accent">“{capture.interim}”</p>}
                      {r && !active && (
                        <p className="mt-1 text-xs text-muted">
                          Terdengar: “{r.heard}”
                        </p>
                      )}
                    </div>
                    {r && <ScoreChip score={r.score} />}
                    <ListenButton text={p.en} />
                    <button
                      type="button"
                      onClick={() => practicePhrase(i)}
                      disabled={capture.listening && !active}
                      aria-label={active ? 'Berhenti merekam' : `Ucapkan: ${p.en}`}
                      className={cn(
                        'shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40',
                        active ? 'bg-danger text-white dark:text-bg' : 'text-accent hover:bg-accent-soft',
                      )}
                    >
                      {active ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">Kata merah = belum terdengar jelas. Ulangi pelan-pelan.</p>
            <Button onClick={startTalk}>Mulai percakapan</Button>
          </div>
        </Card>
      )}

      {/* ---------------------------- 2. Percakapan ---------------------------- */}
      {step === 'talk' && (
        <>
          <Card>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-fg">Misi ({goalsMet.length}/{topic.goals.length})</h2>
                  <p className="mt-0.5 text-xs text-muted">{topic.scene}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVoiceOn((v) => !v);
                  stopSpeaking();
                }}
                aria-pressed={voiceOn}
                title={voiceOn ? 'Matikan suara AI' : 'Nyalakan suara AI'}
                className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-fg"
              >
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {topic.goals.map((g) => {
                const done = goalsMet.includes(g.id);
                return (
                  <li
                    key={g.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs',
                      done ? 'bg-success-soft text-success' : 'bg-surface-muted text-fg',
                    )}
                  >
                    {done ? <CircleCheck className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-line" />}
                    <span className={done ? 'line-through' : ''}>{g.label}</span>
                  </li>
                );
              })}
            </ul>
            {allGoals && (
              <Alert tone="success" className="mt-3" action={<Button size="sm" onClick={finish}>Lihat hasil</Button>}>
                Semua misi selesai! Lanjutkan sebentar atau lihat hasilnya.
              </Alert>
            )}
          </Card>

          <Card className="p-0">
            <div ref={logRef} className="max-h-[26rem] space-y-3 overflow-y-auto p-4" aria-live="polite">
              {lines.map((l, i) => (
                <div key={i} className={cn('flex', l.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] space-y-1', l.role === 'user' && 'items-end')}>
                    <div
                      className={cn(
                        'flex items-start gap-1 rounded-2xl px-3 py-2 text-sm',
                        l.role === 'user' ? 'bg-accent text-accent-fg' : 'bg-surface-muted text-fg',
                      )}
                    >
                      <span className="min-w-0">{l.text}</span>
                      {l.role === 'ai' && <ListenButton text={l.text} />}
                    </div>
                    {l.tip && (
                      <p className="rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-1.5 text-xs text-fg">
                        <span className="text-muted line-through">{l.tip.wrong}</span>
                        <span className="mx-1 text-muted">→</span>
                        <span className="font-medium">{l.tip.better}</span>
                        {l.tip.note && <span className="block text-muted">{l.tip.note}</span>}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {waiting && (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> AI sedang membalas…
                </p>
              )}
              {capture.listening && capture.interim && (
                <p className="text-right text-sm text-accent italic">“{capture.interim}”</p>
              )}
            </div>

            <div className="space-y-2 border-t border-line p-3">
              {talkError && (
                <Alert tone="error" action={<Button size="sm" variant="secondary" onClick={() => setTalkError(null)}>Tutup</Button>}>
                  {talkError}
                </Alert>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={talk}
                  disabled={waiting || userTurns >= MAX_USER_TURNS}
                  aria-label={capture.listening ? 'Berhenti & kirim' : 'Tekan lalu bicara'}
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
                    capture.listening ? 'animate-pulse bg-danger text-white dark:text-bg' : 'bg-accent text-accent-fg hover:bg-accent-hover',
                  )}
                >
                  {capture.listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(typed);
                  }}
                >
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={capture.listening ? 'Mendengarkan…' : 'Tekan mikrofon, atau ketik di sini'}
                    aria-label="Ketik jawaban"
                    maxLength={500}
                    disabled={waiting || userTurns >= MAX_USER_TURNS}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted"
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={!typed.trim() || waiting} aria-label="Kirim">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span>
                  Giliranmu {userTurns}/{MAX_USER_TURNS}. Bicara dengan kalimat lengkap.
                </span>
                <Button size="sm" variant={allGoals ? 'primary' : 'secondary'} onClick={finish} disabled={userTurns < 2 || waiting}>
                  Selesai & nilai
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ------------------------------- 3. Hasil ------------------------------- */}
      {step === 'result' && (
        <Card>
          {rating && (
            <p className="flex items-center gap-2 text-sm text-muted" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Menilai percakapanmu…
            </p>
          )}
          {resultError && (
            <Alert tone="error" action={<Button size="sm" variant="secondary" onClick={finish}>Coba lagi</Button>}>
              {resultError}
            </Alert>
          )}
          {feedback && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4',
                    feedback.score >= 70 ? 'border-success text-success' : 'border-warning text-warning',
                  )}
                >
                  <span className="text-2xl font-bold">{feedback.score}</span>
                  <span className="text-[10px]">/ 100</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    Misi {goalsMet.length}/{topic.goals.length} selesai
                  </p>
                  <p className="mt-1 text-sm text-muted">{feedback.summary}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ['Kelancaran', feedback.fluency],
                    ['Grammar', feedback.grammar],
                    ['Kosakata', feedback.vocabulary],
                    ['Misi', feedback.task],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="text-sm font-semibold text-fg">{value}</dd>
                    <ProgressBar value={value} label={label} tone={value >= 70 ? 'success' : 'accent'} className="mt-1" />
                  </div>
                ))}
              </dl>

              {feedback.improvements.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Ucapkan versi yang lebih baik</p>
                  <ul className="space-y-2">
                    {feedback.improvements.map((imp, i) => (
                      <li key={i} className="rounded-xl border border-line px-3 py-2.5 text-sm">
                        <p className="text-muted line-through">{imp.you}</p>
                        <p className="mt-0.5 flex items-start gap-1 font-medium text-fg">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span className="min-w-0 flex-1">{imp.better}</span>
                          <ListenButton text={imp.better} />
                        </p>
                        {imp.why && <p className="mt-0.5 text-xs text-muted">{imp.why}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.nextTip && (
                <Alert>
                  <span className="font-medium text-fg">Tips berikutnya:</span> {feedback.nextTip}
                </Alert>
              )}
              {saveError && <Alert tone="warning">{saveError}</Alert>}

              <div className="flex flex-wrap gap-2">
                <Button onClick={restartTalk}>
                  <RotateCcw className="h-4 w-4" /> Ulangi percakapan
                </Button>
                <Button variant="secondary" onClick={() => setStep('phrases')}>
                  Latih frasa lagi
                </Button>
                <Link href="/speak" className="inline-flex items-center px-3 text-sm font-medium text-accent hover:underline">
                  Topik lain
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
