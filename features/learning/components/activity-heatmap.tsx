'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { CURRICULUM } from '@/data/curriculum';
import { flattenLessons } from '@/lib/curriculum';
import { checksFor, getDailyChecks, getServerDailyChecks, subscribeDailyChecks } from '@/lib/daily-checks';
import { activityLevel, buildDayPlan, dayCompletion, scheduleLessons } from '@/lib/daily-plan';
import { addDaysToKey, formatDuration, fromLocalDateKey } from '@/lib/date';
import { getTotalsByDate } from '@/lib/progress';
import type { AppData, LocalDateKey } from '@/types/learning';
import { heatColor } from '@/features/calendar/heat';

const refs = flattenLessons(CURRICULUM);
const WEEKS = 53;
const ROW_LABELS = ['Sen', '', 'Rab', '', 'Jum', '', ''];
const monthShort = new Intl.DateTimeFormat('id-ID', { month: 'short' });
const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

interface Cell {
  date: LocalDateKey;
  level: number;
  studiedMs: number;
  done: number;
  total: number;
  future: boolean;
}

/**
 * Peta aktivitas setahun ala GitHub: satu kotak per hari (kolom = minggu, baris = Senin–Minggu).
 * Warna makin hijau bila waktu belajar mendekati target harian atau tugas Kalender makin lengkap.
 */
export function ActivityHeatmap({ data, todayKey }: { data: AppData; todayKey: LocalDateKey }) {
  const checks = useSyncExternalStore(subscribeDailyChecks, getDailyChecks, getServerDailyChecks);
  const scroller = useRef<HTMLDivElement>(null);

  const { weeks, months, activeDays, totalMs } = useMemo(() => {
    const schedule = scheduleLessons(refs, data, todayKey);
    const totals = getTotalsByDate(data.sessions);
    const mondayOffset = (fromLocalDateKey(todayKey).getDay() + 6) % 7;
    const start = addDaysToKey(todayKey, -mondayOffset - (WEEKS - 1) * 7);

    const weeks: Cell[][] = [];
    const months: { col: number; label: string }[] = [];
    let activeDays = 0;
    let totalMs = 0;
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const col: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDaysToKey(start, w * 7 + d);
        const future = date > todayKey;
        if (future) {
          col.push({ date, level: 0, studiedMs: 0, done: 0, total: 0, future });
          continue;
        }
        const plan = buildDayPlan({ date, todayKey, refs, data, schedule, totals });
        const c = dayCompletion(plan, checksFor(checks, date));
        const level = activityLevel(plan.studiedMs, plan.goalMs, c.ratio);
        if (level > 0) activeDays++;
        totalMs += plan.studiedMs;
        col.push({ date, level, studiedMs: plan.studiedMs, done: c.done, total: c.total, future });
      }
      const month = fromLocalDateKey(col[0].date).getMonth();
      if (month !== lastMonth) {
        // Lewati label bulan di kolom pertama bila terlalu dekat dengan label berikutnya.
        if (!(w === 0 && fromLocalDateKey(col[0].date).getDate() > 21)) {
          months.push({ col: w, label: monthShort.format(fromLocalDateKey(col[0].date)) });
        }
        lastMonth = month;
      }
      weeks.push(col);
    }
    return { weeks, months, activeDays, totalMs };
  }, [data, todayKey, checks]);

  // Tampilkan minggu terbaru (ujung kanan) di layar sempit.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        <span className="font-semibold text-fg">{activeDays} hari belajar</span> dalam setahun terakhir ·{' '}
        {formatDuration(totalMs)} tercatat
      </p>
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          <div className="mr-1 grid grid-rows-[12px_repeat(7,11px)] gap-[3px] text-[9px] leading-[11px] text-muted">
            <span />
            {ROW_LABELS.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          {weeks.map((col, w) => (
            <div key={col[0].date} className="grid grid-rows-[12px_repeat(7,11px)] gap-[3px]">
              <span className="relative text-[9px] leading-[11px] text-muted">
                {months.find((m) => m.col === w) && (
                  <span className="absolute left-0 whitespace-nowrap">{months.find((m) => m.col === w)!.label}</span>
                )}
              </span>
              {col.map((cell) =>
                cell.future ? (
                  <span key={cell.date} className="h-[11px] w-[11px]" />
                ) : (
                  <span
                    key={cell.date}
                    role="img"
                    aria-label={`${dayFormat.format(fromLocalDateKey(cell.date))}: ${formatDuration(cell.studiedMs)}, ${cell.done}/${cell.total} tugas`}
                    title={`${dayFormat.format(fromLocalDateKey(cell.date))} — ${formatDuration(cell.studiedMs)} · ${cell.done}/${cell.total} tugas`}
                    className={`h-[11px] w-[11px] rounded-[2px] ${cell.date === todayKey ? 'ring-1 ring-fg/40' : ''}`}
                    style={{ backgroundColor: heatColor(cell.level), outline: cell.level === 0 ? '1px solid var(--line)' : undefined, outlineOffset: -1 }}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        <span className="mr-1">Sedikit</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: heatColor(l), outline: l === 0 ? '1px solid var(--line)' : undefined, outlineOffset: -1 }}
          />
        ))}
        <span className="ml-1">Banyak</span>
      </div>
    </div>
  );
}
