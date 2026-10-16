'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, ProgressBar } from '@/components/ui/feedback';
import { LessonStatusBadge } from '@/features/learning/components/progress-indicator';
import { findLesson, flattenLessons, getLessonStatus, getModuleProgress } from '@/lib/curriculum';
import { formatDuration } from '@/lib/date';
import type { AppData } from '@/types/learning';

export function ContinueLearning({ data, className }: { data: AppData; className?: string }) {
  const refs = flattenLessons(CURRICULUM);
  const last = data.lastLessonId ? findLesson(CURRICULUM, data.lastLessonId) : null;
  const first = refs[0];

  return (
    <Card className={className}>
      <CardHeader icon={<BookOpen className="h-4 w-4" />} title="Lanjutkan belajar" />
      {last ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted">{last.module.title}</p>
            <p className="font-medium text-fg">{last.lesson.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <LessonStatusBadge status={getLessonStatus(refs, last, data.lessons)} />
            <span>Waktu belajar {formatDuration(data.lessons[last.lesson.id]?.timeSpentMs ?? 0)}</span>
          </div>
          <ModuleBar data={data} moduleId={last.module.id} />
          <Link href={`/materi/${last.lesson.id}`} className={buttonClasses('primary', 'md', 'w-full')}>
            Lanjutkan Belajar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <EmptyState
          title="Belum ada materi yang dibuka"
          description="Mulai dari modul pertama. Progres akan muncul di sini."
          action={
            first && (
              <Link href={`/materi/${first.lesson.id}`} className={buttonClasses('primary', 'sm')}>
                Mulai {first.module.title}
              </Link>
            )
          }
        />
      )}
    </Card>
  );
}

function ModuleBar({ data, moduleId }: { data: AppData; moduleId: string }) {
  const mod = CURRICULUM.flatMap((l) => l.modules).find((m) => m.id === moduleId);
  if (!mod) return null;
  const progress = getModuleProgress(mod, data.lessons);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-muted">
        <span>Progres {mod.title}</span>
        <span className="tabular-nums">
          {progress.completed}/{progress.total} materi
        </span>
      </div>
      <ProgressBar value={progress.percent} label={`Progres ${mod.title}`} />
    </div>
  );
}
