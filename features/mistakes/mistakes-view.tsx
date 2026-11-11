'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, CircleCheck, NotebookPen, Sparkles, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui/feedback';
import { PracticeSession } from '@/features/practice/practice-session';
import { RESOLVE_SCORE, groupMistakes, type MistakeEntry, type MistakePatternSummary } from '@/lib/mistakes';
import { playPronunciation } from '@/lib/speech';
import { cn } from '@/lib/utils';

/**
 * Buku kesalahan pribadi: kesalahan dari Telepon AI dan latihan, dikelompokkan per pola.
 * Setiap pola bisa dilatih dengan soal AI yang dibuat dari kesalahanmu sendiri; skor ≥ 80%
 * menandai kesalahan lama pola itu teratasi.
 */

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const SOURCE_LABEL: Record<MistakeEntry['source'], string> = { call: 'Telepon AI', practice: 'Latihan' };
/** Contoh yang ditampilkan per pola sebelum "lihat semua". */
const PREVIEW = 4;

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; entries: MistakeEntry[]; storage: string };

function EntryRow({ entry, onDismiss }: { entry: MistakeEntry; onDismiss?: () => void }) {
  return (
    <li className="space-y-1 rounded-lg border border-line p-3 text-sm">
      <p className="text-danger line-through decoration-danger/60">{entry.wrong}</p>
      <p className="flex items-start gap-1.5 font-medium text-fg">
        <button
          type="button"
          onClick={() => playPronunciation(entry.correct)}
          aria-label="Dengarkan versi benar"
          className="mt-0.5 shrink-0 rounded p-0.5 text-accent hover:bg-accent-soft"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </button>
        <span className="text-success">{entry.correct}</span>
      </p>
      {entry.explanation && <p className="text-xs text-muted">{entry.explanation}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted">
        <span>
          {SOURCE_LABEL[entry.source]} · {dateFormat.format(new Date(entry.createdAt))}
          {entry.context && <span className="italic"> · “{entry.context}”</span>}
        </span>
        {onDismiss && entry.status === 'open' && (
          <button type="button" onClick={onDismiss} className="inline-flex items-center gap-0.5 hover:text-fg" title="Bukan kesalahan / abaikan">
            <X className="h-3 w-3" />
            Abaikan
          </button>
        )}
        {entry.status === 'resolved' && (
          <span className="inline-flex items-center gap-0.5 text-success">
            <CircleCheck className="h-3 w-3" />
            Teratasi
          </span>
        )}
      </div>
    </li>
  );
}

function PatternCard({
  group,
  onPractice,
  onDismiss,
}: {
  group: MistakePatternSummary;
  onPractice: () => void;
  onDismiss: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const entries = open ? group.entries.filter((e) => e.status === 'open' || all) : [];
  const shown = all ? entries : entries.slice(0, PREVIEW);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{group.label}</p>
          <p className="text-xs text-muted">{group.hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {group.open > 0 && <Badge tone={group.open >= 3 ? 'danger' : 'warning'}>{group.open} terbuka</Badge>}
          {group.resolved > 0 && <Badge tone="success">{group.resolved} teratasi</Badge>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {group.open > 0 && (
          <Button size="sm" onClick={onPractice}>
            <Sparkles className="h-3.5 w-3.5" />
            Latihan pola ini
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
          {open ? 'Tutup contoh' : 'Lihat contoh'}
        </Button>
      </div>
      {open && (
        <>
          {shown.length === 0 ? (
            <p className="text-xs text-muted">Tidak ada kesalahan terbuka di pola ini.</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((e) => (
                <EntryRow key={e.id} entry={e} onDismiss={() => onDismiss(e.id)} />
              ))}
            </ul>
          )}
          {(entries.length > PREVIEW || (!all && group.resolved > 0)) && (
            <button type="button" onClick={() => setAll(!all)} className="text-xs text-accent hover:underline">
              {all ? 'Tampilkan lebih sedikit' : `Lihat semua (${group.entries.length}, termasuk yang teratasi)`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

export function MistakesView() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [scanned, setScanned] = useState<number | null>(null);
  const [practice, setPractice] = useState<{ key: number; pattern: string; label: string } | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/mistakes');
      const body = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(body?.entries)) throw new Error('Buku kesalahan tidak dapat dimuat.');
      setState({ status: 'ready', entries: body.entries, storage: body.storage });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Buku kesalahan tidak dapat dimuat.' });
    }
  }, []);

  useEffect(() => {
    // Kumpulkan dulu kesalahan dari riwayat yang belum tercatat (aman diulang), lalu tampilkan.
    let cancelled = false;
    fetch('/api/mistakes', { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && typeof body?.added === 'number') setScanned(body.added);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) void load();
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const dismiss = async (id: string) => {
    if (state.status !== 'ready') return;
    const prev = state.entries;
    setState({ ...state, entries: prev.filter((e) => e.id !== id) });
    const res = await fetch(`/api/mistakes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    }).catch(() => null);
    if (!res?.ok) setState({ ...state, entries: prev });
  };

  const groups = useMemo(() => (state.status === 'ready' ? groupMistakes(state.entries) : []), [state]);
  const active = groups.filter((g) => g.open > 0);
  const resolvedOnly = groups.filter((g) => g.open === 0);
  const openTotal = active.reduce((n, g) => n + g.open, 0);
  const resolvedTotal = groups.reduce((n, g) => n + g.resolved, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buku kesalahan"
        description={`Kesalahan dari Telepon AI dan latihan, dikelompokkan per pola. Latih pola yang paling sering salah — skor ≥ ${RESOLVE_SCORE}% menandai kesalahan lama pola itu teratasi.`}
      />

      {practice && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">Latihan: {practice.label}</p>
          <PracticeSession
            key={practice.key}
            request={{ kind: 'mistakes', pattern: practice.pattern, count: 6 }}
            onSaved={() => void load()}
            onRestart={() => setPractice({ ...practice, key: Date.now() })}
            onExit={() => setPractice(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Kesalahan terbuka', value: openTotal },
          { label: 'Pola perlu dilatih', value: active.length },
          { label: 'Teratasi', value: resolvedTotal },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            {state.status === 'loading' ? (
              <Skeleton className="mt-1 h-7 w-10" />
            ) : (
              <p className="mt-1 text-xl font-semibold text-fg tabular-nums">{s.value}</p>
            )}
          </Card>
        ))}
      </div>

      {scanned !== null && scanned > 0 && (
        <Alert tone="info">{scanned} kesalahan baru dikumpulkan dari riwayat Telepon AI dan latihan.</Alert>
      )}

      {state.status === 'loading' ? (
        <div className="space-y-3" role="status" aria-label="Memuat Buku kesalahan">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : state.status === 'error' ? (
        <Alert tone="error">{state.message}</Alert>
      ) : state.storage === 'guest' ? (
        <Alert tone="info">Login untuk memakai Buku kesalahan.</Alert>
      ) : state.storage !== 'saved' ? (
        <Alert tone="info">Buku kesalahan tidak dapat dimuat. Pastikan migrasi mistakes sudah dijalankan di Supabase.</Alert>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="h-6 w-6" />}
          title="Belum ada kesalahan tercatat"
          description="Kesalahan akan muncul otomatis setelah kamu menelepon AI atau mengerjakan latihan grammar, susun kalimat, dan evaluasi."
        />
      ) : (
        <>
          {active.length === 0 ? (
            <Alert tone="success">Semua pola sudah teratasi. Kesalahan baru akan muncul di sini bila ada.</Alert>
          ) : (
            <div className="space-y-3">
              {active.map((g) => (
                <PatternCard
                  key={g.id}
                  group={g}
                  onDismiss={dismiss}
                  onPractice={() => {
                    setPractice({ key: Date.now(), pattern: g.id, label: g.label });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          )}
          {resolvedOnly.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowResolved(!showResolved)}
                aria-expanded={showResolved}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', showResolved && 'rotate-180')} />
                Pola yang sudah teratasi ({resolvedOnly.length})
              </button>
              {showResolved &&
                resolvedOnly.map((g) => <PatternCard key={g.id} group={g} onDismiss={dismiss} onPractice={() => {}} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
