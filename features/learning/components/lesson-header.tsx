import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/feedback';
import { formatDuration } from '@/lib/date';
import type { LessonRef } from '@/lib/curriculum';
import type { LessonProgress, LessonStatus } from '@/types/learning';
import { LessonStatusBadge } from './progress-indicator';

export function LessonHeader({
  lessonRef,
  status,
  progress,
}: {
  lessonRef: LessonRef;
  status: LessonStatus;
  progress?: LessonProgress;
}) {
  const { lesson, module, level } = lessonRef;
  return (
    <header className="mb-6">
      <Link href="/materi" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" />
        Semua materi
      </Link>
      <p className="text-xs text-muted">
        {level.title} · {module.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{lesson.title}</h1>
      <p className="mt-1 text-sm text-muted">{lesson.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <LessonStatusBadge status={status} />
        {lesson.contentStatus === 'placeholder' && <Badge>Konten placeholder</Badge>}
        <span>Estimasi {lesson.estimatedMinutes} mnt</span>
        {progress && progress.timeSpentMs > 0 && <span>· Waktu belajar {formatDuration(progress.timeSpentMs)}</span>}
        {progress?.lastScore != null && <span>· Skor terakhir {progress.lastScore}</span>}
      </div>
    </header>
  );
}
