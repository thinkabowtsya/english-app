'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, History, LoaderCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, EmptyState, Skeleton } from '@/components/ui/feedback';
import { PRACTICE_KINDS, type PracticeItem, type PracticeKind, type PracticeSessionSummary } from '@/lib/practice';
import { cn } from '@/lib/utils';
import { PracticeReview } from './practice-session';

/** Riwayat latihan dari /api/practice/sessions untuk satu atau beberapa jenis latihan. */

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

interface HistoryState {
  key: string;
  sessions: PracticeSessionSummary[];
  totals: { sessions: number; items: number; correct: number };
  storage: string;
  error: boolean;
}

function SessionRow({ session, showKind }: { session: PracticeSessionSummary; showKind: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PracticeItem[] | 'loading' | 'error' | null>(null);

  const toggle = () => {
    setOpen(!open);
    if (!open && (items === null || items === 'error')) {
      setItems('loading');
      fetch(`/api/practice/sessions/${session.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((body) => setItems(body.items))
        .catch(() => setItems('error'));
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
          <span className="block truncate text-sm font-medium text-fg">
            {showKind && <span className="text-muted">{PRACTICE_KINDS[session.kind].label} · </span>}
            {session.title}
          </span>
          <span className="block text-xs text-muted">{dateFormat.format(new Date(session.createdAt))}</span>
        </span>
        <Badge tone={session.score >= 80 ? 'success' : session.score >= 50 ? 'warning' : 'danger'}>
          {session.correct}/{session.total}
        </Badge>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 sm:px-5">
          {items === null || items === 'loading' ? (
            <p className="flex items-center gap-2 text-xs text-muted" role="status">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Memuat soal...
            </p>
          ) : items === 'error' ? (
            <Alert tone="error">Sesi tidak dapat dimuat. Coba buka lagi.</Alert>
          ) : (
            <PracticeReview items={items} />
          )}
        </div>
      )}
    </li>
  );
}

export function PracticeHistory({ kinds, version = 0, title = 'Riwayat' }: { kinds: PracticeKind[]; version?: number; title?: string }) {
  // Bergantung pada teks gabungan (bukan array) agar array baru tiap render tidak memicu muat ulang.
  const kindsKey = kinds.join(',');
  const key = `${kindsKey}|${version}`;
  const [state, setState] = useState<HistoryState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const k = `${kindsKey}|${version}`;
    fetch(`/api/practice/sessions?kinds=${encodeURIComponent(kindsKey)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body) => setState({ key: k, sessions: body.sessions ?? [], totals: body.totals, storage: body.storage, error: false }))
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key: k, sessions: [], totals: { sessions: 0, items: 0, correct: 0 }, storage: 'unavailable', error: true });
      });
    return () => controller.abort();
  }, [kindsKey, version]);

  const current = state?.key === key ? state : null;
  const t = current?.totals;

  return (
    <Card className="p-0">
      <CardHeader
        icon={<History className="h-4 w-4" />}
        title={title}
        description={
          t && t.sessions > 0
            ? `${t.items} soal dikerjakan dalam ${t.sessions} sesi · akurasi ${Math.round((t.correct / t.items) * 100)}%`
            : 'Buka sesi untuk melihat soal, jawabanmu, dan pembahasannya.'
        }
        className="mb-0 border-b border-line px-5 py-4"
      />
      {!current ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : current.storage === 'guest' ? (
        <div className="p-4">
          <Alert tone="info">Login untuk menyimpan dan melihat riwayat.</Alert>
        </div>
      ) : current.error || current.storage !== 'saved' ? (
        <div className="p-4">
          <Alert tone="info">Riwayat tidak dapat dimuat. Pastikan migrasi practice_sessions sudah dijalankan di Supabase.</Alert>
        </div>
      ) : current.sessions.length === 0 ? (
        <EmptyState className="m-4" title="Belum ada sesi" description="Selesaikan satu sesi dan hasilnya akan muncul di sini." />
      ) : (
        <ul className="divide-y divide-line">
          {current.sessions.map((s) => (
            <SessionRow key={s.id} session={s} showKind={kinds.length > 1} />
          ))}
        </ul>
      )}
    </Card>
  );
}
