'use client';

import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pickRound } from '@/lib/shuffle';
import type { LessonActivity } from '@/types/curriculum';
import { ExerciseItemCard } from './exercise-item';

/**
 * Menampilkan sebagian soal dari bank secara acak (`pickCount`). "Soal lain" mengganti
 * set soal; benih dari server membuat render awal sama di server & browser.
 */
export function ExerciseItemList({ activity, seed }: { activity: LessonActivity; seed: number }) {
  const [round, setRound] = useState(0);
  const items = activity.items ?? [];
  const count = Math.min(activity.pickCount ?? items.length, items.length);
  const shuffled = count < items.length;
  const indices = pickRound(items.length, count, seed + activity.id.length * 7919, round);
  const context = [activity.title, activity.instructions].filter(Boolean).join('. ');

  return (
    <>
      <ol className="space-y-3">
        {indices.map((i, pos) => (
          <ExerciseItemCard
            key={`${round}-${i}`}
            item={items[i]}
            index={pos}
            open={activity.open ?? false}
            context={context}
          />
        ))}
      </ol>
      {shuffled && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
          <span>
            {count} dari {items.length} soal · diacak
          </span>
          <Button size="sm" variant="ghost" onClick={() => setRound((r) => r + 1)}>
            <Shuffle className="h-3.5 w-3.5" />
            Soal lain
          </Button>
        </div>
      )}
    </>
  );
}
