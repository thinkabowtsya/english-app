'use client';

import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { formatClock } from '@/lib/date';
import { useActiveTimer, useNow } from '@/lib/storage/hooks';
import { getRemainingMs } from '@/lib/timer';
import { cn } from '@/lib/utils';

/** Indikator kecil sesi aktif yang terlihat dari semua halaman. */
export function ActiveTimerPill({ className }: { className?: string }) {
  const timer = useActiveTimer();
  const now = useNow();
  if (!timer || now === 0) return null;

  const running = timer.status === 'running';
  const Icon = running ? Play : Pause;
  return (
    <Link
      href="/#timer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium tabular-nums text-fg hover:bg-surface-muted',
        className,
      )}
      aria-label={`Sesi belajar ${running ? 'berjalan' : 'dijeda'}, sisa ${formatClock(getRemainingMs(timer, now))}`}
    >
      <Icon className={cn('h-3 w-3', running ? 'text-accent' : 'text-muted')} aria-hidden />
      {formatClock(getRemainingMs(timer, now))}
      {!running && <span className="text-muted">dijeda</span>}
    </Link>
  );
}
