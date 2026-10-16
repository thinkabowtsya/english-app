'use client';

import { useState, type FormEvent } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/feedback';
import { formatDuration } from '@/lib/date';
import type { GoalProgress } from '@/lib/progress';
import { updateSettings } from '@/lib/storage/actions';
import { settingsSchema } from '@/lib/storage/schema';
import { cn } from '@/lib/utils';

export function DailyGoalCard({
  goal,
  goalMinutes,
  includesLive,
  className,
}: {
  goal: GoalProgress;
  goalMinutes: number;
  includesLive: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className={className}>
      <CardHeader
        icon={<Target className="h-4 w-4" />}
        title="Target harian"
        description="Total waktu belajar hari ini, dari semua sesi."
        action={
          !editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Ubah
            </Button>
          )
        }
      />
      {editing ? (
        <GoalForm initial={goalMinutes} onDone={() => setEditing(false)} />
      ) : (
        <>
          <p className="text-2xl font-semibold tabular-nums text-fg">
            {formatDuration(goal.doneMs)}
            <span className="text-base font-normal text-muted"> / {formatDuration(goal.goalMs)}</span>
          </p>
          <ProgressBar
            className="mt-3"
            value={goal.percent}
            label="Progres target harian"
            tone={goal.reached ? 'success' : 'accent'}
          />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{goal.percent}% tercapai</span>
            <span>{goal.reached ? 'Selesai' : `Sisa ${formatDuration(goal.remainingMs)}`}</span>
          </div>
          {includesLive && <p className="mt-2 text-[11px] text-muted">Termasuk sesi yang sedang berjalan.</p>}
          {goal.reached && (
            <p className={cn('mt-3 rounded-lg bg-success-soft px-3 py-2 text-xs text-success')}>
              Target hari ini tercapai. Mau lanjut belajar atau istirahat, keduanya oke.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function GoalForm({ initial, onDone }: { initial: number; onDone: () => void }) {
  const [value, setValue] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = settingsSchema.shape.dailyGoalMinutes.safeParse(Number(value));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nilai tidak valid');
      return;
    }
    updateSettings({ dailyGoalMinutes: parsed.data });
    onDone();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="goal-minutes" className="block text-xs font-medium text-muted">
        Target harian (menit)
      </label>
      <input
        id="goal-minutes"
        type="number"
        inputMode="numeric"
        min={5}
        max={600}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        aria-invalid={error !== null}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm tabular-nums"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Simpan
        </Button>
        <Button size="sm" variant="secondary" onClick={onDone}>
          Batal
        </Button>
      </div>
    </form>
  );
}
