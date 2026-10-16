'use client';

import { useRef, useState } from 'react';
import { CircleCheck, Eye, EyeOff, LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { CoachApiError, sendCoachRequest } from '@/features/ai-coach/api';
import { acceptedAnswers, isAnswerMatch } from '@/lib/exercise-check';
import { useAppData } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';
import type { ExerciseItem } from '@/types/curriculum';
import type { AiProviderName } from '@/types/ai';

const MAX_CHARS = 500;

type AiState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; text: string; provider: AiProviderName }
  | { kind: 'error'; message: string };

/**
 * Satu soal latihan yang bisa dijawab langsung: isi jawaban, cek terhadap kunci,
 * lihat kunci, dan minta penjelasan AI (lewat /api/coach — API key tetap di server).
 * Soal terbuka (produksi kalimat) tidak dicek otomatis karena jawabannya bebas.
 */
export function ExerciseItemCard({
  item,
  index,
  open,
  context,
}: {
  item: ExerciseItem;
  index: number;
  open: boolean;
  /** Judul/instruksi aktivitas, dikirim ke AI sebagai konteks soal. */
  context: string;
}) {
  const data = useAppData();
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [ai, setAi] = useState<AiState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = answer.trim();
  const multiline = open || item.answer.length > 40;
  const inputId = `ex-${context.replace(/\W+/g, '-')}-${index}`;

  const check = () => {
    setChecked(isAnswerMatch(trimmed, item));
    setShowKey(true);
  };

  const askAi = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAi({ kind: 'loading' });
    try {
      const res = await sendCoachRequest(
        {
          action: 'check',
          difficulty: data?.settings.coachDifficulty ?? 'intermediate',
          question: `${context}\n${item.prompt}`.slice(0, 2000),
          userAnswer: trimmed,
          reference: acceptedAnswers(item).map((a) => a.slice(0, 500)).slice(0, 6),
          open,
        },
        controller.signal,
      );
      setAi({ kind: 'done', text: res.reply, provider: res.provider });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setAi({
        kind: 'error',
        message: error instanceof CoachApiError ? error.message : 'Penjelasan AI gagal dimuat. Coba lagi.',
      });
    }
  };

  return (
    <li className="rounded-xl border border-line p-3">
      <label htmlFor={inputId} className="block text-sm text-fg">
        <span className="mr-1.5 tabular-nums text-muted">{index + 1}.</span>
        {item.prompt}
      </label>

      <div className="mt-2">
        {multiline ? (
          <textarea
            id={inputId}
            value={answer}
            maxLength={MAX_CHARS}
            rows={open ? 3 : 2}
            placeholder={open ? 'Tulis kalimatmu sendiri dalam bahasa Inggris…' : 'Tulis jawabanmu…'}
            onChange={(e) => {
              setAnswer(e.target.value);
              setChecked(null);
            }}
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
          />
        ) : (
          <input
            id={inputId}
            value={answer}
            maxLength={MAX_CHARS}
            autoComplete="off"
            placeholder="Tulis jawabanmu…"
            onChange={(e) => {
              setAnswer(e.target.value);
              setChecked(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed) check();
            }}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg"
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!open && (
          <Button size="sm" onClick={check} disabled={!trimmed}>
            <CircleCheck className="h-3.5 w-3.5" />
            Cek
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => void askAi()} disabled={!trimmed || ai.kind === 'loading'}>
          {ai.kind === 'loading' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {open ? 'Minta koreksi AI' : 'Minta penjelasan AI'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowKey((v) => !v)}>
          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showKey ? 'Sembunyikan' : open ? 'Lihat contoh' : 'Lihat jawaban'}
        </Button>
      </div>

      {checked !== null && (
        <p
          role="status"
          className={cn('mt-2 flex items-center gap-1.5 text-xs', checked ? 'text-success' : 'text-warning')}
        >
          {checked ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
          {checked
            ? 'Cocok dengan kunci jawaban.'
            : 'Belum cocok dengan kunci. Bandingkan di bawah, atau minta penjelasan AI — jawabanmu bisa saja tetap benar.'}
        </p>
      )}

      {showKey && (
        <div className="mt-2 rounded-lg bg-surface-muted p-2.5 text-xs text-muted">
          <p className="font-medium text-fg">{item.answer}</p>
          {item.alternatives?.length ? <p className="mt-0.5">Juga benar: {item.alternatives.join(' / ')}</p> : null}
          {item.explanation && <p className="mt-0.5">{item.explanation}</p>}
        </div>
      )}

      {ai.kind === 'done' && (
        <div className="mt-2 rounded-lg border border-accent/30 bg-accent-soft p-2.5 text-sm" aria-live="polite">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-accent">
            <Sparkles className="h-3 w-3" aria-hidden />
            Penjelasan AI
            {ai.provider === 'mock' && <Badge tone="warning">Mock — bukan AI sungguhan</Badge>}
          </p>
          <p className="whitespace-pre-wrap text-fg">{ai.text}</p>
        </div>
      )}
      {ai.kind === 'error' && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {ai.message}
        </p>
      )}
    </li>
  );
}
