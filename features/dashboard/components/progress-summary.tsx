'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, CircleCheck, Clock, Flame, ListChecks, Repeat } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { Card, CardHeader } from '@/components/ui/card';
import { flattenLessons } from '@/lib/curriculum';
import { formatDuration } from '@/lib/date';
import { getActiveDays, getOpenReviews, getSessionTotals, getStreak } from '@/lib/progress';
import type { AppData } from '@/types/learning';

export function ProgressSummary({ data, todayKey, className }: { data: AppData; todayKey: string; className?: string }) {
  const totals = getSessionTotals(data.sessions);
  const streak = getStreak(data.sessions, todayKey);
  const totalLessons = flattenLessons(CURRICULUM).length;
  const completedLessons = Object.values(data.lessons).filter((l) => l.status === 'completed').length;
  const needsReview =
    Object.values(data.lessons).filter((l) => l.status === 'needs_review').length +
    getOpenReviews(data.reviews).filter((r) => r.kind !== 'lesson').length;

  return (
    <Card className={className}>
      <CardHeader
        title="Ringkasan progres"
        action={
          <Link href="/progres" className="text-xs font-medium text-accent hover:underline">
            Detail
          </Link>
        }
      />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={<Clock className="h-4 w-4" />} label="Total waktu belajar" value={formatDuration(totals.totalMs)} />
        <Stat icon={<CircleCheck className="h-4 w-4" />} label="Sesi selesai" value={totals.completedCount} />
        <Stat icon={<CalendarDays className="h-4 w-4" />} label="Hari aktif" value={getActiveDays(data.sessions).length} />
        <Stat
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={`${streak.current} hari`}
          hint={streak.current > 0 && !streak.activeToday ? 'Belajar hari ini untuk melanjutkan' : undefined}
        />
        <Stat
          icon={<ListChecks className="h-4 w-4" />}
          label="Materi selesai"
          value={`${completedLessons}/${totalLessons}`}
        />
        <Stat icon={<Repeat className="h-4 w-4" />} label="Perlu diulang" value={needsReview} />
      </dl>
    </Card>
  );
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-muted p-3">
      <dt className="flex items-start gap-1.5 text-xs text-muted">
        <span aria-hidden className="shrink-0">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{value}</dd>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
