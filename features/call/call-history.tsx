'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, History, LoaderCircle, Volume2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, EmptyState, ProgressBar, Skeleton } from '@/components/ui/feedback';
import {
  ASSESSMENT_SCORES,
  formatDuration,
  type CallAssessment,
  type CallSessionDetail,
  type CallSessionSummary,
} from '@/lib/call-assessment';
import { playPronunciation } from '@/lib/speech';
import { cn } from '@/lib/utils';

/** Penilaian & riwayat Telepon AI (tabel call_sessions lewat /api/call/sessions). */

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function scoreTone(score: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (score === null) return 'neutral';
  return score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
}

/** Rincian penilaian satu panggilan. */
export function CallAssessmentView({ assessment }: { assessment: CallAssessment }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-center">
          <p className="text-4xl font-semibold text-fg tabular-nums">{assessment.overall}</p>
          <p className="text-[11px] text-muted">dari 100</p>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {assessment.level && <Badge tone="accent">Perkiraan level {assessment.level}</Badge>}
          <p className="text-sm text-fg">{assessment.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ASSESSMENT_SCORES.map(({ key, label }) => (
          <div key={key}>
            <p className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-fg">{label}</span>
              <span className="text-muted tabular-nums">{assessment[key]}</span>
            </p>
            <ProgressBar
              value={assessment[key]}
              label={label}
              tone={assessment[key] >= 70 ? 'success' : 'accent'}
              className="mt-1 h-1.5"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { title: 'Yang sudah bagus', items: assessment.strengths, tone: 'text-success' },
          { title: 'Yang perlu ditingkatkan', items: assessment.improvements, tone: 'text-warning' },
        ].map((block) =>
          block.items.length > 0 ? (
            <div key={block.title}>
              <p className={cn('mb-1 text-xs font-semibold', block.tone)}>{block.title}</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-fg">
                {block.items.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>

      {assessment.betterPhrases.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted uppercase">Cara bilang yang lebih natural</p>
          <ul className="space-y-2">
            {assessment.betterPhrases.map((p, i) => (
              <li key={i} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                <p className="text-muted line-through decoration-danger/60">{p.said}</p>
                <p className="flex items-start gap-1.5 font-medium text-fg">
                  <button
                    type="button"
                    onClick={() => playPronunciation(p.better)}
                    aria-label="Dengarkan"
                    className="mt-0.5 shrink-0 rounded p-0.5 text-accent hover:bg-accent-soft"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                  {p.better}
                </p>
                {p.note && <p className="text-xs text-muted">{p.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: CallSessionSummary }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CallSessionDetail | 'loading' | 'error' | null>(null);

  const toggle = () => {
    setOpen(!open);
    if (!open && (detail === null || detail === 'error')) {
      setDetail('loading');
      fetch(`/api/call/sessions/${session.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((body: CallSessionDetail) => setDetail(body))
        .catch(() => setDetail('error'));
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{session.topic}</span>
          <span className="block text-xs text-muted">
            {dateFormat.format(new Date(session.createdAt))} · {formatDuration(session.durationSeconds)} ·{' '}
            {session.userTurns} ucapan
          </span>
        </span>
        <Badge tone={scoreTone(session.overallScore)}>
          {session.overallScore === null ? 'Tanpa nilai' : `${session.overallScore}/100`}
        </Badge>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4 sm:px-5">
          {detail === null || detail === 'loading' ? (
            <p className="flex items-center gap-2 text-xs text-muted" role="status">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Memuat panggilan...
            </p>
          ) : detail === 'error' ? (
            <Alert tone="error">Panggilan tidak dapat dimuat. Coba buka lagi.</Alert>
          ) : (
            <>
              {detail.assessment ? (
                <CallAssessmentView assessment={detail.assessment} />
              ) : (
                <p className="text-xs text-muted">Penilaian tidak tersedia untuk panggilan ini.</p>
              )}
              <details className="rounded-lg border border-line">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-fg">Transkrip ({detail.lines.length} baris)</summary>
                <ul className="max-h-80 space-y-1.5 overflow-y-auto px-3 pb-3 text-xs">
                  {detail.lines.map((l, i) => (
                    <li key={i} className={cn('rounded-md px-2 py-1.5', l.role === 'ai' ? 'bg-surface-muted' : 'bg-accent-soft')}>
                      <span className="mr-1 font-semibold text-muted">{l.role === 'ai' ? 'AI' : 'Kamu'}:</span>
                      <span className="text-fg">{l.text}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** Daftar panggilan sebelumnya; `version` dinaikkan untuk memuat ulang setelah panggilan baru disimpan. */
export function CallHistory({ version = 0 }: { version?: number }) {
  const [state, setState] = useState<{
    version: number;
    sessions: CallSessionSummary[];
    storage: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/call/sessions', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body) => setState({ version, sessions: body.sessions ?? [], storage: body.storage, error: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ version, sessions: [], storage: 'unavailable', error: true });
      });
    return () => controller.abort();
  }, [version]);

  const current = state?.version === version ? state : null;

  return (
    <Card className="p-0">
      <CardHeader
        icon={<History className="h-4 w-4" />}
        title="Riwayat panggilan"
        description="Buka panggilan untuk melihat penilaian, saran kalimat, dan transkripnya."
        className="mb-0 border-b border-line px-5 py-4"
      />
      {!current ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : current.storage === 'guest' ? (
        <div className="p-4">
          <Alert tone="info">Login untuk menyimpan riwayat panggilan.</Alert>
        </div>
      ) : current.error || current.storage !== 'saved' ? (
        <div className="p-4">
          <Alert tone="info">Riwayat tidak dapat dimuat. Pastikan migrasi call_sessions sudah dijalankan di Supabase.</Alert>
        </div>
      ) : current.sessions.length === 0 ? (
        <EmptyState className="m-4" title="Belum ada panggilan" description="Setelah panggilan selesai, penilaiannya tersimpan di sini." />
      ) : (
        <ul className="divide-y divide-line">
          {current.sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}
    </Card>
  );
}
