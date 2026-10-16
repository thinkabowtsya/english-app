'use client';

import { CURRICULUM } from '@/data/curriculum';
import { PageHeader, Skeleton } from '@/components/ui/feedback';
import { flattenLessons, getLessonStatus, getModuleProgress } from '@/lib/curriculum';
import { useAppData } from '@/lib/storage/hooks';
import { LessonCard } from './components/lesson-card';
import { ModuleCard } from './components/module-card';
import { ProgressIndicator } from './components/progress-indicator';

export function MateriView() {
  const data = useAppData();
  const refs = flattenLessons(CURRICULUM);

  return (
    <div>
      <PageHeader
        title="Materi"
        description="Kurikulum bertingkat: Level → Modul → Materi → Aktivitas. Selesaikan materi secara berurutan untuk membuka materi berikutnya."
      />
      {!data ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="space-y-10">
          {CURRICULUM.map((level) => {
            const lessons = level.modules.flatMap((m) => m.lessons);
            const done = lessons.filter((l) => data.lessons[l.id]?.status === 'completed').length;
            return (
              <section key={level.id} aria-labelledby={`${level.id}-title`}>
                <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_16rem] sm:items-end">
                  <div>
                    <h2 id={`${level.id}-title`} className="text-lg font-semibold text-fg">
                      {level.title}
                    </h2>
                    <p className="text-sm text-muted">{level.description}</p>
                  </div>
                  <ProgressIndicator completed={done} total={lessons.length} label="Progres level" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {level.modules.map((mod) => (
                    <ModuleCard key={mod.id} module={mod} progress={getModuleProgress(mod, data.lessons)}>
                      {mod.lessons.map((lesson) => {
                        const ref = refs.find((r) => r.lesson.id === lesson.id);
                        if (!ref) return null;
                        return (
                          <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            status={getLessonStatus(refs, ref, data.lessons)}
                            progress={data.lessons[lesson.id]}
                          />
                        );
                      })}
                    </ModuleCard>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
