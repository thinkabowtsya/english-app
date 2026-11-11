'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, PageHeader, ProgressBar, Skeleton } from '@/components/ui/feedback';
import { flattenLessons } from '@/lib/curriculum';
import {
  checksFor,
  getChecksSyncError,
  getDailyChecks,
  getServerDailyChecks,
  subscribeDailyChecks,
} from '@/lib/daily-checks';
import { activityLevel, buildDayPlan, dayCompletion, isTaskDone, scheduleLessons, type DayPlan } from '@/lib/daily-plan';
import { addDaysToKey, formatDuration, fromLocalDateKey, toLocalDateKey } from '@/lib/date';
import { getTotalsByDate } from '@/lib/progress';
import { useAppData, useNow } from '@/lib/storage/hooks';
import type { LocalDateKey } from '@/types/learning';
import { cn } from '@/lib/utils';
import { DayTaskList } from './day-task-list';
import { heatColor } from './heat';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const monthFormat = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const refs = flattenLessons(CURRICULUM);

/** Label singkat tugas untuk chip di sel kalender. */
const SHORT: Record<string, string> = { review: 'Review', vocab: 'Kosakata', speaking: 'Bicara', timer: 'Timer' };

/** 42 tanggal (6 minggu, Senin–Minggu) yang menampilkan satu bulan penuh. */
function monthGrid(year: number, month: number): LocalDateKey[] {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = addDaysToKey(toLocalDateKey(first), -mondayOffset);
  return Array.from({ length: 42 }, (_, i) => addDaysToKey(start, i));
}

export function CalendarView() {
  const data = useAppData();
  const now = useNow();
  const checks = useSyncExternalStore(subscribeDailyChecks, getDailyChecks, getServerDailyChecks);
  const syncError = useSyncExternalStore(subscribeDailyChecks, getChecksSyncError, () => null);
  const [view, setView] = useState<{ year: number; month: number } | null>(null);
  const [selected, setSelected] = useState<LocalDateKey | null>(null);

  const todayKey = now === 0 ? null : toLocalDateKey(now);
  const current = view ?? (todayKey ? { year: fromLocalDateKey(todayKey).getFullYear(), month: fromLocalDateKey(todayKey).getMonth() } : null);

  const year = current?.year ?? 0;
  const month = current?.month ?? 0;
  const plans = useMemo(() => {
    if (!data || !todayKey || year === 0) return null;
    const schedule = scheduleLessons(refs, data, todayKey);
    const totals = getTotalsByDate(data.sessions);
    const map = new Map<LocalDateKey, DayPlan>();
    for (const date of monthGrid(year, month)) {
      map.set(date, buildDayPlan({ date, todayKey, refs, data, schedule, totals }));
    }
    return map;
  }, [data, todayKey, year, month]);

  if (!data || !todayKey || !current || !plans) {
    return (
      <div>
        <PageHeader title="Kalender Belajar" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  }

  const days = monthGrid(current.year, current.month);
  const activeDate = selected ?? todayKey;
  const activePlan =
    plans.get(activeDate) ?? buildDayPlan({ date: activeDate, todayKey, refs, data });
  const activeManual = checksFor(checks, activeDate);
  const activeDone = dayCompletion(activePlan, activeManual);

  const shiftMonth = (delta: number) => {
    const d = new Date(current.year, current.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goToday = () => {
    setView(null);
    setSelected(todayKey);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kalender Belajar"
        description="Setiap hari ada rencana belajar ±30 menit. Materi, review, dan target waktu tercentang otomatis dari aktivitasmu."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-3 sm:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-fg capitalize sm:text-lg">
              {monthFormat.format(new Date(current.year, current.month, 1))}
            </h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="secondary" onClick={goToday}>
                Hari ini
              </Button>
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Bulan sebelumnya"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-fg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Bulan berikutnya"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-fg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-line pb-1 text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((date) => {
              const plan = plans.get(date)!;
              const manual = checksFor(checks, date);
              const completion = dayCompletion(plan, manual);
              const inMonth = fromLocalDateKey(date).getMonth() === current.month;
              const isToday = date === todayKey;
              const isSelected = date === activeDate;
              const level = plan.when === 'future' ? 0 : activityLevel(plan.studiedMs, plan.goalMs, completion.ratio);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-label={`${dayFormat.format(fromLocalDateKey(date))}: ${completion.done} dari ${completion.total} tugas`}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative flex min-h-16 flex-col items-stretch gap-1 border-b border-line p-1 text-left transition-colors sm:min-h-24 sm:p-1.5',
                    !inMonth && 'opacity-45',
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-muted',
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        isToday ? 'bg-accent font-semibold text-accent-fg' : 'text-fg',
                      )}
                    >
                      {fromLocalDateKey(date).getDate()}
                    </span>
                    {level > 0 && (
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: heatColor(level) }}
                        aria-hidden
                      />
                    )}
                  </span>

                  {/* Layar lebar: chip tugas seperti Google Calendar */}
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {plan.tasks.slice(0, 3).map((t) => {
                      const done = isTaskDone(t, manual);
                      return (
                        <span
                          key={t.id}
                          className={cn(
                            'truncate rounded px-1 py-px text-[10px] leading-tight',
                            done
                              ? 'bg-success-soft text-success line-through'
                              : plan.when === 'past'
                              ? 'bg-surface-muted text-muted'
                              : 'bg-accent-soft text-accent',
                          )}
                        >
                          {t.id === 'lesson' ? t.title.replace(/^Materi: /, '') : SHORT[t.id]}
                        </span>
                      );
                    })}
                    {plan.tasks.length > 3 && (
                      <span className="text-[10px] text-muted">+{plan.tasks.length - 3} lagi</span>
                    )}
                  </span>

                  {/* Ponsel: titik per tugas */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {plan.tasks.map((t) => (
                      <span
                        key={t.id}
                        className={cn('h-1.5 w-1.5 rounded-full', isTaskDone(t, manual) ? 'bg-success' : 'bg-line')}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3 flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-fg capitalize">{dayFormat.format(fromLocalDateKey(activeDate))}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {activePlan.when === 'future'
                  ? 'Rencana — bisa berubah mengikuti progresmu.'
                  : `${activeDone.done} dari ${activeDone.total} tugas selesai · ${formatDuration(activePlan.studiedMs)} belajar`}
              </p>
            </div>
          </div>
          {activePlan.when !== 'future' && (
            <ProgressBar
              value={activeDone.ratio * 100}
              label="Tugas hari ini yang selesai"
              tone="success"
              className="mb-4"
            />
          )}
          <DayTaskList plan={activePlan} manual={activeManual} />
          {syncError && (
            <Alert tone="warning" className="mt-3">
              {syncError}
            </Alert>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Centang manual (Review, Kosakata, Bicara) tersimpan ke akunmu dan ikut di semua perangkat (tanpa login: hanya di
            perangkat ini). Materi & target waktu tercentang otomatis dari progresmu.
          </p>
        </Card>
      </div>
    </div>
  );
}
