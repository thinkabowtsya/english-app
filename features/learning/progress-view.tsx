'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CURRICULUM } from '@/data/curriculum';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui/feedback';
import { findLesson, flattenLessons, getLessonStatus } from '@/lib/curriculum';
import { formatDuration, toLocalDateKey } from '@/lib/date';
import {
  getActiveDays,
  getOpenReviews,
  getRecentActivity,
  getSessionTotals,
  getStreak,
} from '@/lib/progress';
import { useAppData, useNow } from '@/lib/storage/hooks';
import type { LearningSession } from '@/types/learning';
import { ActivityChart } from './components/activity-chart';
import { LessonStatusBadge, ProgressIndicator } from './components/progress-indicator';
import { ReviewReminder } from './components/review-reminder';

const STATUS_LABEL: Record<LearningSession['status'], { label: string; tone: 'success' | 'neutral' | 'warning' }> = {
  completed: { label: 'Selesai', tone: 'success' },
  stopped: { label: 'Dihentikan', tone: 'neutral' },
  interrupted: { label: 'Terputus', tone: 'warning' },
};

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const HISTORY_PAGE = 15;

export function ProgressView() {
  const data = useAppData();
  const now = useNow();
  const [showAll, setShowAll] = useState(false);

  if (!data || now === 0) {
    return (
      <div>
        <PageHeader title="Progres Saya" />
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  const todayKey = toLocalDateKey(now);
  const totals = getSessionTotals(data.sessions);
  const streak = getStreak(data.sessions, todayKey);
  const week = getRecentActivity(data.sessions, todayKey, 7);
  const weekTotal = week.reduce((sum, d) => sum + d.totalMs, 0);
  const refs = flattenLessons(CURRICULUM);
  const completedLessons = refs.filter((r) => data.lessons[r.lesson.id]?.status === 'completed').length;
  const studiedLessons = refs.filter((r) => data.lessons[r.lesson.id]);
  const sessions = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt);
  const visibleSessions = showAll ? sessions : sessions.slice(0, HISTORY_PAGE);
  const evaluations = [...data.evaluations].sort((a, b) => b.takenAt - a.takenAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progres Saya"
        description="Semua angka dihitung dari sesi yang benar-benar tercatat di browser ini."
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Total waktu belajar" value={formatDuration(totals.totalMs)} />
        <Metric label="Sesi selesai" value={`${totals.completedCount}`} hint={`dari ${totals.sessionCount} sesi`} />
        <Metric label="Hari aktif" value={`${getActiveDays(data.sessions).length}`} hint="min. 1 menit/hari" />
        <Metric label="Streak" value={`${streak.current} hari`} hint={`terpanjang ${streak.longest} hari`} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Aktivitas 7 hari terakhir"
            description={`Minggu ini ${formatDuration(weekTotal)} · rata-rata ${formatDuration(weekTotal / 7)}/hari`}
          />
          {weekTotal === 0 ? (
            <EmptyState
              title="Belum ada aktivitas minggu ini"
              description="Mulai sesi dari dashboard untuk mengisi grafik."
              action={
                <Link href="/#timer" className="text-sm font-medium text-accent hover:underline">
                  Ke timer
                </Link>
              }
            />
          ) : (
            <ActivityChart days={week} goalMinutes={data.settings.dailyGoalMinutes} todayKey={todayKey} />
          )}
        </Card>
        <Card>
          <CardHeader title="Penyelesaian materi" />
          <ProgressIndicator completed={completedLessons} total={refs.length} label="Materi selesai" />
          <p className="mt-3 text-xs text-muted">
            {studiedLessons.length} materi pernah dibuka ·{' '}
            {Object.values(data.lessons).filter((l) => l.status === 'needs_review').length} perlu diulang
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Riwayat sesi belajar" description="Durasi aktual tidak termasuk waktu jeda." />
        {sessions.length === 0 ? (
          <EmptyState title="Belum ada sesi tercatat" description="Sesi muncul di sini setelah selesai atau dihentikan." />
        ) : (
          <>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-line">
                    <th scope="col" className="px-5 py-2 font-medium">Tanggal</th>
                    <th scope="col" className="px-2 py-2 font-medium">Waktu</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Aktual</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Target</th>
                    <th scope="col" className="px-2 py-2 font-medium">Status</th>
                    <th scope="col" className="px-5 py-2 font-medium">Materi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleSessions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-2.5 whitespace-nowrap">{dateFormat.format(s.startedAt)}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-muted tabular-nums">
                        {timeFormat.format(s.startedAt)}–{timeFormat.format(s.endedAt)}
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">{formatDuration(s.actualMs)}</td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap text-muted tabular-nums">
                        {formatDuration(s.targetMs)}
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge tone={STATUS_LABEL[s.status].tone}>{STATUS_LABEL[s.status].label}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-muted">
                        {s.lessonId ? (findLesson(CURRICULUM, s.lessonId)?.lesson.title ?? '—') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sessions.length > HISTORY_PAGE && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${sessions.length})`}
              </Button>
            )}
          </>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Materi yang dipelajari" />
          {studiedLessons.length === 0 ? (
            <EmptyState title="Belum ada materi yang dibuka" />
          ) : (
            <ul className="divide-y divide-line">
              {studiedLessons.map((ref) => {
                const p = data.lessons[ref.lesson.id];
                return (
                  <li key={ref.lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <Link href={`/materi/${ref.lesson.id}`} className="min-w-0 hover:text-accent">
                      <span className="block text-sm font-medium">{ref.lesson.title}</span>
                      <span className="block text-xs text-muted">
                        {ref.module.title} · {formatDuration(p.timeSpentMs)}
                        {p.lastScore != null && ` · skor ${p.lastScore}`}
                        {p.lastStudiedAt && ` · ${dateFormat.format(p.lastStudiedAt)}`}
                      </span>
                    </Link>
                    <LessonStatusBadge status={getLessonStatus(refs, ref, data.lessons)} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Riwayat hasil evaluasi" />
          {evaluations.length === 0 ? (
            <EmptyState
              title="Belum ada hasil evaluasi"
              description="Evaluasi akan tersedia setelah konten kurikulum dan bank soal ditambahkan."
            />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {evaluations.map((e) => (
                <li key={e.id} className="flex justify-between py-2">
                  <span>{findLesson(CURRICULUM, e.lessonId)?.lesson.title ?? e.lessonId}</span>
                  <span className="tabular-nums">
                    {e.score}/{e.maxScore} · {dateFormat.format(e.takenAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Perlu diulang" description="Materi, pola, dan frasa yang belum dikuasai." />
        <ReviewReminder items={getOpenReviews(data.reviews)} now={now} />
      </Card>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{value}</dd>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
