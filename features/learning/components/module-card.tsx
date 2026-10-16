import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import type { ModuleProgress } from '@/lib/curriculum';
import type { CurriculumModule } from '@/types/curriculum';
import { ProgressIndicator } from './progress-indicator';

export function ModuleCard({
  module,
  progress,
  children,
}: {
  module: CurriculumModule;
  progress: ModuleProgress;
  children?: ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="border-b border-line p-5">
        <h3 className="font-semibold text-fg">{module.title}</h3>
        <p className="mt-1 text-sm text-muted">{module.description}</p>
        <div className="mt-4">
          <ProgressIndicator completed={progress.completed} total={progress.total} label="Materi selesai" />
        </div>
      </div>
      {children && <ul className="divide-y divide-line">{children}</ul>}
    </Card>
  );
}
