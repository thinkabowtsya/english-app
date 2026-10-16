import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import type { Lesson, LessonActivity } from '@/types/curriculum';
import { ExerciseContainer } from './exercise-container';

/** Urutan bagian materi. Bagian tanpa konten ditampilkan sebagai placeholder yang jelas. */
const SECTIONS = [
  { id: 'objectives', title: 'Tujuan belajar' },
  { id: 'prerequisites', title: 'Prasyarat' },
  { id: 'explanation', title: 'Penjelasan' },
  { id: 'patterns', title: 'Pola kalimat' },
  { id: 'examples', title: 'Contoh' },
  { id: 'comparisons', title: 'Perbandingan' },
  { id: 'mistakes', title: 'Kesalahan umum' },
  { id: 'expressions', title: 'Useful expressions' },
  { id: 'dialog', title: 'Dialog' },
  { id: 'exercise', title: 'Latihan' },
  { id: 'recall', title: 'Recall' },
  { id: 'evaluation', title: 'Evaluasi' },
  { id: 'summary', title: 'Ringkasan' },
  { id: 'review', title: 'Rekomendasi review' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function activitiesOf(lesson: Lesson, type: LessonActivity['type']) {
  return (lesson.content?.activities ?? []).filter((a) => a.type === type);
}

function renderSection(id: SectionId, lesson: Lesson, prerequisiteTitles: string[]): ReactNode {
  const c = lesson.content;
  switch (id) {
    case 'objectives':
      return c?.objectives.length ? (
        <ul className="list-disc space-y-1 pl-5">{c.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
      ) : null;
    case 'prerequisites':
      return prerequisiteTitles.length ? (
        <ul className="list-disc space-y-1 pl-5">{prerequisiteTitles.map((t) => <li key={t}>{t}</li>)}</ul>
      ) : (
        <p>Tidak ada prasyarat.</p>
      );
    case 'explanation':
      return c?.explanation?.length ? c.explanation.map((p, i) => <p key={i}>{p}</p>) : null;
    case 'patterns':
      return c?.patterns?.length ? (
        <ul className="space-y-3">
          {c.patterns.map((p) => (
            <li key={p.pattern} className="rounded-lg bg-surface-muted p-3">
              <p className="font-mono text-sm text-fg">{p.pattern}</p>
              {p.meaning && <p className="mt-1 text-xs">{p.meaning}</p>}
              {p.examples?.map((e) => <p key={e} className="mt-1 text-sm italic text-fg">{e}</p>)}
            </li>
          ))}
        </ul>
      ) : null;
    case 'examples':
      return c?.examples?.length ? (
        <ul className="space-y-2">
          {c.examples.map((e) => (
            <li key={e.en}>
              <p className="text-fg">{e.en}</p>
              {e.id && <p className="text-xs">{e.id}</p>}
              {e.note && <p className="text-xs italic">{e.note}</p>}
            </li>
          ))}
        </ul>
      ) : null;
    case 'comparisons':
      return c?.comparisons?.length ? (
        <ul className="space-y-3">
          {c.comparisons.map((cmp) => (
            <li key={cmp.a.en + cmp.b.en} className="rounded-lg bg-surface-muted p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {[cmp.a, cmp.b].map((ex) => (
                  <div key={ex.en}>
                    <p className="font-medium text-fg">{ex.en}</p>
                    {ex.id && <p className="text-xs">{ex.id}</p>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs">{cmp.explanation}</p>
            </li>
          ))}
        </ul>
      ) : null;
    case 'mistakes':
      return c?.mistakes?.length ? (
        <ul className="space-y-3">
          {c.mistakes.map((m) => (
            <li key={m.wrong}>
              <p>
                <span className="text-danger line-through">{m.wrong}</span>
                {' → '}
                <span className="font-medium text-fg">{m.correct}</span>
              </p>
              <p className="text-xs">{m.reason}</p>
            </li>
          ))}
        </ul>
      ) : null;
    case 'summary':
      return c?.summary?.length ? (
        <ul className="list-disc space-y-1 pl-5">{c.summary.map((s) => <li key={s}>{s}</li>)}</ul>
      ) : null;
    case 'expressions':
      return c?.expressions?.length ? (
        <ul className="space-y-2">
          {c.expressions.map((e) => (
            <li key={e.phrase}>
              <p className="font-medium text-fg">{e.phrase}</p>
              {e.meaning && <p className="text-xs">{e.meaning}</p>}
            </li>
          ))}
        </ul>
      ) : null;
    case 'dialog':
      return c?.dialog?.lines.length ? (
        <div className="space-y-2">
          {c.dialog.lines.map((line, i) => (
            <p key={i}>
              <span className="font-medium text-fg">{line.speaker}:</span> {line.text}
            </p>
          ))}
        </div>
      ) : null;
    case 'exercise':
    case 'recall':
    case 'evaluation': {
      const items = activitiesOf(lesson, id);
      return items.length ? (
        <div className="space-y-3">
          {items.map((a) => <ExerciseContainer key={a.id} activity={a} />)}
        </div>
      ) : null;
    }
    case 'review':
      return c?.reviewRecommendation ? <p>{c.reviewRecommendation}</p> : null;
  }
}

export function LessonContent({ lesson, prerequisiteTitles }: { lesson: Lesson; prerequisiteTitles: string[] }) {
  return (
    <div className="space-y-3">
      {lesson.contentStatus === 'placeholder' && (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          Materi ini masih kerangka. Isi setiap bagian akan ditambahkan melalui prompt kurikulum terpisah.
        </p>
      )}
      {SECTIONS.map((section) => {
        const body = renderSection(section.id, lesson, prerequisiteTitles);
        return (
          <Card key={section.id} className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-fg">{section.title}</h2>
              {!body && <Badge>Belum tersedia</Badge>}
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-muted">
              {body ?? <p className="text-xs">Konten bagian ini belum ditambahkan.</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
