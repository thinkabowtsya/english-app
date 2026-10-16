import { CircleCheck, CircleDot, Lock, Repeat, Circle } from 'lucide-react';
import { Badge, ProgressBar } from '@/components/ui/feedback';
import type { LessonStatus } from '@/types/learning';

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  locked: 'Terkunci',
  available: 'Tersedia',
  in_progress: 'Sedang dipelajari',
  completed: 'Selesai',
  needs_review: 'Perlu diulang',
};

const STATUS_TONE = {
  locked: 'neutral',
  available: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  needs_review: 'warning',
} as const;

const STATUS_ICON = {
  locked: Lock,
  available: Circle,
  in_progress: CircleDot,
  completed: CircleCheck,
  needs_review: Repeat,
};

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]}>
      <Icon className="h-3 w-3" aria-hidden />
      {LESSON_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Indikator progres generik: "x dari y" + bar. */
export function ProgressIndicator({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {completed}/{total} · {percent}%
        </span>
      </div>
      <ProgressBar value={percent} label={label} tone={percent === 100 ? 'success' : 'accent'} />
    </div>
  );
}
