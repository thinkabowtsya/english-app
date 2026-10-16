'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Brain, Mic, Puzzle, Repeat, SpellCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, PageHeader, Skeleton } from '@/components/ui/feedback';
import { getDueReviews, getOpenReviews } from '@/lib/progress';
import { useAppData, useNow } from '@/lib/storage/hooks';
import { ExerciseContainer } from './components/exercise-container';
import { ReviewReminder } from './components/review-reminder';

const PRACTICE_TYPES: { id: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    id: 'grammar',
    title: 'Latihan grammar',
    description: 'Latihan pola grammar per materi, dari dasar hingga lanjutan.',
    icon: SpellCheck,
  },
  {
    id: 'sentence-building',
    title: 'Sentence building',
    description: 'Menyusun kalimat bahasa Inggris langsung dari ide, tanpa menerjemahkan kata per kata.',
    icon: Puzzle,
  },
  {
    id: 'vocabulary-recall',
    title: 'Vocabulary recall',
    description: 'Mengingat kembali kosakata dan natural expressions secara aktif.',
    icon: Brain,
  },
  {
    id: 'evaluation',
    title: 'Evaluasi',
    description: 'Evaluasi akhir materi. Skor tersimpan di Progres Saya.',
    icon: BookOpen,
  },
];

const EXISTING_TOOLS = [
  {
    href: '/vocabulary',
    title: 'Vocab & Idiom Builder',
    description: 'Flashcard kosakata yang dibuat AI per level CEFR.',
    icon: BookOpen,
  },
  {
    href: '/pronunciation',
    title: 'Speaking Lab',
    description: 'Latihan membaca keras dan membandingkan pengucapan.',
    icon: Mic,
  },
];

export function LatihanView() {
  const data = useAppData();
  const now = useNow();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Latihan"
        description="Tempat latihan grammar, sentence building, vocabulary recall, dan evaluasi. Bank soal akan ditambahkan bersama konten kurikulum."
      />

      <section id="review" className="scroll-mt-20">
        <Card>
          <CardHeader
            icon={<Repeat className="h-4 w-4" />}
            title="Daftar review"
            description="Materi, pola, dan frasa yang perlu diulang — termasuk frasa yang kamu simpan dari AI Coach."
            action={
              data && now > 0 ? (
                <Badge tone={getDueReviews(data.reviews, now).length > 0 ? 'warning' : 'neutral'}>
                  {getDueReviews(data.reviews, now).length} jatuh tempo
                </Badge>
              ) : null
            }
          />
          {data && now > 0 ? (
            <ReviewReminder items={getOpenReviews(data.reviews)} now={now} />
          ) : (
            <Skeleton className="h-24" />
          )}
        </Card>
      </section>

      <section aria-labelledby="practice-types">
        <h2 id="practice-types" className="mb-3 text-sm font-semibold text-fg">
          Jenis latihan
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PRACTICE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <ExerciseContainer
                key={type.id}
                title={type.title}
                type={type.id === 'evaluation' ? 'evaluation' : type.id === 'vocabulary-recall' ? 'recall' : 'exercise'}
                description={
                  <span className="flex gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {type.description}
                  </span>
                }
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="existing-tools">
        <h2 id="existing-tools" className="mb-1 text-sm font-semibold text-fg">
          Alat latihan yang sudah ada
        </h2>
        <p className="mb-3 text-xs text-muted">
          Kata yang di-bookmark di Vocab Builder masuk ke daftar review. Waktu belajar hanya dicatat lewat Daily
          Learning Timer.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {EXISTING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{tool.title}</span>
                  <span className="block text-xs text-muted">{tool.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
