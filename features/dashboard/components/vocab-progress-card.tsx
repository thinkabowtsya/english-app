'use client';

import Link from 'next/link';
import { BookMarked, Sparkles } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, ProgressBar, Skeleton } from '@/components/ui/feedback';
import { OXFORD_LEVELS } from '@/data/oxford/words';
import { useVocabProgress } from '@/features/kosakata/use-vocab-progress';
import { useNow } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';
import { summarizeVocab } from '@/lib/vocab-progress';

/** Progres kosakata di Dashboard: Oxford per level, collocation, dikuasai, dan yang jatuh tempo. */
export function VocabProgressCard({ className }: { className?: string }) {
  const { progress, loading, error } = useVocabProgress();
  const now = useNow();
  const summary = progress && now > 0 ? summarizeVocab(progress, now) : null;

  return (
    <Card className={className}>
      <CardHeader
        icon={<BookMarked className="h-4 w-4" />}
        title="Progres kosakata"
        description={
          summary
            ? `${summary.learned} dipelajari · ${summary.mastered} dikuasai · ${summary.due} jatuh tempo`
            : 'Kata Oxford 3000 dan collocation yang sudah kamu pelajari.'
        }
        action={
          <Link href="/kosakata" className="text-xs font-medium whitespace-nowrap text-accent hover:underline">
            Detail
          </Link>
        }
      />
      {loading || (!summary && !error && progress) ? (
        <Skeleton className="h-28" />
      ) : error || !progress || progress.storage !== 'saved' || !summary ? (
        <EmptyState
          title="Progres belum tersedia"
          description={progress?.storage === 'guest' ? 'Login untuk menyimpan progres kosakata.' : 'Progres tidak dapat dimuat saat ini.'}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
            {OXFORD_LEVELS.map((l) => {
              const c = summary.oxfordByLevel[l];
              return (
                <div key={l}>
                  <p className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-fg">Oxford {l}</span>
                    <span className="text-muted tabular-nums">
                      {c.learned}/{c.total}
                    </span>
                  </p>
                  <ProgressBar value={(c.learned / c.total) * 100} label={`Oxford ${l}`} tone="success" className="mt-1.5 h-1.5" />
                </div>
              );
            })}
            <div>
              <p className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-fg">Collocation</span>
                <span className="text-muted tabular-nums">
                  {summary.collocation.learned}/{summary.collocation.total}
                </span>
              </p>
              <ProgressBar
                value={(summary.collocation.learned / summary.collocation.total) * 100}
                label="Collocation"
                tone="success"
                className="mt-1.5 h-1.5"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-xs text-muted">
              {summary.due > 0
                ? `${summary.due} kata & collocation perlu diulang hari ini.`
                : summary.learned > 0
                  ? 'Tidak ada yang jatuh tempo hari ini.'
                  : 'Tandai kata di Oxford 3000 atau Collocation setelah dipelajari.'}
            </p>
            <Link
              href={summary.due > 0 ? '/latihan/recall' : summary.learned > 0 ? '/kosakata' : '/oxford'}
              className={cn(buttonClasses(summary.due > 0 ? 'primary' : 'secondary', 'sm'))}
            >
              {summary.due > 0 && <Sparkles className="h-3.5 w-3.5" />}
              {summary.due > 0 ? 'Ulangi sekarang' : summary.learned > 0 ? 'Lihat kosakata' : 'Mulai Oxford 3000'}
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
