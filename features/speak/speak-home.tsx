'use client';

import Link from 'next/link';
import { ChevronRight, Mic } from 'lucide-react';
import { SPEAK_CATEGORIES, SPEAK_TOPICS } from '@/data/speak/topics';
import { Card } from '@/components/ui/card';
import { Alert, Badge, PageHeader, ProgressBar } from '@/components/ui/feedback';
import { MASTERED_SCORE } from '@/lib/speak';
import { cn } from '@/lib/utils';
import { useSpeakProgress } from './use-speak-progress';

/** Daftar topik percakapan penting, dikelompokkan per kategori, dengan skor terbaik per topik. */
export function SpeakHome() {
  const { progress, storage } = useSpeakProgress();
  const mastered = SPEAK_TOPICS.filter((t) => (progress[t.id]?.bestScore ?? 0) >= MASTERED_SCORE).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Speak"
        description="Latihan percakapan per topik penting: ucapkan frasa kunci, lalu ngobrol dengan AI sampai semua misi selesai."
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Mic className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            {mastered} dari {SPEAK_TOPICS.length} topik dikuasai
          </p>
          <p className="text-xs text-muted">Topik dianggap dikuasai bila skor terbaikmu ≥ {MASTERED_SCORE}.</p>
          <ProgressBar
            value={(mastered / SPEAK_TOPICS.length) * 100}
            label="Topik Speak yang dikuasai"
            tone="success"
            className="mt-2"
          />
        </div>
      </Card>

      {storage === 'unavailable' && (
        <Alert tone="warning">Progres Speak belum bisa dimuat. Pastikan migrasi speak_progress sudah dijalankan.</Alert>
      )}
      {storage === 'guest' && <Alert>Kamu belum login: progres Speak disimpan di browser ini saja.</Alert>}

      {SPEAK_CATEGORIES.map((cat) => (
        <section key={cat.id} aria-labelledby={`speak-${cat.id}`}>
          <div className="mb-2">
            <h2 id={`speak-${cat.id}`} className="text-sm font-semibold text-fg">
              {cat.label}
            </h2>
            <p className="text-xs text-muted">{cat.description}</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SPEAK_TOPICS.filter((t) => t.category === cat.id).map((t) => {
              const p = progress[t.id];
              const done = (p?.bestScore ?? 0) >= MASTERED_SCORE;
              return (
                <li key={t.id}>
                  <Link
                    href={`/speak/${t.id}`}
                    className={cn(
                      'flex h-full items-start gap-3 rounded-2xl border bg-surface p-4 transition-colors hover:border-accent',
                      done ? 'border-success/40' : 'border-line',
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {t.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-fg">{t.title}</span>
                        <Badge>{t.level}</Badge>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted italic">{t.titleEn}</span>
                      <span className="mt-1 block text-xs text-muted">{t.description}</span>
                      <span className="mt-2 block text-[11px] font-medium">
                        {p ? (
                          <span className={done ? 'text-success' : 'text-fg'}>
                            Skor terbaik {p.bestScore} · {p.attempts}× latihan
                          </span>
                        ) : (
                          <span className="text-accent">Belum dicoba</span>
                        )}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
