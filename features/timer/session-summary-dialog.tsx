'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { buttonClasses, Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/feedback';
import { findLesson, flattenLessons, getNextLesson } from '@/lib/curriculum';
import { formatDuration, toLocalDateKey } from '@/lib/date';
import { getDailyTotalMs, getGoalProgress } from '@/lib/progress';
import { useAppData, useLastFinished } from '@/lib/storage/hooks';
import { setLastFinished } from '@/lib/storage/store';

const TITLES = {
  completed: 'Sesi selesai',
  stopped: 'Sesi dihentikan',
  interrupted: 'Sesi sebelumnya terputus',
} as const;

const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

export function SessionSummaryDialog() {
  const session = useLastFinished();
  const data = useAppData();
  if (!session || !data) return null;

  const close = () => setLastFinished(null);
  const refs = flattenLessons(CURRICULUM);
  const lesson = session.lessonId ? findLesson(CURRICULUM, session.lessonId) : null;
  const next = getNextLesson(refs, data.lessons, session.lessonId) ?? getNextLesson(refs, data.lessons);
  const goal = getGoalProgress(
    getDailyTotalMs(data.sessions, toLocalDateKey(session.startedAt)),
    data.settings.dailyGoalMinutes,
  );

  return (
    <Modal
      open
      onClose={close}
      title={TITLES[session.status]}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Tutup
          </Button>
          {next && (
            <Link href={`/materi/${next.lesson.id}`} onClick={close} className={buttonClasses('primary')}>
              Lanjut ke {next.lesson.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </>
      }
    >
      {session.status === 'interrupted' && (
        <p className="mb-3">
          Browser atau perangkat tidak aktif cukup lama, atau hari sudah berganti. Hanya waktu aktif sampai
          aktivitas terakhir yang dicatat.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-muted p-3 text-fg">
        <div>
          <dt className="text-xs text-muted">Durasi aktual</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatDuration(session.actualMs)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Target sesi</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatDuration(session.targetMs)}</dd>
        </div>
        <div className="col-span-2 text-xs text-muted">
          {timeFormat.format(session.startedAt)} – {timeFormat.format(session.endedAt)}
          {lesson && <> · {lesson.lesson.title}</>}
        </div>
      </dl>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs">
          <span>Target harian</span>
          <span className="tabular-nums">
            {formatDuration(goal.doneMs)} / {formatDuration(goal.goalMs)}
          </span>
        </div>
        <ProgressBar value={goal.percent} label="Progres target harian" tone={goal.reached ? 'success' : 'accent'} />
        {goal.reached && <p className="mt-2 text-xs text-success">Target harian tercapai. Kerja bagus!</p>}
      </div>
    </Modal>
  );
}
