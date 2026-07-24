'use client';

import React from 'react';
import { PRACTICE_SCENARIOS } from '@/lib/scenarios';
import { Scenario } from '@/lib/types';
import { MessageCircleHeart, Briefcase, GraduationCap, Coffee, Plane, Sparkles, CheckCircle2 } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {PRACTICE_SCENARIOS.map((sc) => {
        const IconComponent = iconMap[sc.iconName] || Sparkles;
        const isSelected = currentScenario.id === sc.id;

        return (
          <button
            key={sc.id}
            onClick={() => onSelectScenario(sc)}
            className={`relative text-left p-3.5 rounded-2xl transition-all duration-300 flex flex-col justify-between group ${
              isSelected
                ? 'bg-slate-900 border-2 border-indigo-500/80 shadow-lg shadow-indigo-500/15 scale-[1.02]'
                : 'glass-panel hover:border-slate-700 hover:bg-slate-900/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${sc.badgeColor} text-white shadow-md`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                )}
              </div>
              
              <h4 className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {sc.title}
              </h4>
              <p className="text-[11px] text-slate-400 font-medium mb-1">{sc.subtitle}</p>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/30">
                {sc.level.split(' ')[0]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
