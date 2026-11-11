'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/feedback';
import { CURRICULUM } from '@/data/curriculum';
import { flattenLessons } from '@/lib/curriculum';
import { recordEvaluation } from '@/lib/storage/actions';
import { useAppData } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';
import { PracticeHistory } from './practice-history';
import { PracticeSession } from './practice-session';

/** Latihan grammar, Susun kalimat, dan Evaluasi: soal AI berdasarkan isi satu materi. */

type LessonKind = 'grammar' | 'sentence' | 'evaluation';

const COPY: Record<LessonKind, { title: string; description: string }> = {
  grammar: {
    title: 'Latihan grammar',
    description:
      'Soal AI dari pola grammar di materi yang kamu pilih: pilihan ganda, isi bagian kosong, dan perbaiki kalimat. Setiap jawaban langsung dibahas.',
  },
  sentence: {
    title: 'Susun kalimat',
    description:
      'Menyusun kata menjadi kalimat dan menerjemahkan kalimat Indonesia ke Inggris sesuai materi yang dipilih. Terjemahan dinilai AI, jadi susunan lain yang benar tetap diterima.',
  },
  evaluation: {
    title: 'Evaluasi materi',
    description:
      '10 soal campuran untuk menguji satu materi. Jawaban diperiksa di akhir, dan nilainya tercatat di Progres Saya.',
  },
};

const COUNTS = [6, 10] as const;

const READY = flattenLessons(CURRICULUM).filter((ref) => ref.lesson.contentStatus === 'ready');

export function LessonPracticeView({ kind }: { kind: LessonKind }) {
  const data = useAppData();
  const [chosen, setChosen] = useState<string | null>(null);
  const [count, setCount] = useState<number>(COUNTS[0]);
  const [session, setSession] = useState<{ key: number; lessonId: string } | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Default: materi yang terakhir dipelajari (bila ada), selain itu materi pertama yang tersedia.
  const lastStudied = useMemo(() => {
    const progress = data?.lessons ?? {};
    return READY.map((r) => r.lesson.id)
      .filter((id) => progress[id]?.lastStudiedAt)
      .sort((a, b) => (progress[b]?.lastStudiedAt ?? 0) - (progress[a]?.lastStudiedAt ?? 0))[0];
  }, [data]);
  const lessonId = chosen ?? lastStudied ?? READY[0]?.lesson.id ?? '';
  const ref = READY.find((r) => r.lesson.id === lessonId);
  const copy = COPY[kind];

  const start = () => setSession({ key: Date.now(), lessonId });

  return (
    <div className="space-y-6">
      <Link href="/latihan" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Latihan
      </Link>
      <PageHeader title={copy.title} description={copy.description} />

      {session ? (
        <PracticeSession
          key={session.key}
          request={{ kind, lessonId: session.lessonId, count }}
          deferFeedback={kind === 'evaluation'}
          onSaved={() => setHistoryVersion((v) => v + 1)}
          onFinished={(items) => {
            if (kind !== 'evaluation' || !ref) return;
            // Nilai evaluasi juga dicatat di progres materi (tampil di Progres Saya).
            recordEvaluation(ref.lesson.id, ref.module.id, items.filter((i) => i.correct).length, items.length);
          }}
          onRestart={() => setSession({ key: Date.now(), lessonId: session.lessonId })}
          onExit={() => setSession(null)}
        />
      ) : (
        <Card className="space-y-4">
          <div>
            <label htmlFor="practice-lesson" className="mb-1.5 block text-xs font-medium text-muted">
              Materi
            </label>
            <select
              id="practice-lesson"
              value={lessonId}
              onChange={(e) => setChosen(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg"
            >
              {CURRICULUM.flatMap((level) => level.modules).map((mod) => {
                const lessons = READY.filter((r) => r.module.id === mod.id);
                return lessons.length ? (
                  <optgroup key={mod.id} label={mod.title}>
                    {lessons.map((r) => (
                      <option key={r.lesson.id} value={r.lesson.id}>
                        {r.lesson.title}
                        {data?.lessons[r.lesson.id]?.status === 'completed' ? ' ✓' : ''}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
            {ref && <p className="mt-1.5 text-xs text-muted">{ref.lesson.summary}</p>}
          </div>
          {kind !== 'evaluation' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted">Jumlah soal:</span>
              {COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={() => setCount(n)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    count === n ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:bg-surface-muted hover:text-fg',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <Button onClick={start} disabled={!lessonId}>
            <Sparkles className="h-4 w-4" />
            {kind === 'evaluation' ? 'Mulai evaluasi' : 'Buat soal'}
          </Button>
        </Card>
      )}

      <PracticeHistory kinds={[kind]} version={historyVersion} />
    </div>
  );
}
