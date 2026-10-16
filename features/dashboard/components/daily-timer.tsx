'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { BookOpen, Pause, Play, Square, Timer } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, ProgressBar } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/modal';
import { unlockAudio } from '@/lib/browser-alerts';
import { findLesson, flattenLessons, getLessonStatus } from '@/lib/curriculum';
import { MINUTE_MS, formatClock, formatDuration } from '@/lib/date';
import {
  markLessonOpened,
  pauseActiveTimer,
  resumeActiveTimer,
  startTimer,
  stopActiveTimer,
} from '@/lib/storage/actions';
import {
  MAX_SESSION_MINUTES,
  MIN_RECORDED_MS,
  MIN_SESSION_MINUTES,
  getElapsedMs,
  getRemainingMs,
} from '@/lib/timer';
import { cn } from '@/lib/utils';
import type { ActiveTimer, AppData } from '@/types/learning';

const QUICK_MINUTES = [5, 10, 15, 20, 25, 30];
const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

export function DailyTimer({
  data,
  timer,
  now,
  remainingGoalMs,
  className,
}: {
  data: AppData;
  timer: ActiveTimer | null;
  now: number;
  remainingGoalMs: number;
  className?: string;
}) {
  return (
    <Card id="timer" className={cn('scroll-mt-20', className)}>
      <CardHeader
        icon={<Timer className="h-4 w-4" />}
        title="Daily Learning Timer"
        description={
          timer ? 'Sesi sedang berlangsung' : 'Pilih durasi sesi, lalu mulai. Timer baru menghitung setelah kamu menekan mulai.'
        }
      />
      {timer ? (
        <RunningTimer timer={timer} now={now} />
      ) : (
        <TimerSetup
          key={data.settings.defaultSessionMinutes}
          data={data}
          remainingGoalMs={remainingGoalMs}
        />
      )}
    </Card>
  );
}

function TimerSetup({ data, remainingGoalMs }: { data: AppData; remainingGoalMs: number }) {
  const refs = flattenLessons(CURRICULUM);
  const selectable = refs.filter((ref) => getLessonStatus(refs, ref, data.lessons) !== 'locked');
  const defaultMinutes = data.settings.defaultSessionMinutes;
  const lastLessonSelectable = selectable.some((ref) => ref.lesson.id === data.lastLessonId);

  const [minutes, setMinutes] = useState(defaultMinutes);
  const [custom, setCustom] = useState(!QUICK_MINUTES.includes(defaultMinutes));
  const [customValue, setCustomValue] = useState(String(defaultMinutes));
  const [error, setError] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState(lastLessonSelectable ? (data.lastLessonId ?? '') : '');

  const remainingMinutes = Math.min(MAX_SESSION_MINUTES, Math.ceil(remainingGoalMs / MINUTE_MS));

  const chooseQuick = (value: number) => {
    setCustom(false);
    setMinutes(value);
    setError(null);
  };

  const chooseRemaining = () => {
    setCustom(true);
    setMinutes(remainingMinutes);
    setCustomValue(String(remainingMinutes));
    setError(null);
  };

  const onStart = (event: FormEvent) => {
    event.preventDefault();
    let value = minutes;
    if (custom) {
      value = Number(customValue);
      if (!Number.isInteger(value) || value < MIN_SESSION_MINUTES || value > MAX_SESSION_MINUTES) {
        setError(`Masukkan bilangan bulat ${MIN_SESSION_MINUTES}–${MAX_SESSION_MINUTES} menit.`);
        return;
      }
    }
    unlockAudio();
    const lesson = lessonId ? findLesson(CURRICULUM, lessonId) : null;
    if (lesson) markLessonOpened(lesson.lesson.id, lesson.module.id);
    startTimer(value, lesson?.lesson.id ?? null);
  };

  return (
    <form onSubmit={onStart} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted">Durasi sesi</legend>
        <div className="flex flex-wrap gap-2">
          {QUICK_MINUTES.map((value) => {
            const active = !custom && minutes === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => chooseQuick(value)}
                aria-pressed={active}
                className={cn(
                  'h-9 min-w-14 rounded-lg border px-3 text-sm tabular-nums transition-colors',
                  active
                    ? 'border-accent bg-accent-soft font-medium text-accent'
                    : 'border-line text-fg hover:bg-surface-muted',
                )}
              >
                {value} mnt
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setError(null);
            }}
            aria-pressed={custom}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm transition-colors',
              custom ? 'border-accent bg-accent-soft font-medium text-accent' : 'border-line text-fg hover:bg-surface-muted',
            )}
          >
            Khusus
          </button>
        </div>

        {custom && (
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="custom-minutes" className="text-sm text-muted">
              Menit
            </label>
            <input
              id="custom-minutes"
              type="number"
              inputMode="numeric"
              min={MIN_SESSION_MINUTES}
              max={MAX_SESSION_MINUTES}
              step={1}
              value={customValue}
              onChange={(e) => {
                setCustomValue(e.target.value);
                setError(null);
              }}
              aria-invalid={error !== null}
              aria-describedby={error ? 'custom-minutes-error' : undefined}
              className="h-9 w-24 rounded-lg border border-line bg-surface px-3 text-sm tabular-nums"
            />
            <span className="text-xs text-muted">
              {MIN_SESSION_MINUTES}–{MAX_SESSION_MINUTES} menit
            </span>
          </div>
        )}
        {error && (
          <p id="custom-minutes-error" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
        {remainingGoalMs > 0 && (
          <p className="mt-3 text-xs text-muted">
            Sisa target hari ini {formatDuration(remainingGoalMs)}.{' '}
            <button type="button" onClick={chooseRemaining} className="font-medium text-accent hover:underline">
              Pakai {remainingMinutes} menit
            </button>
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="timer-lesson" className="mb-2 block text-xs font-medium text-muted">
          Materi yang dipelajari (opsional)
        </label>
        <select
          id="timer-lesson"
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          className="h-10 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-sm"
        >
          <option value="">Tanpa materi tertentu</option>
          {selectable.map((ref) => (
            <option key={ref.lesson.id} value={ref.lesson.id}>
              {ref.module.title} · {ref.lesson.title}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        <Play className="h-4 w-4" />
        Mulai Belajar
      </Button>
    </form>
  );
}

function RunningTimer({ timer, now }: { timer: ActiveTimer; now: number }) {
  const [confirmStop, setConfirmStop] = useState(false);
  const elapsed = getElapsedMs(timer, now);
  const remaining = getRemainingMs(timer, now);
  const percent = (elapsed / timer.targetMs) * 100;
  const running = timer.status === 'running';
  const lesson = timer.lessonId ? findLesson(CURRICULUM, timer.lessonId) : null;

  return (
    <div className="space-y-5">
      {timer.pauseReason === 'inactive' && timer.pausedAt && (
        <Alert tone="warning" title="Timer dijeda otomatis">
          Browser atau perangkat tidak aktif sejak {timeFormat.format(timer.pausedAt)}. Waktu tidak aktif tidak
          dihitung sebagai waktu belajar. Lanjutkan jika kamu masih belajar.
        </Alert>
      )}

      <div className="text-center sm:text-left">
        <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
          <Badge tone={running ? 'accent' : 'warning'}>{running ? 'Berjalan' : 'Dijeda'}</Badge>
          <span className="text-xs text-muted">Target {formatDuration(timer.targetMs)}</span>
        </div>
        <p role="timer" aria-label="Sisa waktu" className="text-6xl font-semibold tracking-tight tabular-nums text-fg sm:text-7xl">
          {formatClock(remaining)}
        </p>
        <p className="mt-1 text-sm text-muted tabular-nums">Terpakai {formatClock(elapsed)}</p>
      </div>

      <ProgressBar value={percent} label="Progres sesi" />

      <div className="flex items-center gap-2 text-sm text-muted">
        <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
        {lesson ? (
          <Link href={`/materi/${lesson.lesson.id}`} className="truncate text-fg hover:text-accent">
            {lesson.module.title} · {lesson.lesson.title}
          </Link>
        ) : (
          <span>
            Tanpa materi tertaut.{' '}
            <Link href="/materi" className="text-accent hover:underline">
              Pilih materi
            </Link>
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button variant="secondary" onClick={() => pauseActiveTimer()}>
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        ) : (
          <Button
            onClick={() => {
              unlockAudio();
              resumeActiveTimer();
            }}
          >
            <Play className="h-4 w-4" />
            Lanjutkan
          </Button>
        )}
        <Button variant="ghost" onClick={() => setConfirmStop(true)}>
          <Square className="h-4 w-4" />
          Berhenti
        </Button>
      </div>

      <ConfirmDialog
        open={confirmStop}
        title="Hentikan sesi sekarang?"
        confirmLabel="Ya, hentikan"
        tone="danger"
        onCancel={() => setConfirmStop(false)}
        onConfirm={() => {
          setConfirmStop(false);
          stopActiveTimer();
        }}
        description={
          elapsed < MIN_RECORDED_MS
            ? 'Sesi belum berjalan dan tidak akan dicatat.'
            : `Waktu aktif ${formatDuration(elapsed)} akan dicatat sebagai sesi yang dihentikan. Sisa ${formatDuration(
                remaining,
              )} tidak dapat dilanjutkan.`
        }
      />
    </div>
  );
}
