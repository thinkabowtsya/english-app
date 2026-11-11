'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookMarked, CalendarClock, Link2, ListChecks, Search, Sparkles, Volume2 } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui/feedback';
import { getOpenReviews } from '@/lib/progress';
import { playPronunciation } from '@/lib/speech';
import { INTERVAL_DAYS, MASTERED_STEP, formatDue, type SrsStatus } from '@/lib/srs';
import { useAppData, useNow } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';
import { summarizeVocab } from '@/lib/vocab-progress';
import { useVocabProgress } from './use-vocab-progress';

/**
 * Kosakata saya: satu daftar untuk semua kosakata yang sedang dipelajari — kata Oxford 3000 &
 * collocation (dengan jadwal pengulangan dari Recall) dan frasa tersimpan di daftar review
 * (Vocab Builder, AI Coach, role-play).
 */

type Source = 'oxford' | 'collocation' | 'phrase';
type StatusFilter = 'all' | SrsStatus;
type SourceFilter = 'all' | Source;

interface Row {
  key: string;
  item: string;
  source: Source;
  status: SrsStatus;
  info: string;
  dueAt: string | null;
  correct?: number;
  wrong?: number;
}

const SOURCE_LABEL: Record<Source, string> = { oxford: 'Oxford', collocation: 'Collocation', phrase: 'Frasa' };
const STATUS_LABEL: Record<SrsStatus, string> = { due: 'Jatuh tempo', learning: 'Sedang dipelajari', mastered: 'Dikuasai' };
const STATUS_TONE: Record<SrsStatus, 'warning' | 'accent' | 'success'> = { due: 'warning', learning: 'accent', mastered: 'success' };

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'due', label: 'Jatuh tempo' },
  { id: 'learning', label: 'Sedang dipelajari' },
  { id: 'mastered', label: 'Dikuasai' },
];
const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'Semua sumber' },
  { id: 'oxford', label: 'Oxford' },
  { id: 'collocation', label: 'Collocation' },
  { id: 'phrase', label: 'Frasa' },
];

const PAGE_SIZE = 100;

function pill(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    active ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:bg-surface-muted hover:text-fg',
  );
}

export function KosakataView() {
  const { progress, loading, error } = useVocabProgress();
  const data = useAppData();
  const now = useNow();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const summary = useMemo(
    () => (progress && now > 0 ? summarizeVocab(progress, now) : null),
    [progress, now],
  );

  const phrases: Row[] = useMemo(() => {
    if (!data || now === 0) return [];
    return getOpenReviews(data.reviews)
      .filter((r) => r.kind === 'phrase')
      .map((r) => ({
        key: `phrase:${r.id}`,
        item: r.label,
        source: 'phrase' as const,
        status: r.nextReviewAt === null || r.nextReviewAt <= now ? ('due' as const) : ('learning' as const),
        info: r.note ?? r.reason,
        dueAt: r.nextReviewAt === null ? null : new Date(r.nextReviewAt).toISOString(),
      }));
  }, [data, now]);

  const rows: Row[] = useMemo(
    () => [
      ...(summary?.rows ?? []).map((r) => ({ ...r, key: `${r.source}:${r.item}` })),
      ...phrases,
    ],
    [summary, phrases],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (source === 'all' || r.source === source) &&
        (!q || r.item.toLowerCase().includes(q) || r.info.toLowerCase().includes(q)),
    );
  }, [rows, status, source, query]);

  const vocabDue = summary?.due ?? 0;
  const phraseDue = phrases.filter((p) => p.status === 'due').length;
  const nextDue = summary?.rows.find((r) => r.status !== 'due' && r.dueAt)?.dueAt ?? null;

  const stats = [
    { label: 'Dipelajari', value: (summary?.learned ?? 0) + phrases.length },
    { label: 'Jatuh tempo', value: vocabDue + phraseDue },
    { label: 'Sedang dipelajari', value: (summary?.learning ?? 0) + phrases.filter((p) => p.status === 'learning').length },
    { label: 'Dikuasai', value: summary?.mastered ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kosakata saya"
        description="Semua kata, collocation, dan frasa yang sedang kamu pelajari, beserta jadwal pengulangannya."
      />

      {progress && progress.storage !== 'saved' && (
        <Alert tone="info">
          {progress.storage === 'guest'
            ? 'Login untuk menyimpan progres kata Oxford & collocation. Frasa tersimpan tetap tampil di bawah.'
            : 'Progres kosakata tidak dapat dimuat. Pastikan migrasi oxford_words, collocation_progress, dan vocab_spaced_repetition sudah dijalankan.'}
        </Alert>
      )}
      {error && <Alert tone="error">Progres kosakata tidak dapat dimuat. Coba muat ulang halaman.</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="mt-1 text-xl font-semibold text-fg tabular-nums">{s.value}</p>
            )}
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div className="text-sm">
            {loading ? (
              <Skeleton className="h-5 w-48" />
            ) : vocabDue > 0 ? (
              <p className="font-medium text-fg">{vocabDue} kata & collocation perlu diulang hari ini</p>
            ) : (
              <p className="font-medium text-fg">
                Tidak ada yang jatuh tempo{nextDue ? ` · ulang berikutnya ${formatDue(nextDue, now)}` : ''}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted">
              Jadwal ulang {INTERVAL_DAYS.join(' → ')} hari. Jawaban Recall benar memperpanjang jadwal, salah membuat kata
              diulang besok. Dikuasai = jarak ulang ≥ {INTERVAL_DAYS[MASTERED_STEP]} hari.
            </p>
          </div>
        </div>
        <Link href="/latihan/recall" className={cn(buttonClasses(vocabDue > 0 ? 'primary' : 'secondary', 'sm'), 'shrink-0')}>
          <Sparkles className="h-3.5 w-3.5" />
          {vocabDue > 0 ? 'Ulangi sekarang' : 'Latihan Recall'}
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            href: '/oxford',
            icon: ListChecks,
            title: 'Oxford 3000',
            value: summary
              ? `${Object.values(summary.oxfordByLevel).reduce((n, l) => n + l.learned, 0)} / ${Object.values(summary.oxfordByLevel).reduce((n, l) => n + l.total, 0)} kata`
              : '…',
          },
          {
            href: '/collocations',
            icon: Link2,
            title: 'Collocation',
            value: summary ? `${summary.collocation.learned} / ${summary.collocation.total}` : '…',
          },
          { href: '/latihan#review', icon: BookMarked, title: 'Frasa tersimpan', value: `${phrases.length} frasa` },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{s.title}</span>
                <span className="block text-xs text-muted tabular-nums">{s.value}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>

      <Card className="p-0">
        <CardHeader
          title="Daftar kosakata"
          description="Tandai kata di Oxford 3000 atau Collocation untuk menambahkannya ke sini."
          className="mb-0 px-5 pt-5"
        />
        <div className="space-y-3 border-b border-line px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Cari kosakata..."
              aria-label="Cari kosakata"
              className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={status === f.id} onClick={() => setStatus(f.id)} className={pill(status === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={source === f.id} onClick={() => setSource(f.id)} className={pill(source === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="m-4"
            title={rows.length === 0 ? 'Belum ada kosakata' : 'Tidak ada yang cocok'}
            description={
              rows.length === 0
                ? 'Buka Oxford 3000 atau Collocation, lalu tekan "Simpan: sudah dipelajari" pada kata yang sudah kamu pelajari.'
                : 'Ubah filter atau kata kunci.'
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {filtered.slice(0, limit).map((r) => (
                <li key={r.key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    onClick={() => playPronunciation(r.item)}
                    aria-label={`Ucapkan ${r.item}`}
                    title={`Ucapkan ${r.item}`}
                    className="shrink-0 rounded-lg p-1.5 text-accent hover:bg-accent-soft"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium break-words text-fg">{r.item}</span>
                      <Badge>{SOURCE_LABEL[r.source]}</Badge>
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </p>
                    {r.info && <p className="truncate text-xs text-muted">{r.info}</p>}
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-muted tabular-nums">
                    <p>ulang {formatDue(r.dueAt, now)}</p>
                    {r.correct !== undefined && (r.correct > 0 || (r.wrong ?? 0) > 0) && (
                      <p>
                        <span className="text-success">✓{r.correct}</span> <span className="text-danger">✗{r.wrong}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {filtered.length > limit && (
              <div className="border-t border-line p-3 text-center">
                <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Tampilkan lebih banyak ({filtered.length - limit} lagi)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
