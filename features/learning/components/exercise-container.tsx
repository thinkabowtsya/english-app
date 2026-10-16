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
      {activity?.items?.length ? (
        <ol className="space-y-3">
          {activity.items.map((item, i) => (
            <li key={i} className="text-sm">
              <p className="text-fg">
                <span className="mr-1.5 tabular-nums text-muted">{i + 1}.</span>
                {item.prompt}
              </p>
              <details className="mt-1 ml-5 text-xs text-muted">
                <summary className="cursor-pointer text-accent select-none">Lihat jawaban</summary>
                <p className="mt-1 font-medium text-fg">{item.answer}</p>
                {item.alternatives?.length ? <p className="mt-0.5">Juga benar: {item.alternatives.join(' / ')}</p> : null}
                {item.explanation && <p className="mt-0.5">{item.explanation}</p>}
              </details>
            </li>
          ))}
        </ol>
      ) : hasItems ? (
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
