'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  Copy,
  GraduationCap,
  History,
  LoaderCircle,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, PageHeader } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/modal';
import { speakText, stopSpeaking } from '@/lib/speech';
import { useAppData, useCloudState } from '@/lib/storage/hooks';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { COACH_LIMITS } from '@/lib/validation/coach';
import { toPlainText } from '@/services/ai/format';
import type { Difficulty } from '@/types/learning';
import { CoachApiError, sendCoachRequest } from '../ai-coach/api';
import {
  deleteTutorSession,
  listTutorSessions,
  loadTutorSession,
  saveTutorSession,
  type TutorHistoryItem,
} from './tutor-history';
import {
  appendTutorMessage,
  getTutorSession,
  replaceTutorSession,
  startNewTutorSession,
  useTutorSession,
  type TutorMessage,
} from './tutor-store';

/** Jumlah pesan terakhir yang dikirim sebagai konteks (server juga membatasi). */
const CONTEXT_MESSAGES = 20;

const QUESTION_TOPICS: { title: string; questions: string[] }[] = [
  {
    title: 'Grammar yang bikin bingung',
    questions: [
      'Kapan pakai present perfect ("I have done") dan kapan simple past ("I did")?',
      'Kenapa "I am agree" salah? Gimana yang benar?',
    ],
  },
  {
    title: 'Beda kata yang mirip',
    questions: ['Apa bedanya "make" dan "do"?', 'Bedanya "listen", "hear", dan "sound" apa?'],
  },
  {
    title: 'Dunia kerja & IT',
    questions: [
      'Gimana cara sopan bilang "saya belum selesai, butuh waktu 2 hari lagi" ke atasan?',
      'Frasa apa saja yang sering dipakai di daily stand-up meeting?',
    ],
  },
  {
    title: 'Biar terdengar natural',
    questions: [
      'Apakah "Please kindly check" itu natural? Ada yang lebih baik?',
      'Gimana cara belajar supaya bisa langsung mikir dalam bahasa Inggris, bukan menerjemahkan?',
    ],
  },
];

type HistoryState =
  | { kind: 'guest' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: TutorHistoryItem[] };

function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Tabel riwayat belum dibuat: migrasi tutor_sessions belum dijalankan di Supabase. */
function historyErrorMessage(e: unknown) {
  return /tutor_sessions/.test(errorText(e))
    ? 'Tabel riwayat belum dibuat. Jalankan migrasi supabase/migrations/20261016150000_tutor_sessions.sql di SQL Editor Supabase.'
    : 'Riwayat sesi belum dapat dimuat.';
}

export function TutorView() {
  const session = useTutorSession();
  const { messages } = session;
  const data = useAppData();
  const cloud = useCloudState();
  const userId = cloud.userId;
  const isGuest = userId === null && cloud.status === 'ready';
  const [difficultyOverride, setDifficulty] = useState<Difficulty | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [history, setHistory] = useState<HistoryState>({ kind: 'loading' });
  /** Aksi riwayat yang sedang berjalan: 'new' (simpan & sesi baru) atau id sesi yang dibuka/dihapus. */
  const [historyBusy, setHistoryBusy] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TutorHistoryItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const difficulty: Difficulty = difficultyOverride ?? data?.settings.coachDifficulty ?? 'intermediate';

  useEffect(() => () => abortRef.current?.abort(), []);

  // Gulir hanya area pesan (bukan seluruh halaman) ke pesan terbaru.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pending]);

  const refreshHistory = useCallback(async () => {
    try {
      const items = await listTutorSessions(getBrowserSupabase());
      setHistory({ kind: 'ready', items });
    } catch (e) {
      console.error('[tutor] history:', errorText(e));
      setHistory({ kind: 'error', message: historyErrorMessage(e) });
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    listTutorSessions(getBrowserSupabase())
      .then((items) => {
        if (active) setHistory({ kind: 'ready', items });
      })
      .catch((e: unknown) => {
        console.error('[tutor] history:', errorText(e));
        if (active) setHistory({ kind: 'error', message: historyErrorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const requestAnswer = async () => {
    const context = getTutorSession()
      .messages.slice(-CONTEXT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, COACH_LIMITS.messageChars) }));
    if (context.length === 0 || context[context.length - 1].role !== 'user') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    try {
      const res = await sendCoachRequest({ action: 'tutor', difficulty, messages: context }, controller.signal);
      appendTutorMessage({ role: 'assistant', content: res.reply, provider: res.provider });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof CoachApiError ? e.message : 'Terjadi kesalahan tak terduga.');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  };

  const ask = (text: string) => {
    const content = text.trim();
    if (!content || pending || historyBusy || content.length > COACH_LIMITS.messageChars) return;
    appendTutorMessage({ role: 'user', content });
    setDraft('');
    setSaveError(null);
    void requestAnswer();
  };

  const onSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    ask(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSubmit();
    }
  };

  /** Simpan sesi aktif ke Supabase (bila login & ada isinya). false bila gagal. */
  const saveCurrent = async (): Promise<boolean> => {
    const current = getTutorSession();
    if (!userId || current.messages.length === 0) return true;
    try {
      await saveTutorSession(getBrowserSupabase(), current, difficulty);
      return true;
    } catch (e) {
      console.error('[tutor] save:', errorText(e));
      setSaveError(
        /tutor_sessions/.test(errorText(e))
          ? `${historyErrorMessage(e)} Percakapan tidak dihapus.`
          : 'Sesi belum tersimpan ke riwayat (periksa koneksi). Percakapan tidak dihapus — coba lagi.',
      );
      return false;
    }
  };

  const stopActivity = () => {
    abortRef.current?.abort();
    stopSpeaking();
    setSaveError(null);
  };

  const startNew = async () => {
    stopActivity();
    setHistoryBusy('new');
    const saved = await saveCurrent();
    setHistoryBusy(null);
    if (!saved) return;
    startNewTutorSession();
    setError(null);
    if (userId) void refreshHistory();
    inputRef.current?.focus();
  };

  const openSession = async (id: string) => {
    if (historyBusy || id === session.sessionId) return;
    stopActivity();
    setHistoryBusy(id);
    try {
      // Sesi yang sedang terbuka disimpan dulu agar tidak hilang.
      if (!(await saveCurrent())) return;
      replaceTutorSession(await loadTutorSession(getBrowserSupabase(), id));
      setError(null);
      void refreshHistory();
    } catch (e) {
      console.error('[tutor] open:', errorText(e));
      setSaveError('Sesi dari riwayat belum dapat dibuka. Coba lagi.');
    } finally {
      setHistoryBusy(null);
    }
  };

  const removeSession = async (item: TutorHistoryItem) => {
    setHistoryBusy(item.id);
    try {
      await deleteTutorSession(getBrowserSupabase(), item.id);
      setHistory((h) => (h.kind === 'ready' ? { ...h, items: h.items.filter((i) => i.id !== item.id) } : h));
    } catch (e) {
      console.error('[tutor] delete:', errorText(e));
      setSaveError('Sesi belum dapat dihapus dari riwayat. Coba lagi.');
    } finally {
      setHistoryBusy(null);
    }
  };

  const tooLong = draft.length > COACH_LIMITS.messageChars;
  // Mis. halaman dimuat ulang saat menunggu jawaban: tawarkan untuk meminta jawaban lagi.
  const awaitingAnswer = messages.at(-1)?.role === 'user' && !pending && error === null;

  const historyState: HistoryState = isGuest ? { kind: 'guest' } : userId ? history : { kind: 'loading' };
  const historyCard = (
    <HistoryCard
      state={historyState}
      activeId={session.sessionId}
      busyId={historyBusy}
      onOpen={(id) => void openSession(id)}
      onDelete={setDeleteTarget}
      onRetry={() => {
        setHistory({ kind: 'loading' });
        void refreshHistory();
      }}
    />
  );

  return (
    <div>
      <PageHeader
        title="Tanya Tutor"
        description="Tanya apa saja soal bahasa Inggris — grammar, kosakata, cara bilang sesuatu, sampai persiapan interview. Tutor menjelaskan alasannya dan cara memakainya di dunia nyata."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_17rem]">
        <Card className="flex h-[70vh] min-h-[26rem] flex-col p-0 lg:h-[calc(100vh-11rem)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <GraduationCap className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">English Tutor</p>
                <p className="truncate text-xs text-muted">Paham konsepnya, bukan sekadar hafal kalimat</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmNew(true)}
              disabled={messages.length === 0 || historyBusy !== null}
            >
              {historyBusy === 'new' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Sesi baru</span>
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <Welcome onPick={ask} />
            ) : (
              messages.map((m) => <TutorBubble key={m.id} message={m} />)
            )}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Tutor sedang menyiapkan penjelasan…
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-2 border-t border-line p-3">
            {saveError && <Alert tone="error">{saveError}</Alert>}
            {error && (
              <Alert
                tone="error"
                action={
                  <Button size="sm" variant="secondary" onClick={() => void requestAnswer()} disabled={pending}>
                    Coba lagi
                  </Button>
                }
              >
                {error}
              </Alert>
            )}
            {awaitingAnswer && (
              <Alert
                tone="info"
                action={
                  <Button size="sm" variant="secondary" onClick={() => void requestAnswer()}>
                    Minta jawaban
                  </Button>
                }
              >
                Pertanyaan terakhir belum dijawab.
              </Alert>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="tutor-input" className="sr-only">
                Pertanyaan untuk tutor
              </label>
              <textarea
                id="tutor-input"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tanya apa saja, mis. “Bedanya ‘since’ dan ‘for’ apa?”"
                rows={2}
                aria-invalid={tooLong}
                className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-danger"
              />
              <Button
                type="submit"
                aria-label="Kirim pertanyaan"
                disabled={!draft.trim() || pending || historyBusy !== null || tooLong}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className={cn('text-right text-[11px] tabular-nums', tooLong ? 'text-danger' : 'text-muted')}>
              {tooLong ? 'Pesan terlalu panjang · ' : 'Enter untuk kirim, Shift+Enter baris baru · '}
              {draft.length}/{COACH_LIMITS.messageChars}
            </p>
          </form>
        </Card>

        <aside className="order-first space-y-4 lg:order-none">
          <Card>
            <CardHeader title="Level penjelasan" />
            <label htmlFor="tutor-difficulty" className="sr-only">
              Level penjelasan
            </label>
            <select
              id="tutor-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            >
              <option value="beginner">Beginner (A1–A2)</option>
              <option value="intermediate">Intermediate (B1–B2)</option>
              <option value="advanced">Advanced (C1)</option>
            </select>
          </Card>

          <Card className="hidden lg:block">
            <CardHeader title="Cara belajar dengan tutor" />
            <ul className="space-y-2 text-xs text-muted">
              <li>- Tanyakan “kenapa”, bukan cuma “apa artinya”.</li>
              <li>- Kirim kalimatmu sendiri untuk dicek, lalu minta versi yang lebih natural.</li>
              <li>- Kerjakan latihan kecil di akhir jawaban — balas langsung di chat untuk dinilai.</li>
              <li>- Ceritakan situasinya (meeting, email, interview) agar contohnya pas.</li>
            </ul>
          </Card>

          <div className="hidden lg:block">{historyCard}</div>
        </aside>
      </div>

      <div className="mt-4 lg:hidden">{historyCard}</div>

      <ConfirmDialog
        open={confirmNew}
        title="Mulai sesi baru?"
        description={
          userId
            ? 'Sesi ini akan disimpan ke Riwayat sesi, lalu chat dikosongkan. Kamu bisa membukanya lagi kapan saja.'
            : 'Kamu belum login, jadi sesi ini tidak disimpan dan akan dihapus. Login untuk menyimpan riwayat.'
        }
        confirmLabel={userId ? 'Simpan & mulai baru' : 'Mulai baru'}
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          void startNew();
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus sesi dari riwayat?"
        description={deleteTarget ? `“${deleteTarget.title}” akan dihapus permanen dari riwayat.` : ''}
        confirmLabel="Hapus"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void removeSession(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function Welcome({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-2">
      <div className="text-center">
        <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <GraduationCap className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-fg">Hai! Saya tutor bahasa Inggrismu.</p>
        <p className="mt-1 text-xs text-muted">
          Tanya apa saja. Saya akan jelaskan logikanya, kapan dipakai di dunia nyata, kesalahan yang sering terjadi, lalu
          kasih latihan kecil supaya kamu langsung bisa memakainya.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUESTION_TOPICS.map((topic) => (
          <div key={topic.title} className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted">{topic.title}</p>
            {topic.questions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onPick(q)}
                className="block w-full rounded-lg border border-line px-3 py-2 text-left text-xs text-fg hover:bg-surface-muted"
              >
                {q}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TutorBubble({ message }: { message: TutorMessage }) {
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const text = toPlainText(message.content);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakText(text, () => setSpeaking(false), 'en-US');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard diblokir: abaikan.
    }
  };

  const toolButton =
    'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-surface-muted hover:text-fg';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[90%] space-y-1.5 sm:max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isUser ? 'rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md bg-surface-muted text-fg',
          )}
        >
          {text}
        </div>
        {!isUser && (
          <div className="flex flex-wrap items-center gap-1">
            {message.provider === 'mock' && <Badge tone="warning">Mock</Badge>}
            <button type="button" onClick={toggleSpeak} className={cn(toolButton, speaking && 'text-accent')}>
              {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {speaking ? 'Stop' : 'Dengarkan'}
            </button>
            <button type="button" onClick={() => void copy()} className={toolButton}>
              <Copy className="h-3 w-3" />
              {copied ? 'Tersalin' : 'Salin'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function HistoryCard({
  state,
  activeId,
  busyId,
  onOpen,
  onDelete,
  onRetry,
}: {
  state: HistoryState;
  activeId: string;
  busyId: string | null;
  onOpen: (id: string) => void;
  onDelete: (item: TutorHistoryItem) => void;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader title="Riwayat sesi" />
      {state.kind === 'guest' ? (
        <p className="text-xs text-muted">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Login
          </Link>{' '}
          untuk menyimpan setiap sesi ke cloud dan membukanya lagi nanti.
        </p>
      ) : state.kind === 'loading' ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Memuat riwayat…
        </p>
      ) : state.kind === 'error' ? (
        <div className="space-y-2">
          <p className="text-xs text-danger">{state.message}</p>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </Button>
        </div>
      ) : state.items.length === 0 ? (
        <p className="text-xs text-muted">Belum ada sesi tersimpan. Sesi disimpan otomatis saat kamu menekan “Sesi baru”.</p>
      ) : (
        <ul className="-mx-2 max-h-72 space-y-0.5 overflow-y-auto">
          {state.items.map((item) => {
            const active = item.id === activeId;
            const busy = busyId === item.id;
            return (
              <li key={item.id} className="group flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  disabled={busyId !== null || active}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left disabled:cursor-default',
                    active ? 'bg-accent-soft' : 'hover:bg-surface-muted',
                  )}
                >
                  {busy ? (
                    <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-hidden />
                  ) : (
                    <History
                      className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active ? 'text-accent' : 'text-muted')}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0">
                    <span className={cn('line-clamp-2 text-xs', active ? 'font-medium text-accent' : 'text-fg')}>
                      {item.title}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {dateFormatter.format(item.endedAt)} · {item.messageCount} pesan
                      {active && ' · sedang dibuka'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  disabled={busyId !== null}
                  aria-label={`Hapus sesi ${item.title}`}
                  className="mt-1 rounded-md p-1 text-muted opacity-60 hover:bg-surface-muted hover:text-danger group-hover:opacity-100 disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
