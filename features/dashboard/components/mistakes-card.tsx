'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, NotebookPen } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, EmptyState, Skeleton } from '@/components/ui/feedback';
import { groupMistakes, type MistakeEntry, type MistakePatternSummary } from '@/lib/mistakes';

/** Pola kesalahan teratas di Dashboard (data dari /api/mistakes). */

const TOP = 3;

export function MistakesCard({ className }: { className?: string }) {
  const [state, setState] = useState<{ groups: MistakePatternSummary[]; storage: string } | 'loading' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/mistakes', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { entries: MistakeEntry[]; storage: string }) =>
        setState({ groups: groupMistakes(body.entries ?? []).filter((g) => g.open > 0), storage: body.storage }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, []);

  const open = typeof state === 'object' ? state.groups.reduce((n, g) => n + g.open, 0) : 0;

  return (
    <Card className={className}>
      <CardHeader
        icon={<NotebookPen className="h-4 w-4" />}
        title="Kesalahan yang sering muncul"
        description={
          typeof state === 'object' && open > 0
            ? `${open} kesalahan terbuka di ${state.groups.length} pola`
            : 'Dari Telepon AI dan latihan.'
        }
        action={
          <Link href="/kesalahan" className="text-xs font-medium whitespace-nowrap text-accent hover:underline">
            Semua
          </Link>
        }
      />
      {state === 'loading' ? (
        <Skeleton className="h-20" />
      ) : state === 'error' || state.storage !== 'saved' ? (
        <EmptyState
          title="Buku kesalahan belum tersedia"
          description={typeof state === 'object' && state.storage === 'guest' ? 'Login untuk memakai Buku kesalahan.' : 'Tidak dapat dimuat saat ini.'}
        />
      ) : state.groups.length === 0 ? (
        <EmptyState title="Tidak ada kesalahan terbuka" description="Kesalahan dari Telepon AI dan latihan akan muncul di sini." />
      ) : (
        <ul className="-mx-2 space-y-1">
          {state.groups.slice(0, TOP).map((g) => (
            <li key={g.id}>
              <Link href="/kesalahan" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{g.label}</span>
                  <span className="block truncate text-xs text-muted">
                    {g.entries[0] ? `${g.entries[0].wrong} → ${g.entries[0].correct}` : g.hint}
                  </span>
                </span>
                <Badge tone={g.open >= 3 ? 'danger' : 'warning'}>{g.open}</Badge>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
