import { fromLocalDateKey, formatDuration, MINUTE_MS } from '@/lib/date';
import type { DayActivity } from '@/lib/progress';

const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
const fullDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

function niceCeil(minutes: number): number {
  if (minutes <= 10) return 10;
  const step = minutes <= 60 ? 10 : minutes <= 180 ? 30 : 60;
  return Math.ceil(minutes / step) * step;
}

/**
 * Grafik kolom menit belajar per hari (satu seri). Garis tipis menandai target harian.
 * Setiap kolom bisa di-hover/fokus untuk melihat nilainya; tabel tersembunyi untuk pembaca layar.
 */
export function ActivityChart({
  days,
  goalMinutes,
  todayKey,
}: {
  days: DayActivity[];
  goalMinutes: number;
  todayKey: string;
}) {
  const maxMinutes = Math.max(goalMinutes, ...days.map((d) => d.totalMs / MINUTE_MS));
  const scaleMax = niceCeil(maxMinutes);
  const ticks = [scaleMax, scaleMax / 2, 0];
  const goalPct = (goalMinutes / scaleMax) * 100;

  return (
    <figure>
      <div className="flex gap-2">
        <div className="relative h-40 w-9 shrink-0 text-right text-[10px] text-muted tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / scaleMax) * 100}%` }}>
              {t}m
            </span>
          ))}
        </div>
        <div className="relative h-40 flex-1" aria-hidden>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-line"
              style={{ top: `${100 - (t / scaleMax) * 100}%` }}
            />
          ))}
          <div className="absolute inset-x-0 border-t border-fg/40" style={{ top: `${100 - goalPct}%` }}>
            <span className="absolute -top-4 right-0 text-[10px] text-muted">Target {goalMinutes}m</span>
          </div>
          <div className="absolute inset-0 grid grid-cols-7">
            {days.map((day) => {
              const minutes = day.totalMs / MINUTE_MS;
              const pct = (minutes / scaleMax) * 100;
              return (
                <div key={day.date} className="group relative flex items-end justify-center hover:bg-surface-muted/60">
                  {minutes > 0 && (
                    <div className="w-full max-w-6 rounded-t-[4px] bg-chart" style={{ height: `${Math.max(pct, 1.5)}%` }} />
                  )}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] whitespace-nowrap text-fg shadow-sm group-hover:block">
                    {fullDate.format(fromLocalDateKey(day.date))} · {formatDuration(day.totalMs)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 ml-11 grid grid-cols-7 text-center text-[10px] text-muted" aria-hidden>
        {days.map((day) => (
          <span key={day.date} className={day.date === todayKey ? 'font-semibold text-fg' : undefined}>
            {day.date === todayKey ? 'Hari ini' : weekday.format(fromLocalDateKey(day.date))}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Menit belajar per hari, 7 hari terakhir</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Durasi</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{fullDate.format(fromLocalDateKey(day.date))}</td>
              <td>{formatDuration(day.totalMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
