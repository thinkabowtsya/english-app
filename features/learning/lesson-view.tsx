'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleCheck, Link2, Play, Repeat, Timer } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Skeleton } from '@/components/ui/feedback';
import { unlockAudio } from '@/lib/browser-alerts';
import { findLesson, flattenLessons, getLessonStatus, getNextLesson, getPrerequisiteIds } from '@/lib/curriculum';
import { formatClock } from '@/lib/date';
import {
  linkActiveTimerToLesson,
  markLessonOpened,
  setLessonStatus,
  startTimer,
} from '@/lib/storage/actions';
import { useActiveTimer, useAppData, useNow } from '@/lib/storage/hooks';
import { getRemainingMs } from '@/lib/timer';
import { LessonContent } from './components/lesson-content';
import { LessonHeader } from './components/lesson-header';
import { ReviewReminder } from './components/review-reminder';

export function LessonView({ lessonId }: { lessonId: string }) {
  const data = useAppData();
  const timer = useActiveTimer();
  const now = useNow();
  const refs = flattenLessons(CURRICULUM);
  const ref = findLesson(CURRICULUM, lessonId);
  const status = data && ref ? getLessonStatus(refs, ref, data.lessons) : null;

  // Catat "materi terakhir dibuka" (tidak memengaruhi streak atau waktu belajar).
  const moduleId = ref?.module.id;
  useEffect(() => {
    if (moduleId && status && status !== 'locked') markLessonOpened(lessonId, moduleId);
  }, [lessonId, moduleId, status]);

  if (!ref) return null;
  if (!data || !status) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const prereqRefs = getPrerequisiteIds(refs, ref)
    .map((id) => findLesson(CURRICULUM, id))
    .filter((r) => r !== null);

  if (status === 'locked') {
    return (
      <div>
        <LessonHeader lessonRef={ref} status={status} />
        <Alert tone="info" title="Materi ini masih terkunci">
          <p>Selesaikan materi prasyarat terlebih dahulu:</p>
          <ul className="mt-2 space-y-1">
            {prereqRefs.map((p) => (
              <li key={p.lesson.id}>
                <Link href={`/materi/${p.lesson.id}`} className="text-accent hover:underline">
                  {p.module.title} · {p.lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </Alert>
      </div>
    );
  }

  const progress = data.lessons[lessonId];
  const next = getNextLesson(refs, data.lessons, lessonId);
  const lessonReviews = data.reviews.filter((r) => r.lessonId === lessonId && r.resolvedAt === null);
  const linkedHere = timer?.lessonId === lessonId;

  return (
    <div>
      <LessonHeader lessonRef={ref} status={status} progress={progress} />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <LessonContent lesson={ref.lesson} prerequisiteTitles={prereqRefs.map((p) => p.lesson.title)} />

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader icon={<Timer className="h-4 w-4" />} title="Sesi belajar" />
            {!timer && (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    unlockAudio();
                    startTimer(data.settings.defaultSessionMinutes, lessonId);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Mulai sesi {data.settings.defaultSessionMinutes} mnt
                </Button>
                <Link href="/#timer" className="block text-center text-xs text-muted hover:text-fg">
                  Atur durasi lain di dashboard
                </Link>
              </div>
            )}
            {timer && now > 0 && (
              <div className="space-y-3 text-sm">
                <p className="text-muted">
                  Sesi {timer.status === 'running' ? 'berjalan' : 'dijeda'} · sisa{' '}
                  <span className="font-medium tabular-nums text-fg">{formatClock(getRemainingMs(timer, now))}</span>
                </p>
                {linkedHere ? (
                  <p className="text-xs text-success">Waktu sesi ini dicatat untuk materi ini.</p>
                ) : (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => linkActiveTimerToLesson(lessonId)}>
                    <Link2 className="h-3.5 w-3.5" />
                    Catat sesi berjalan untuk materi ini
                  </Button>
                )}
                <Link href="/#timer" className="block text-xs text-accent hover:underline">
                  Buka timer
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Status materi" description="Tandai secara manual sampai evaluasi tersedia." />
            <div className="flex flex-col gap-2">
              <Button
                variant={status === 'completed' ? 'secondary' : 'primary'}
                disabled={status === 'completed'}
                onClick={() => setLessonStatus(lessonId, ref.module.id, 'completed', ref.lesson.title)}
              >
                <CircleCheck className="h-4 w-4" />
                {status === 'completed' ? 'Sudah selesai' : 'Tandai selesai'}
              </Button>
              <Button
                variant="secondary"
                disabled={status === 'needs_review'}
                onClick={() => setLessonStatus(lessonId, ref.module.id, 'needs_review', ref.lesson.title)}
              >
                <Repeat className="h-4 w-4" />
                Perlu diulang
              </Button>
            </div>
            {next && (status === 'completed' || status === 'needs_review') && (
              <Link href={`/materi/${next.lesson.id}`} className={buttonClasses('ghost', 'sm', 'mt-3 w-full')}>
                Materi berikutnya: {next.lesson.title}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </Card>

          <Card>
            <CardHeader icon={<Repeat className="h-4 w-4" />} title="Review materi ini" />
            <ReviewReminder items={lessonReviews} now={now} emptyText="Belum ada item review untuk materi ini." />
          </Card>
        </aside>
      </div>
    </div>
  );
}
