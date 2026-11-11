'use client';

import { CURRICULUM } from '@/data/curriculum';
import { Skeleton } from '@/components/ui/feedback';
import { formatDuration, toLocalDateKey } from '@/lib/date';
import { getDailyTotalMs, getGoalProgress } from '@/lib/progress';
import { getRecommendations } from '@/lib/recommendations';
import { useActiveTimer, useAppData, useNow } from '@/lib/storage/hooks';
import { getElapsedMs } from '@/lib/timer';
import { ContinueLearning } from './components/continue-learning';
import { DailyGoalCard } from './components/daily-goal-card';
import { DailyTimer } from './components/daily-timer';
import { ProgressSummary } from './components/progress-summary';
import { MistakesCard } from './components/mistakes-card';
import { RecallHistoryCard } from './components/recall-history-card';
import { VocabProgressCard } from './components/vocab-progress-card';
import { Recommendations } from './components/recommendations';

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function greetingFor(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function DashboardView() {
  const data = useAppData();
  const timer = useActiveTimer();
  const now = useNow();

  if (!data || now === 0) return <DashboardSkeleton />;

  const todayKey = toLocalDateKey(now);
  const todaySessions = data.sessions.filter((s) => s.localDate === todayKey);
  const recordedToday = getDailyTotalMs(data.sessions, todayKey);
  const liveMs = timer && toLocalDateKey(timer.startedAt) === todayKey ? getElapsedMs(timer, now) : 0;
  const goal = getGoalProgress(recordedToday + liveMs, data.settings.dailyGoalMinutes);
  const recommendations = getRecommendations(data, CURRICULUM, goal.remainingMs, now);
  const name = data.settings.displayName.trim();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">{dateFormat.format(now)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {greetingFor(new Date(now).getHours())}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {todaySessions.length === 0
            ? `Belum ada sesi hari ini. Target harianmu ${formatDuration(goal.goalMs)}.`
            : `Hari ini ${todaySessions.length} sesi · ${formatDuration(recordedToday)} tercatat dari target ${formatDuration(
                goal.goalMs,
              )} (${getGoalProgress(recordedToday, data.settings.dailyGoalMinutes).percent}%).`}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DailyTimer
          data={data}
          timer={timer}
          now={now}
          remainingGoalMs={goal.remainingMs}
          className="lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1"
        />
        <DailyGoalCard
          goal={goal}
          goalMinutes={data.settings.dailyGoalMinutes}
          includesLive={liveMs > 0}
          className="lg:col-start-3 lg:row-start-1"
        />
        <ContinueLearning data={data} className="lg:col-start-3 lg:row-start-2" />
        <Recommendations items={recommendations} className="lg:col-start-3 lg:row-start-3" />
        <ProgressSummary data={data} todayKey={todayKey} className="lg:col-span-2 lg:col-start-1 lg:row-start-3" />
        <VocabProgressCard className="lg:col-span-2 lg:col-start-1 lg:row-start-4" />
        <MistakesCard className="lg:col-span-2 lg:col-start-1 lg:row-start-5" />
        <RecallHistoryCard className="lg:col-span-2 lg:col-start-1 lg:row-start-6" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat dashboard">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
