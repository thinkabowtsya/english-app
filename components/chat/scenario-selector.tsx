'use client';

import React from 'react';
import { PRACTICE_SCENARIOS } from '@/lib/scenarios';
import { Scenario } from '@/lib/types';
import { MessageCircleHeart, Briefcase, GraduationCap, Coffee, Plane, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioSelectorProps {
  currentScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircleHeart,
  Briefcase,
  GraduationCap,
  Coffee,
  Plane
};

export default function ScenarioSelector({ currentScenario, onSelectScenario }: ScenarioSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Skenario latihan" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
      {PRACTICE_SCENARIOS.map((sc) => {
        const IconComponent = iconMap[sc.iconName] || Sparkles;
        const isSelected = currentScenario.id === sc.id;

        return (
          <button
            key={sc.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectScenario(sc)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors lg:flex-col lg:items-stretch lg:justify-between',
              isSelected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-surface-muted'
            )}
          >
            <div className="flex items-center justify-between lg:mb-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  isSelected ? 'bg-accent text-accent-fg' : 'bg-accent-soft text-accent'
                )}
              >
                <IconComponent className="h-4 w-4" />
              </span>
              {isSelected && <CheckCircle2 className="hidden h-4 w-4 text-accent lg:block" />}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className={cn('line-clamp-1 text-xs font-semibold', isSelected ? 'text-accent' : 'text-fg')}>
                {sc.title}
              </h4>
              <p className="line-clamp-1 text-[11px] text-muted">{sc.subtitle}</p>
              <span className="mt-1.5 inline-block rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted">
                {sc.level.split(' ')[0]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
