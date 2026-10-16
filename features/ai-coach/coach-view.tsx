'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, BookmarkPlus, Bot, Lightbulb, LoaderCircle, MessageSquarePlus, Mic, PhoneCall, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, Badge, EmptyState, PageHeader } from '@/components/ui/feedback';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { addReview } from '@/lib/storage/actions';
import { useAppData } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';
import { COACH_LIMITS } from '@/lib/validation/coach';
import type { CoachMode, CoachStatus } from '@/types/ai';
import type { Difficulty } from '@/types/learning';
import { CoachApiError, fetchCoachStatus, sendCoachRequest } from './api';
import {
  appendMessage,
  clearConversation,
  getChatState,
  setMode,
  setScenario,
  useChatState,
  type ChatMessage,
} from './chat-store';
import { COACH_MODES, SCENARIO_SUGGESTIONS, getModeInfo } from './coach-modes';

/** Jumlah pesan terakhir yang dikirim sebagai konteks (server juga membatasi). */
const CONTEXT_MESSAGES = 20;

type StatusState = { kind: 'loading' } | { kind: 'ready'; status: CoachStatus } | { kind: 'error' };
type Pending = { kind: 'reply' } | { kind: 'explain'; messageId: string } | null;

export function CoachView() {
  const chat = useChatState();
  const data = useAppData();
  const [status, setStatus] = useState<StatusState>({ kind: 'loading' });
  const [difficultyOverride, setDifficulty] = useState<Difficulty | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [pendingMode, setPendingMode] = useState<CoachMode | null>(null);
  const [saveTarget, setSaveTarget] = useState<{ phrase: string } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const difficulty: Difficulty = difficultyOverride ?? data?.settings.coachDifficulty ?? 'intermediate';
  const modeInfo = getModeInfo(chat.mode);
  const isMock = status.kind === 'ready' && status.status.provider === 'mock';

  useEffect(() => {
    const controller = new AbortController();
    fetchCoachStatus(controller.signal)
      .then((s) => setStatus({ kind: 'ready', status: s }))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setStatus({ kind: 'error' });
      });
    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, []);

  // Gulir hanya area pesan (bukan seluruh halaman) ke pesan terbaru.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, pending]);

  const run = async (kind: Pending, request: Parameters<typeof sendCoachRequest>[0], onSuccess: (reply: string, provider: CoachStatus['provider']) => void, retry: () => void) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(kind);
    setError(null);
    try {
      const res = await sendCoachRequest(request, controller.signal);
      onSuccess(res.reply, res.provider);
      setStatus({ kind: 'ready', status: { provider: res.provider, model: res.model } });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError({ message: e instanceof CoachApiError ? e.message : 'Terjadi kesalahan tak terduga.', retry });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(null);
      }
    }
  };

  const requestReply = () => {
    const { messages, mode, scenario } = getChatState();
    const context = messages
      .filter((m) => m.kind === 'message')
      .slice(-CONTEXT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, COACH_LIMITS.messageChars) }));
    if (context.length === 0 || context[context.length - 1].role !== 'user') return;
    void run(
      { kind: 'reply' },
      {
        action: 'reply',
        mode,
        difficulty,
        scenario: mode === 'role-play' && scenario.trim() ? scenario.trim() : undefined,
        messages: context,
      },
      (reply, provider) => appendMessage({ role: 'assistant', kind: 'message', content: reply, provider }),
      requestReply,
    );
  };

  const explain = (message: ChatMessage) => {
    void run(
      { kind: 'explain', messageId: message.id },
      { action: 'explain', difficulty, target: message.content.slice(0, COACH_LIMITS.messageChars) },
      (reply, provider) => appendMessage({ role: 'assistant', kind: 'explanation', content: reply, provider }),
      () => explain(message),
    );
  };

  const onSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || pending || content.length > COACH_LIMITS.messageChars) return;
    appendMessage({ role: 'user', kind: 'message', content });
    setDraft('');
    setSavedNotice(null);
    requestReply();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSubmit();
    }
  };

  const changeMode = (mode: CoachMode) => {
    if (mode === chat.mode) return;
    if (chat.messages.length > 0) setPendingMode(mode);
    else setMode(mode);
  };

  const startNew = () => {
    abortRef.current?.abort();
    clearConversation();
    setError(null);
    setSavedNotice(null);
  };

  const tooLong = draft.length > COACH_LIMITS.messageChars;
  const lastConversation = chat.messages.filter((m) => m.kind === 'message').at(-1);
  // Mis. halaman dimuat ulang saat menunggu balasan: tawarkan untuk meminta balasan lagi.
  const awaitingReply = lastConversation?.role === 'user' && pending === null && error === null;

  return (
    <div>
      <PageHeader
        title="Percakapan AI"
        description="AI English Coach. Tulis dalam bahasa Indonesia atau Inggris."
        action={<ProviderBadge status={status} />}
      />

      {isMock && (
        <Alert tone="warning" title="Mode mock — AI belum terhubung" className="mb-4">
          Balasan di bawah adalah contoh statis untuk pengembangan antarmuka, bukan jawaban AI. Isi{' '}
          <code className="text-fg">GROQ_API_KEY</code> di <code className="text-fg">.env.local</code> lalu restart server
          untuk memakai Groq.
        </Alert>
      )}
      {status.kind === 'error' && (
        <Alert tone="error" className="mb-4">
          Status layanan AI tidak dapat dimuat. Kamu tetap bisa mencoba mengirim pesan.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        <Card className="flex h-[70vh] min-h-[26rem] flex-col p-0 lg:h-[calc(100vh-11rem)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{modeInfo.title}</p>
              <p className="truncate text-xs text-muted">
                {chat.mode === 'role-play' && chat.scenario ? chat.scenario : modeInfo.description}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => (chat.messages.length > 0 ? setConfirmNew(true) : undefined)}
              disabled={chat.messages.length === 0}
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Percakapan baru</span>
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {chat.messages.length === 0 ? (
              <EmptyState
                icon={<Bot className="h-6 w-6" />}
                title={`Mulai ${modeInfo.title}`}
                description="Coba salah satu contoh berikut atau tulis pesanmu sendiri."
                action={
                  <div className="flex flex-col gap-2">
                    {modeInfo.examples.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setDraft(ex)}
                        className="rounded-lg border border-line px-3 py-2 text-left text-xs text-fg hover:bg-surface-muted"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                }
              />
            ) : (
              chat.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  busy={pending !== null}
                  explaining={pending?.kind === 'explain' && pending.messageId === m.id}
                  onExplain={() => explain(m)}
                  onSave={(selection) => setSaveTarget({ phrase: selection })}
                />
              ))
            )}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                {pending.kind === 'explain' ? 'AI sedang menyiapkan penjelasan grammar…' : 'AI sedang berpikir…'}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-2 border-t border-line p-3">
            {error && (
              <Alert
                tone="error"
                action={
                  <Button size="sm" variant="secondary" onClick={error.retry} disabled={pending !== null}>
                    Coba lagi
                  </Button>
                }
              >
                {error.message}
              </Alert>
            )}
            {awaitingReply && (
              <Alert
                tone="info"
                action={
                  <Button size="sm" variant="secondary" onClick={requestReply}>
                    Minta balasan
                  </Button>
                }
              >
                Pesan terakhir belum mendapat balasan.
              </Alert>
            )}
            {savedNotice && (
              <Alert tone="success">
                {savedNotice}{' '}
                <Link href="/latihan#review" className="font-medium text-accent hover:underline">
                  Lihat daftar review
                </Link>
              </Alert>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="coach-input" className="sr-only">
                Pesan untuk AI Coach
              </label>
              <textarea
                id="coach-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={modeInfo.placeholder}
                rows={2}
                aria-invalid={tooLong}
                className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-danger"
              />
              <Button type="submit" aria-label="Kirim pesan" disabled={!draft.trim() || pending !== null || tooLong}>
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
            <CardHeader title="Mode" />
            <div role="radiogroup" aria-label="Mode percakapan" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {COACH_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={chat.mode === m.id}
                  onClick={() => changeMode(m.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-colors',
                    chat.mode === m.id ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-muted',
                  )}
                >
                  <span className={cn('block text-sm font-medium', chat.mode === m.id ? 'text-accent' : 'text-fg')}>
                    {m.title}
                  </span>
                  <span className="hidden text-[11px] text-muted lg:block">{m.description}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Pengaturan percakapan" />
            <label htmlFor="coach-difficulty" className="mb-1.5 block text-xs font-medium text-muted">
              Tingkat kesulitan
            </label>
            <select
              id="coach-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            >
              <option value="beginner">Beginner (A1–A2)</option>
              <option value="intermediate">Intermediate (B1–B2)</option>
              <option value="advanced">Advanced (C1)</option>
            </select>
            {chat.mode === 'role-play' && (
              <div className="mt-4">
                <label htmlFor="coach-scenario" className="mb-1.5 block text-xs font-medium text-muted">
                  Skenario role-play
                </label>
                <input
                  id="coach-scenario"
                  value={chat.scenario}
                  maxLength={COACH_LIMITS.scenarioChars}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Default: interview software developer"
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SCENARIO_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScenario(s)}
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:bg-surface-muted hover:text-fg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="hidden lg:block">
            <CardHeader title="Latihan suara (fitur lama)" description="Belum tercatat di progres." />
            <div className="space-y-1">
              <LegacyLink href="/call" icon={<PhoneCall className="h-4 w-4" />} label="Panggilan suara AI" />
              <LegacyLink href="/practice" icon={<Mic className="h-4 w-4" />} label="Studio role-play skenario" />
            </div>
          </Card>
        </aside>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:hidden">
        <LegacyLink href="/call" icon={<PhoneCall className="h-4 w-4" />} label="Panggilan suara AI (fitur lama)" />
        <LegacyLink href="/practice" icon={<Mic className="h-4 w-4" />} label="Studio role-play (fitur lama)" />
      </div>

      <ConfirmDialog
        open={confirmNew}
        title="Mulai percakapan baru?"
        description="Riwayat percakapan saat ini akan dihapus. Frasa yang sudah disimpan ke daftar review tetap ada."
        confirmLabel="Mulai baru"
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          startNew();
        }}
      />
      <ConfirmDialog
        open={pendingMode !== null}
        title="Ganti mode?"
        description="Mengganti mode akan memulai percakapan baru dan menghapus riwayat saat ini."
        confirmLabel="Ganti mode"
        onCancel={() => setPendingMode(null)}
        onConfirm={() => {
          if (pendingMode) {
            startNew();
            setMode(pendingMode);
          }
          setPendingMode(null);
        }}
      />
      <SavePhraseDialog
        target={saveTarget}
        onClose={() => setSaveTarget(null)}
        onSaved={(label) => {
          setSaveTarget(null);
          setSavedNotice(`"${label}" disimpan ke daftar review.`);
        }}
      />
    </div>
  );
}

function ProviderBadge({ status }: { status: StatusState }) {
  if (status.kind === 'loading') return <Badge>Memeriksa layanan AI…</Badge>;
  if (status.kind === 'error') return <Badge tone="danger">Status AI tidak diketahui</Badge>;
  return status.status.provider === 'groq' ? (
    <Badge tone="success">Groq · {status.status.model}</Badge>
  ) : (
    <Badge tone="warning">Mock response</Badge>
  );
}

function MessageBubble({
  message,
  busy,
  explaining,
  onExplain,
  onSave,
}: {
  message: ChatMessage;
  busy: boolean;
  explaining: boolean;
  onExplain: () => void;
  onSave: (selection: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isUser = message.role === 'user';

  // Ambil teks yang sedang diseleksi di dalam pesan ini (sebelum klik menghapus seleksi).
  const captureSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    const inside = selection?.anchorNode ? ref.current?.contains(selection.anchorNode) : false;
    return inside && text.length <= 300 ? text : '';
  };

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] space-y-1.5', isUser && 'items-end')}>
        <div
          ref={ref}
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isUser ? 'rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md bg-surface-muted text-fg',
            message.kind === 'explanation' && 'border border-line bg-surface',
          )}
        >
          {message.kind === 'explanation' && (
            <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-accent">
              <Lightbulb className="h-3 w-3" aria-hidden />
              Penjelasan grammar
            </span>
          )}
          <FormattedText text={message.content} />
        </div>
        <div className={cn('flex flex-wrap items-center gap-1', isUser && 'justify-end')}>
          {message.provider === 'mock' && <Badge tone="warning">Mock</Badge>}
          <button
            type="button"
            onClick={onExplain}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-surface-muted hover:text-fg disabled:opacity-50"
          >
            {explaining ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Lightbulb className="h-3 w-3" />}
            Jelaskan grammar
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSave(captureSelection())}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-surface-muted hover:text-fg"
          >
            <BookmarkPlus className="h-3 w-3" />
            Simpan frasa
          </button>
        </div>
      </div>
    </div>
  );
}

/** Menampilkan teks biasa; hanya **tebal** dari model yang dirender (tanpa HTML mentah). */
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part))}
    </>
  );
}

function SavePhraseDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { phrase: string } | null;
  onClose: () => void;
  onSaved: (label: string) => void;
}) {
  return (
    <Modal open={target !== null} onClose={onClose} title="Simpan frasa ke daftar review">
      {target && <SavePhraseForm key={target.phrase} initial={target.phrase} onCancel={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function SavePhraseForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: string;
  onCancel: () => void;
  onSaved: (label: string) => void;
}) {
  const [phrase, setPhrase] = useState(initial);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const label = phrase.trim();
    if (!label) return setError('Frasa wajib diisi.');
    if (label.length > 300) return setError('Frasa maksimal 300 karakter.');
    if (note.length > 500) return setError('Catatan maksimal 500 karakter.');
    const added = addReview({
      kind: 'phrase',
      label,
      note: note.trim() || null,
      reason: 'Disimpan dari AI Coach',
      lessonId: null,
      source: 'ai-coach',
      nextReviewAt: null,
    });
    if (!added) return setError('Frasa ini sudah ada di daftar review.');
    onSaved(label);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs">Tip: seleksi teks di pesan sebelum menekan “Simpan frasa” untuk mengisi otomatis.</p>
      <div>
        <label htmlFor="phrase" className="mb-1 block text-xs font-medium">
          Frasa
        </label>
        <input
          id="phrase"
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value);
            setError(null);
          }}
          maxLength={300}
          autoFocus
          className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg"
        />
      </div>
      <div>
        <label htmlFor="phrase-note" className="mb-1 block text-xs font-medium">
          Arti / catatan (opsional)
        </label>
        <textarea
          id="phrase-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}

function LegacyLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-fg hover:bg-surface-muted"
    >
      <span className="text-accent">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
