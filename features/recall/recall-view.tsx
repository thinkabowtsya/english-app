'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, Check, History, LoaderCircle, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, EmptyState, PageHeader, ProgressBar, Skeleton } from '@/components/ui/feedback';
import { RECALL_COUNTS, RECALL_SOURCES, scoreRecall, type RecallQuestion, type RecallSource } from '@/lib/recall';
import { playPronunciation } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { PracticeHistory } from '@/features/practice/practice-history';
import { PracticeSession } from '@/features/practice/practice-session';
import { RecallReview, RecallSessionList, percent, useRecallHistory } from './recall-history';

/**
 * Vocabulary Recall: soal dibuat AI dari kata Oxford 3000 & collocation yang sudah dipelajari.
 * Mode pilihan ganda disimpan di recall_sessions (juga tampil di Dashboard); mode ketik jawaban,
 * dikte, dan buat kalimat memakai mesin latihan bersama (practice_sessions). Semua mode menggeser
 * jadwal pengulangan kata yang dilatih.
 */

type Mode = 'choice' | 'vocab-type' | 'vocab-dictation' | 'vocab-write';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'choice', label: 'Pilihan ganda', hint: 'Pilih arti, kata yang pas, atau pasangan kata yang benar.' },
  { id: 'vocab-type', label: 'Ketik jawaban', hint: 'Lihat arti dan kalimat berlubang, lalu ketik kata/collocation-nya sendiri.' },
  { id: 'vocab-dictation', label: 'Dikte', hint: 'Dengarkan kalimat (suara natural), lalu ketik persis yang kamu dengar.' },
  { id: 'vocab-write', label: 'Buat kalimat', hint: 'Tulis kalimatmu sendiri memakai kata itu; AI menilai dan memperbaikinya.' },
];

type Phase =
  | { kind: 'setup' }
  | { kind: 'loading' }
  | { kind: 'quiz'; questions: RecallQuestion[]; index: number; learnedCount: number }
  | { kind: 'done'; questions: RecallQuestion[]; save: 'saving' | 'saved' | 'guest' | 'error' };

const TYPE_LABEL: Record<RecallQuestion['type'], string> = {
  meaning: 'Arti',
  fill: 'Isi kalimat',
  pair: 'Pasangan kata',
};

function pill(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    active ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:bg-surface-muted hover:text-fg',
  );
}

export function RecallView() {
  const [mode, setMode] = useState<Mode>('choice');
  // Sesi mode ketik/dikte/buat kalimat yang sedang berjalan (key baru = sesi baru).
  const [practiceKey, setPracticeKey] = useState<number | null>(null);
  const [practiceVersion, setPracticeVersion] = useState(0);
  const [source, setSource] = useState<RecallSource>('mix');
  const [count, setCount] = useState<number>(RECALL_COUNTS[0]);
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  const [error, setError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const { history, loading: historyLoading, error: historyError } = useRecallHistory(historyVersion);

  useEffect(() => {
    // Tautan dari Dashboard: /latihan/recall#sesi-<id> membuka sesi itu di riwayat.
    const match = window.location.hash.match(/^#sesi-([0-9a-f-]{36})$/i);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setOpenId(match[1]);
  }, []);

  useEffect(() => {
    if (openId && history) document.getElementById(`sesi-${openId}`)?.scrollIntoView({ behavior: 'smooth' });
  }, [openId, history]);

  const start = async () => {
    setError(null);
    setPhase({ kind: 'loading' });
    try {
      const res = await fetch('/api/recall/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, count }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(body?.questions)) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Gagal membuat soal. Coba lagi.');
      }
      setPhase({ kind: 'quiz', questions: body.questions, index: 0, learnedCount: body.learnedCount ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat soal. Coba lagi.');
      setPhase({ kind: 'setup' });
    }
  };

  const choose = (option: number) => {
    if (phase.kind !== 'quiz' || phase.questions[phase.index].chosen !== undefined) return;
    const questions = phase.questions.map((q, i) => (i === phase.index ? { ...q, chosen: option } : q));
    setPhase({ ...phase, questions });
  };

  const finish = async (questions: RecallQuestion[]) => {
    setPhase({ kind: 'done', questions, save: 'saving' });
    try {
      const res = await fetch('/api/recall/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, questions }),
      });
      setPhase({ kind: 'done', questions, save: res.ok ? 'saved' : res.status === 401 ? 'guest' : 'error' });
      if (res.ok) setHistoryVersion((v) => v + 1);
    } catch {
      setPhase({ kind: 'done', questions, save: 'error' });
    }
  };

  const next = () => {
    if (phase.kind !== 'quiz') return;
    if (phase.index < phase.questions.length - 1) setPhase({ ...phase, index: phase.index + 1 });
    else finish(phase.questions);
  };

  const totals = history?.totals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vocabulary Recall"
        description="Soal dibuat AI dari kata Oxford 3000 dan collocation yang sudah kamu tandai dipelajari. Hasil setiap sesi tersimpan di riwayat dan menggeser jadwal ulang kata."
      />

      {/* Ringkasan riwayat (pilihan ganda; mode lain menampilkan ringkasan di riwayatnya) */}
      {mode === 'choice' && (
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Soal dikerjakan', value: totals?.questions },
          { label: 'Sesi selesai', value: totals?.sessions },
          { label: 'Akurasi', value: totals ? `${percent(totals.correct, totals.questions)}%` : undefined },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            {historyLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="mt-1 text-xl font-semibold text-fg tabular-nums">{s.value ?? '–'}</p>
            )}
          </Card>
        ))}
      </div>
      )}

      {/* Setup / kuis / hasil */}
      {mode !== 'choice' && practiceKey !== null ? (
        <PracticeSession
          key={practiceKey}
          request={{ kind: mode, count, vocabSource: source }}
          onSaved={() => setPracticeVersion((v) => v + 1)}
          onRestart={() => setPracticeKey(Date.now())}
          onExit={() => setPracticeKey(null)}
        />
      ) : phase.kind === 'setup' || phase.kind === 'loading' ? (
        <Card>
          <CardHeader icon={<Brain className="h-4 w-4" />} title="Mulai sesi baru" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div role="radiogroup" aria-label="Mode latihan" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                      mode === m.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-fg hover:bg-surface-muted',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">{MODES.find((m) => m.id === mode)?.hint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted">Sumber:</span>
              {RECALL_SOURCES.map((s) => (
                <button key={s.id} type="button" aria-pressed={source === s.id} onClick={() => setSource(s.id)} className={pill(source === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted">Jumlah soal:</span>
              {RECALL_COUNTS.map((n) => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={pill(count === n)}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              Urutan soal: kata yang <Link href="/kosakata" className="text-accent hover:underline">jatuh tempo diulang</Link>{' '}
              → kata <Link href="/oxford" className="text-accent hover:underline">Oxford 3000</Link> &{' '}
              <Link href="/collocations" className="text-accent hover:underline">Collocation</Link> yang sudah dipelajari →
              kata yang belum dipelajari. Jawaban benar memperpanjang jadwal ulang; jawaban salah membuat kata diulang besok.
            </p>
            {error && <Alert tone="error">{error}</Alert>}
            <Button onClick={mode === 'choice' ? start : () => setPracticeKey(Date.now())} disabled={phase.kind === 'loading'}>
              {phase.kind === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {phase.kind === 'loading' ? 'AI sedang membuat soal...' : 'Buat soal'}
            </Button>
          </div>
        </Card>
      ) : phase.kind === 'quiz' ? (
        // key per soal: tombol opsi dibuat ulang agar warna benar/salah soal sebelumnya tidak ikut beranimasi.
        <QuizCard key={phase.index} phase={phase} onChoose={choose} onNext={next} />
      ) : (
        <Card className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted">Sesi selesai</p>
            <p className="mt-1 text-3xl font-semibold text-fg tabular-nums">
              {scoreRecall(phase.questions)} / {phase.questions.length}
            </p>
            <p className="mt-1 text-xs text-muted">
              {phase.save === 'saving' && 'Menyimpan ke riwayat...'}
              {phase.save === 'saved' && 'Tersimpan di riwayat.'}
              {phase.save === 'guest' && 'Login untuk menyimpan riwayat.'}
              {phase.save === 'error' && 'Riwayat tidak dapat disimpan. Pastikan migrasi recall_sessions sudah dijalankan.'}
            </p>
          </div>
          <RecallReview questions={phase.questions} />
          <div className="flex justify-center">
            <Button onClick={() => setPhase({ kind: 'setup' })}>
              <RotateCcw className="h-4 w-4" />
              Sesi baru
            </Button>
          </div>
        </Card>
      )}

      {/* Riwayat */}
      {mode !== 'choice' ? (
        <PracticeHistory
          kinds={[mode]}
          version={practiceVersion}
          title={`Riwayat ${MODES.find((m) => m.id === mode)?.label.toLowerCase()}`}
        />
      ) : (
      <section id="riwayat" className="scroll-mt-20">
        <Card className="p-0">
          <CardHeader
            icon={<History className="h-4 w-4" />}
            title="Riwayat"
            description="Buka sesi untuk melihat soal, jawabanmu, dan pembahasannya."
            className="mb-0 border-b border-line px-5 py-4"
          />
          {historyLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : historyError || history?.storage === 'unavailable' ? (
            <div className="p-4">
              <Alert tone="info">Riwayat tidak dapat dimuat. Pastikan migrasi recall_sessions sudah dijalankan di Supabase.</Alert>
            </div>
          ) : history?.storage === 'guest' ? (
            <div className="p-4">
              <Alert tone="info">Login untuk menyimpan dan melihat riwayat.</Alert>
            </div>
          ) : !history || history.sessions.length === 0 ? (
            <EmptyState title="Belum ada sesi" description="Selesaikan satu sesi dan hasilnya akan muncul di sini." className="m-4" />
          ) : (
            <RecallSessionList sessions={history.sessions} openId={openId} />
          )}
        </Card>
      </section>
      )}
    </div>
  );
}

function QuizCard({
  phase,
  onChoose,
  onNext,
}: {
  phase: Extract<Phase, { kind: 'quiz' }>;
  onChoose: (option: number) => void;
  onNext: () => void;
}) {
  const q = phase.questions[phase.index];
  const answered = q.chosen !== undefined;
  const last = phase.index === phase.questions.length - 1;
  // Kalimat lengkap (untuk didengarkan) = kalimat soal dengan jawaban benar.
  const fullSentence = q.sentence ? q.sentence.replace(/_{3,}/, q.options[q.answer]) : q.item;

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>
            Soal {phase.index + 1} dari {phase.questions.length} · {TYPE_LABEL[q.type]}
          </span>
          {q.due ? <span className="text-warning">Jatuh tempo diulang</span> : !q.learned && <span>Belum dipelajari</span>}
        </div>
        <ProgressBar value={((phase.index + (answered ? 1 : 0)) / phase.questions.length) * 100} label="Progres sesi" />
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium text-fg">{q.prompt}</p>
        {q.sentence && (
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-fg italic">{q.sentence}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer;
          const isChosen = i === q.chosen;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i)}
              disabled={answered}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition-colors',
                !answered && 'border-line bg-surface text-fg hover:bg-surface-muted',
                answered && isCorrect && 'border-success bg-success-soft font-medium text-success',
                answered && isChosen && !isCorrect && 'border-danger bg-danger-soft text-danger',
                answered && !isCorrect && !isChosen && 'border-line text-muted opacity-60',
              )}
            >
              <span>{opt}</span>
              {answered && isCorrect && <Check className="h-4 w-4 shrink-0" />}
              {answered && isChosen && !isCorrect && <X className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => playPronunciation(fullSentence)}
              aria-label="Dengarkan"
              title="Dengarkan"
              className="shrink-0 rounded-lg p-1.5 text-accent hover:bg-accent-soft"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-fg">{fullSentence}</p>
              {q.explanation && <p className="mt-0.5 text-xs text-muted">{q.explanation}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onNext}>{last ? 'Selesai & simpan' : 'Soal berikutnya →'}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
