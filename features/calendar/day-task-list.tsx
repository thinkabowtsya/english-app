'use client';

import Link from 'next/link';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { isTaskDone, type DayPlan, type PlanTaskId } from '@/lib/daily-plan';
import { toggleDailyCheck } from '@/lib/daily-checks';
import { formatDuration } from '@/lib/date';
import { cn } from '@/lib/utils';

/** Daftar tugas satu hari: centang (otomatis/manual), menit, dan tautan ke menu terkait. */
export function DayTaskList({ plan, manual }: { plan: DayPlan; manual: ReadonlySet<PlanTaskId> }) {
  const canCheck = plan.when !== 'future';
  return (
    <ul className="space-y-2">
      {plan.tasks.map((task) => {
        const done = isTaskDone(task, manual);
        const toggleable = task.manual && !task.autoDone && canCheck;
        return (
          <li
            key={task.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-2.5',
              done ? 'border-success/30 bg-success-soft' : 'border-line bg-surface',
            )}
          >
            <button
              type="button"
              onClick={() => toggleable && toggleDailyCheck(plan.date, task.id)}
              disabled={!toggleable}
              aria-pressed={done}
              aria-label={done ? `Batalkan: ${task.title}` : `Tandai selesai: ${task.title}`}
              title={
                task.autoDone
                  ? 'Tercentang otomatis dari aktivitasmu'
                  : !task.manual
                  ? 'Tercentang otomatis saat selesai'
                  : !canCheck
                  ? 'Bisa dicentang pada harinya'
                  : done
                  ? 'Batalkan'
                  : 'Tandai selesai'
              }
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                done ? 'border-success bg-success text-white dark:text-bg' : 'border-line bg-surface',
                toggleable ? 'cursor-pointer hover:border-success' : 'cursor-default',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : !toggleable && <Lock className="h-2.5 w-2.5 text-muted" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', done ? 'text-muted line-through' : 'text-fg')}>{task.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {task.minutes > 0 && <span className="mr-1.5 font-medium text-fg">{task.minutes} mnt</span>}
                {task.id === 'timer'
                  ? `${formatDuration(plan.studiedMs)} dari ${formatDuration(plan.goalMs)} tercatat`
                  : task.detail}
              </p>
            </div>
            {plan.when !== 'past' && (
              <Link
                href={task.href}
                className="mt-0.5 inline-flex shrink-0 items-center rounded-lg px-1.5 py-1 text-xs font-medium text-accent hover:bg-accent-soft"
              >
                Buka
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
