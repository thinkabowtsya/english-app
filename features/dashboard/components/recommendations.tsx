'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Repeat, Target, type LucideIcon } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import type { Recommendation } from '@/lib/recommendations';

const ICONS: Record<Recommendation['kind'], LucideIcon> = {
  review: Repeat,
  continue: BookOpen,
  next: BookOpen,
  goal: Target,
};

export function Recommendations({ items, className }: { items: Recommendation[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader
        title="Rekomendasi berikutnya"
        description="Berdasarkan urutan kurikulum dan progres lokal (aturan sederhana, bukan AI)."
      />
      {items.length === 0 ? (
        <EmptyState title="Tidak ada rekomendasi saat ini" description="Semua materi yang tersedia sudah selesai." />
      ) : (
        <ul className="-mx-2 space-y-1">
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{item.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
