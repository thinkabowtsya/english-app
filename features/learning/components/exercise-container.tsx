import type { ReactNode } from 'react';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import type { ActivityType, LessonActivity } from '@/types/curriculum';

const TYPE_LABEL: Record<ActivityType, string> = {
  exercise: 'Latihan',
  recall: 'Recall',
  evaluation: 'Evaluasi',
};

/**
 * Wadah untuk satu aktivitas latihan. Komponen soal spesifik (pilihan ganda, menyusun
 * kalimat, dsb.) dipasang sebagai `children` setelah format soal ditentukan kurikulum.
 */
export function ExerciseContainer({
  activity,
  title,
  type,
  description,
  children,
  className,
}: {
  activity?: LessonActivity;
  title?: string;
  type?: ActivityType;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const resolvedType = activity?.type ?? type ?? 'exercise';
  const resolvedTitle = activity?.title ?? title ?? TYPE_LABEL[resolvedType];
  const hasItems = Boolean(children) || (activity?.items?.length ?? 0) > 0;

  return (
    <section className={cn('rounded-xl border border-line bg-surface p-4', className)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-fg">{resolvedTitle}</h3>
        <Badge tone="accent">{TYPE_LABEL[resolvedType]}</Badge>
      </div>
      {(activity?.instructions ?? description) && (
        <p className="mb-3 text-sm text-muted">{activity?.instructions ?? description}</p>
      )}
      {hasItems ? (
        children
      ) : (
        <EmptyState
          title="Soal belum tersedia"
          description="Bank soal akan ditambahkan bersama konten kurikulum."
          className="py-6"
        />
      )}
    </section>
  );
}
