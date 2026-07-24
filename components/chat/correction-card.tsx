'use client';

import React from 'react';
import { Correction } from '@/lib/types';
import { CheckCircle, AlertTriangle, Sparkles, Lightbulb, ArrowRight, BookOpen } from 'lucide-react';

interface CorrectionCardProps {
  correction: Correction;
}

export default function CorrectionCard({ correction }: CorrectionCardProps) {
  const { originalText, correctedText, isCorrect, score, summary, mistakes, nativeSuggestions, grammarTip } = correction;

  const scoreColor =
    score >= 90 ? 'from-emerald-500 to-teal-600 text-emerald-400' :
    score >= 70 ? 'from-amber-500 to-yellow-600 text-amber-400' :
    'from-rose-500 to-red-600 text-rose-400';

  return (
    <div className="mt-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
      
      {/* Score Header & Summary */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Perfect Grammar</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-full">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Grammar Correction</span>
            </div>
          )}
          <p className="text-xs text-slate-300 font-medium">{summary}</p>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Fluency</span>
          <span className={`font-extrabold text-sm ${scoreColor}`}>
            {score}/100
          </span>
        </div>
      </div>

      {/* Corrected Text Diff comparison */}
      {!isCorrect && (
        <div className="mb-3 rounded-xl bg-slate-950/80 p-3 border border-slate-800/60 space-y-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Original</span>
            <p className="text-xs text-rose-300 line-through decoration-rose-500/60 font-mono">{originalText}</p>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/40">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Corrected</span>
              <p className="text-xs text-emerald-300 font-semibold font-mono">{correctedText}</p>
            </div>
          </div>
        </div>
      )}

      {/* Specific Mistakes List */}
      {mistakes && mistakes.length > 0 && (
        <div className="mb-3 space-y-2">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            Analisis Kesalahan
          </span>
          <div className="grid grid-cols-1 gap-2">
            {mistakes.map((m, idx) => (
              <div key={idx} className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                    {m.type}
                  </span>
                  <span className="text-rose-400 font-mono font-medium">{m.original}</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-emerald-400 font-mono font-bold">{m.correction}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{m.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Native Speaker Suggestions */}
      {nativeSuggestions && nativeSuggestions.length > 0 && (
        <div className="mb-3 rounded-xl bg-indigo-950/30 border border-indigo-800/30 p-3">
          <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Ungkapan Alami Alami (Native Speaker Way)
          </span>
          <ul className="space-y-1.5">
            {nativeSuggestions.map((sug, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-indigo-100 font-medium">
                <span className="text-indigo-400 font-bold">•</span>
                <span>&ldquo;{sug}&rdquo;</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grammar Tip */}
      {grammarTip && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-950/20 border border-amber-800/30 p-2.5 text-xs text-amber-200">
          <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[11px] block text-amber-300">Tips Tata Bahasa</span>
            <p className="text-[11px] leading-relaxed">{grammarTip}</p>
          </div>
        </div>
      )}

    </div>
  );
}
