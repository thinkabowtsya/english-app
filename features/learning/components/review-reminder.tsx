'use client';

import { Check, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { resolveReview, reviewAgain } from '@/lib/storage/actions';
import type { ReviewItem } from '@/types/learning';

const KIND_LABEL: Record<ReviewItem['kind'], string> = {
  lesson: 'Materi',
  pattern: 'Pola',
  phrase: 'Frasa',
};

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

/** Daftar item yang perlu diulang beserta aksi recall sederhana. */
export function ReviewReminder({
  items,
  now,
  emptyText = 'Tidak ada item yang perlu diulang.',
}: {
  items: ReviewItem[];
  now: number;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon={<Repeat className="h-5 w-5" />} title={emptyText} className="py-6" />;
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const due = item.nextReviewAt === null || item.nextReviewAt <= now;
        return (
          <li key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{KIND_LABEL[item.kind]}</Badge>
                <span className="font-medium break-words text-fg">{item.label}</span>
              </div>
              {item.note && <p className="mt-1 text-xs break-words text-muted">{item.note}</p>}
              <p className="mt-1 text-[11px] text-muted">
                {item.reason}
                {item.failCount > 0 && ` · gagal recall ${item.failCount}×`}
                {' · '}
                {due ? 'Jadwal: sekarang' : `Jadwal: ${dateFormat.format(item.nextReviewAt ?? now)}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => resolveReview(item.id)}>
                <Check className="h-3.5 w-3.5" />
                Sudah ingat
              </Button>
              <Button size="sm" variant="ghost" onClick={() => reviewAgain(item.id)}>
                <Repeat className="h-3.5 w-3.5" />
                Ulangi besok
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
