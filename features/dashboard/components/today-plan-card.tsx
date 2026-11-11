'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { Card, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/feedback';
import { DayTaskList } from '@/features/calendar/day-task-list';
import { flattenLessons } from '@/lib/curriculum';
import { checksFor, getDailyChecks, getServerDailyChecks, subscribeDailyChecks } from '@/lib/daily-checks';
import { buildDayPlan, dayCompletion } from '@/lib/daily-plan';
import type { AppData, LocalDateKey } from '@/types/learning';

const refs = flattenLessons(CURRICULUM);

/** Rencana 30 menit hari ini (sama dengan menu Kalender), langsung di Dashboard. */
export function TodayPlanCard({ data, todayKey, className }: { data: AppData; todayKey: LocalDateKey; className?: string }) {
  const checks = useSyncExternalStore(subscribeDailyChecks, getDailyChecks, getServerDailyChecks);
  const plan = buildDayPlan({ date: todayKey, todayKey, refs, data });
  const manual = checksFor(checks, todayKey);
  const done = dayCompletion(plan, manual);

  return (
    <Card className={className}>
      <CardHeader
        title="Tugas hari ini"
        description={`${done.done} dari ${done.total} selesai · rencana ±30 menit`}
        icon={<CalendarCheck className="h-4 w-4" />}
        action={
          <Link href="/kalender" className="shrink-0 text-xs font-medium text-accent hover:underline">
            Kalender
          </Link>
        }
      />
      <ProgressBar value={done.ratio * 100} label="Tugas hari ini yang selesai" tone="success" className="mb-4" />
      <DayTaskList plan={plan} manual={manual} />
    </Card>
  );
}
