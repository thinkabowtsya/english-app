'use client';

import Link from 'next/link';
import { Brain, ChevronRight } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { SOURCE_LABEL, ScoreBadge, percent, useRecallHistory } from '@/features/recall/recall-history';

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Jumlah sesi terbaru yang ditampilkan di Dashboard. */
const RECENT = 5;

/** Riwayat Vocabulary Recall di Dashboard: total soal yang dikerjakan + sesi terbaru. */
export function RecallHistoryCard({ className }: { className?: string }) {
  const { history, loading, error } = useRecallHistory();
  const totals = history?.totals;

  return (
    <Card className={className}>
      <CardHeader
        icon={<Brain className="h-4 w-4" />}
        title="Riwayat Vocabulary Recall"
        description={
          totals && totals.sessions > 0
            ? `${totals.questions} soal dikerjakan dalam ${totals.sessions} sesi · akurasi ${percent(totals.correct, totals.questions)}%`
            : 'Soal AI dari kata Oxford 3000 dan collocation yang sudah dipelajari.'
        }
        action={
          <Link href="/latihan/recall#riwayat" className="text-xs font-medium whitespace-nowrap text-accent hover:underline">
            Semua
          </Link>
        }
      />
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : error || !history || history.storage !== 'saved' ? (
        <EmptyState
          title="Riwayat belum tersedia"
          description={history?.storage === 'guest' ? 'Login untuk menyimpan riwayat.' : 'Riwayat tidak dapat dimuat saat ini.'}
        />
      ) : history.sessions.length === 0 ? (
        <EmptyState
          title="Belum ada sesi"
          description="Kerjakan Vocabulary Recall pertamamu."
          action={
            <Link href="/latihan/recall" className={buttonClasses('primary', 'sm')}>
              Mulai
            </Link>
          }
        />
      ) : (
        <ul className="-mx-2 space-y-1">
          {history.sessions.slice(0, RECENT).map((s) => (
            <li key={s.id}>
              <Link
                href={`/latihan/recall#sesi-${s.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium text-fg">{SOURCE_LABEL[s.source]}</span>
                    <span className="text-xs text-muted">{dateFormat.format(new Date(s.createdAt))}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">{s.items.join(', ')}</span>
                </span>
                <ScoreBadge correct={s.correct} total={s.total} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
