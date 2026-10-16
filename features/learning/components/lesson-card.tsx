import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/feedback';
import { formatDuration } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/types/curriculum';
import type { LessonProgress, LessonStatus } from '@/types/learning';
import { LessonStatusBadge } from './progress-indicator';

export function LessonCard({
  lesson,
  status,
  progress,
}: {
  lesson: Lesson;
  status: LessonStatus;
  progress?: LessonProgress;
}) {
  const locked = status === 'locked';
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('font-medium', locked ? 'text-muted' : 'text-fg')}>{lesson.title}</span>
          {lesson.contentStatus === 'placeholder' && <Badge>Placeholder</Badge>}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">{lesson.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <LessonStatusBadge status={status} />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {progress && progress.timeSpentMs > 0
              ? `${formatDuration(progress.timeSpentMs)} dipelajari`
              : `± ${lesson.estimatedMinutes} mnt`}
          </span>
          {progress?.lastScore != null && <span>Skor terakhir {progress.lastScore}</span>}
        </div>
      </div>
      {!locked && <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />}
    </>
  );

  return (
    <li>
      {locked ? (
        <div className="flex items-center gap-3 px-5 py-3.5 opacity-70" aria-disabled>
          {body}
        </div>
      ) : (
        <Link href={`/materi/${lesson.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted">
          {body}
        </Link>
      )}
    </li>
  );
}
