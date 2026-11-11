'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react';
import { Alert, Badge } from '@/components/ui/feedback';
import { RECALL_SOURCES, type RecallHistory, type RecallQuestion, type RecallSessionSummary } from '@/lib/recall';
import { cn } from '@/lib/utils';

/** Riwayat Vocabulary Recall dari /api/recall/sessions; dipakai halaman Recall dan Dashboard. */

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const SOURCE_LABEL = Object.fromEntries(RECALL_SOURCES.map((s) => [s.id, s.label])) as Record<
  RecallSessionSummary['source'],
  string
>;

export function percent(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 0;
}

/** Memuat riwayat; `version` dinaikkan untuk memuat ulang (mis. setelah sesi baru disimpan). */
export function useRecallHistory(version = 0) {
  const [state, setState] = useState<{ version: number; history: RecallHistory | null; error: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/recall/sessions', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<RecallHistory>;
      })
      .then((history) => setState({ version, history, error: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ version, history: null, error: true });
      });
    return () => controller.abort();
  }, [version]);

  const loading = state?.version !== version;
  return { history: loading ? null : (state?.history ?? null), error: !loading && !!state?.error, loading };
}

export function ScoreBadge({ correct, total }: { correct: number; total: number }) {
  const pct = percent(correct, total);
  return (
    <Badge tone={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}>
      {correct}/{total}
    </Badge>
  );
}

/** Daftar soal satu sesi beserta jawaban pengguna. */
export function RecallReview({ questions }: { questions: RecallQuestion[] }) {
  return (
    <ol className="space-y-3">
      {questions.map((q, i) => {
        const ok = q.chosen === q.answer;
        return (
          <li key={i} className="rounded-lg border border-line p-3 text-sm">
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white',
                  ok ? 'bg-success' : 'bg-danger',
                )}
                aria-label={ok ? 'Benar' : 'Salah'}
              >
                {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-fg">
                  <span className="mr-1 text-muted">{i + 1}.</span>
                  {q.prompt}
                </p>
                {q.sentence && <p className="text-muted italic">{q.sentence}</p>}
                <p className="text-xs">
                  <span className="text-muted">Jawaban benar: </span>
                  <span className="font-medium text-success">{q.options[q.answer]}</span>
                  {!ok && q.chosen !== undefined && (
                    <>
                      <span className="text-muted"> · jawabanmu: </span>
                      <span className="text-danger line-through">{q.options[q.chosen]}</span>
                    </>
                  )}
                </p>
                {q.explanation && <p className="text-xs text-muted">{q.explanation}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Satu baris riwayat yang bisa dibuka untuk melihat soal & jawaban. */
function SessionRow({ session, defaultOpen }: { session: RecallSessionSummary; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [detail, setDetail] = useState<{ questions: RecallQuestion[] } | 'loading' | 'error' | null>(null);

  const load = () => {
    setDetail('loading');
    fetch(`/api/recall/sessions/${session.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body) => setDetail({ questions: body.questions }))
      .catch(() => setDetail('error'));
  };

  useEffect(() => {
    // Sesi yang ditautkan dari Dashboard langsung dibuka.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (defaultOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    setOpen(!open);
    if (!open && (detail === null || detail === 'error')) load();
  };

  return (
    <li id={`sesi-${session.id}`} className="scroll-mt-20">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-medium text-fg">{SOURCE_LABEL[session.source]}</span>
            <span className="text-xs text-muted">{dateFormat.format(new Date(session.createdAt))}</span>
          </span>
          <span className="block truncate text-xs text-muted">{session.items.join(', ')}</span>
        </span>
        <ScoreBadge correct={session.correct} total={session.total} />
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          {detail === 'loading' || detail === null ? (
            <p className="flex items-center gap-2 text-xs text-muted" role="status">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Memuat soal...
            </p>
          ) : detail === 'error' ? (
            <Alert tone="error">Sesi tidak dapat dimuat. Coba buka lagi.</Alert>
          ) : (
            <RecallReview questions={detail.questions} />
          )}
        </div>
      )}
    </li>
  );
}

export function RecallSessionList({ sessions, openId }: { sessions: RecallSessionSummary[]; openId?: string | null }) {
  return (
    <ul className="divide-y divide-line">
      {sessions.map((s) => (
        <SessionRow key={s.id} session={s} defaultOpen={s.id === openId} />
      ))}
    </ul>
  );
}
