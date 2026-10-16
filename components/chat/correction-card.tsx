'use client';

import React from 'react';
import { Correction } from '@/lib/types';
import { CheckCircle, AlertTriangle, Sparkles, Lightbulb, ArrowRight, BookOpen, BookmarkPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CorrectionCardProps {
  correction: Correction;
  /** Jika diisi, kalimat koreksi & ungkapan natural bisa disimpan ke daftar review. */
  onSavePhrase?: (phrase: string, note?: string | null) => void;
}

function SaveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-muted hover:text-accent"
    >
      <BookmarkPlus className="h-3.5 w-3.5" />
    </button>
  );
}

export default function CorrectionCard({ correction, onSavePhrase }: CorrectionCardProps) {
  const { originalText, correctedText, isCorrect, score, summary, mistakes, nativeSuggestions, grammarTip } = correction;

  const scoreColor =
    score >= 90 ? 'text-success' :
    score >= 70 ? 'text-warning' :
    'text-danger';

  return (
    <div className="mt-2 rounded-2xl border border-line bg-surface p-3.5 text-left sm:p-4">

      {/* Score Header & Summary */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isCorrect ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
              <CheckCircle className="h-3.5 w-3.5" />
              Grammar tepat
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              Koreksi grammar
            </span>
          )}
          {summary && <p className="text-xs text-fg">{summary}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] font-semibold uppercase text-muted">Fluency</span>
          <span className={cn('text-sm font-bold tabular-nums', scoreColor)}>
            {score}/100
          </span>
        </div>
      </div>

      {/* Corrected Text Diff comparison */}
      {!isCorrect && (
        <div className="mb-3 space-y-2 rounded-xl bg-surface-muted p-3">
          <div>
            <span className="mb-0.5 block text-[10px] font-semibold uppercase text-muted">Asli</span>
            <p className="font-mono text-xs break-words text-danger line-through decoration-danger/60">{originalText}</p>
          </div>
          <div className="flex items-start gap-2 border-t border-line pt-2">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase text-success">Koreksi</span>
              <p className="font-mono text-xs font-semibold break-words text-fg">{correctedText}</p>
            </div>
            {onSavePhrase && (
              <SaveButton
                label="Simpan kalimat koreksi ke daftar review"
                onClick={() => onSavePhrase(correctedText, `Koreksi dari: ${originalText}`)}
              />
            )}
          </div>
        </div>
      )}

      {/* Specific Mistakes List */}
      {mistakes && mistakes.length > 0 && (
        <div className="mb-3 space-y-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            Analisis Kesalahan
          </span>
          <div className="grid grid-cols-1 gap-2">
            {mistakes.map((m, idx) => (
              <div key={idx} className="rounded-xl border border-line p-2.5 text-xs">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-accent uppercase">
                    {m.type}
                  </span>
                  <span className="font-mono text-danger">{m.original}</span>
                  <ArrowRight className="h-3 w-3 text-muted" />
                  <span className="font-mono font-semibold text-success">{m.correction}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted">{m.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Native Speaker Suggestions */}
      {nativeSuggestions && nativeSuggestions.length > 0 && (
        <div className="mb-3 rounded-xl bg-accent-soft p-3">
          <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Ungkapan Alami (Native Speaker Way)
          </span>
          <ul className="space-y-1.5">
            {nativeSuggestions.map((sug, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-fg">
                <span className="font-bold text-accent">•</span>
                <span className="min-w-0 flex-1 break-words">&ldquo;{sug}&rdquo;</span>
                {onSavePhrase && (
                  <SaveButton
                    label="Simpan ungkapan ini ke daftar review"
                    onClick={() => onSavePhrase(sug, `Alternatif natural untuk: ${originalText}`)}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grammar Tip */}
      {grammarTip && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-soft p-2.5 text-xs text-fg">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <span className="block text-[11px] font-semibold text-warning">Tips Tata Bahasa</span>
            <p className="text-[11px] leading-relaxed">{grammarTip}</p>
          </div>
        </div>
      )}

    </div>
  );
}
