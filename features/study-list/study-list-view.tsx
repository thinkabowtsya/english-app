'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookCheck, Check, ChevronDown, CircleX, LoaderCircle, Search, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, EmptyState, PageHeader, ProgressBar } from '@/components/ui/feedback';
import type { StudyDetail, StudyStorage } from '@/lib/study-list';
import { playPronunciation } from '@/lib/speech';
import { cn } from '@/lib/utils';

/**
 * Tampilan bersama menu daftar belajar (Oxford 3000, Collocation): kartu grup dengan progres,
 * pencarian, filter belajar, daftar yang bisa dibuka untuk melihat detail (dibuat AI lewat
 * `${apiBase}/detail`), suara, dan tombol "sudah dipelajari" (`${apiBase}` GET/PATCH).
 */

export interface StudyGroup {
  id: string;
  label: string;
  /** Keterangan singkat di bawah kartu grup aktif. */
  info: string;
}

export interface StudyItem {
  /** Kunci yang dikirim ke API dan disimpan di Supabase. */
  key: string;
  group: string;
  /** Teks kecil di samping judul (mis. IPA, level). */
  tag?: string;
  /** Baris kedua (mis. jenis kata, arti singkat). */
  sub?: string;
}

export interface StudyListViewProps {
  title: string;
  description: string;
  groups: StudyGroup[];
  items: StudyItem[];
  apiBase: string;
  /** Kunci localStorage untuk grup terakhir yang dipilih. */
  groupStorageKey: string;
  /** Tabel Supabase, untuk pesan bila migrasi belum dijalankan. */
  table: string;
  /** Satuan item, mis. "kata" atau "collocation". */
  unit: string;
  similarLabel: string;
  groupGridClassName: string;
}

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'todo', label: 'Belum dipelajari' },
  { id: 'learned', label: 'Sudah dipelajari' },
] as const;

type Filter = typeof FILTERS[number]['id'];
type DetailState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; detail: StudyDetail };

/** Daftar panjang ditampilkan bertahap agar ringan di ponsel. */
const PAGE_SIZE = 100;

function SpeakButton({ text, audioUrl, label, small }: { text: string; audioUrl?: string; label: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        playPronunciation(text, audioUrl);
      }}
      aria-label={label}
      title={label}
      className={cn(
        'shrink-0 rounded-lg text-accent transition-colors hover:bg-accent-soft',
        small ? 'p-1' : 'p-2',
      )}
    >
      <Volume2 className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </button>
  );
}

export function StudyListView({
  title,
  description,
  groups,
  items,
  apiBase,
  groupStorageKey,
  table,
  unit,
  similarLabel,
  groupGridClassName,
}: StudyListViewProps) {
  const [group, setGroup] = useState(groups[0].id);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [storage, setStorage] = useState<StudyStorage | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const groupOf = useMemo(() => new Map(items.map((i) => [i.key.toLowerCase(), i])), [items]);

  useEffect(() => {
    // Grup terakhir (kenyamanan per browser saja). Dibaca setelah mount agar render server & klien sama.
    try {
      const saved = window.localStorage.getItem(groupStorageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && groups.some((g) => g.id === saved)) setGroup(saved);
    } catch {
      // Storage diblokir: pakai grup pertama.
    }
  }, [groupStorageKey, groups]);

  const chooseGroup = (next: string) => {
    setGroup(next);
    setLimit(PAGE_SIZE);
    try {
      window.localStorage.setItem(groupStorageKey, next);
    } catch {
      // Storage diblokir: pilihan hanya berlaku sampai halaman ditutup.
    }
  };

  const counts = useMemo(() => {
    const result: Record<string, { total: number; learned: number }> = {};
    for (const g of groups) result[g.id] = { total: 0, learned: 0 };
    for (const i of items) {
      result[i.group].total += 1;
      if (learned.has(i.key)) result[i.group].learned += 1;
    }
    return result;
  }, [groups, items, learned]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiBase, { signal: controller.signal })
      .then((res) => res.json())
      .then((body) => {
        setLearned(new Set(Array.isArray(body?.learned) ? body.learned : []));
        setStorage(body?.storage ?? 'unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStorage('unavailable');
      });
    return () => controller.abort();
  }, [apiBase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (i.group !== group) return false;
      if (q && !i.key.toLowerCase().includes(q) && !i.sub?.toLowerCase().includes(q)) return false;
      if (filter === 'todo') return !learned.has(i.key);
      if (filter === 'learned') return learned.has(i.key);
      return true;
    });
  }, [items, group, query, filter, learned]);

  const loadDetail = (key: string) => {
    setDetails((d) => ({ ...d, [key]: { status: 'loading' } }));
    fetch(`${apiBase}/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: key }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.detail) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Gagal memuat penjelasan. Coba lagi.');
        }
        setDetails((d) => ({ ...d, [key]: { status: 'ok', detail: body.detail } }));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Gagal memuat penjelasan. Coba lagi.';
        setDetails((d) => ({ ...d, [key]: { status: 'error', message } }));
      });
  };

  const toggleOpen = (key: string) => {
    const next = open === key ? null : key;
    setOpen(next);
    setSaveError(null);
    if (next && (!details[next] || details[next].status === 'error')) loadDetail(next);
  };

  /** Buka item lain dari daftar (mis. dari bagian "serupa"), pindah grup bila perlu. */
  const jumpTo = (target: StudyItem) => {
    if (target.group !== group) chooseGroup(target.group);
    setQuery(target.key);
    setFilter('all');
    if (open !== target.key) toggleOpen(target.key);
  };

  const toggleLearned = async (key: string) => {
    const value = !learned.has(key);
    const apply = (on: boolean) =>
      setLearned((prev) => {
        const next = new Set(prev);
        if (on) next.add(key);
        else next.delete(key);
        return next;
      });
    apply(value);
    setSaving(key);
    setSaveError(null);
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: key, learned: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === 'string' ? body.error : 'Gagal menyimpan. Coba lagi.');
      }
    } catch (err) {
      apply(!value);
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan. Coba lagi.');
    } finally {
      setSaving(null);
    }
  };

  const activeGroup = groups.find((g) => g.id === group) ?? groups[0];
  const { total, learned: learnedCount } = counts[activeGroup.id];
  const canSave = storage === 'saved';
  const storageNotice =
    storage === 'guest'
      ? 'Kamu belum login, jadi tanda "sudah dipelajari" tidak bisa disimpan.'
      : storage === 'unavailable'
        ? `Progres tidak dapat dimuat. Pastikan migrasi ${table} sudah dijalankan di Supabase.`
        : null;

  /** Chip frasa/kata: klik untuk mendengar; bila kata ada di daftar ini, tombol kecil untuk membukanya. */
  const renderChip = (text: string) => {
    const target = groupOf.get(text.toLowerCase());
    return (
      <li key={text} className="inline-flex items-center rounded-full border border-line bg-surface text-xs">
        <button
          type="button"
          onClick={() => playPronunciation(text)}
          className="inline-flex items-center gap-1 rounded-full py-1 pr-2 pl-2.5 text-fg hover:bg-surface-muted"
          aria-label={`Ucapkan ${text}`}
          title="Dengarkan"
        >
          <Volume2 className="h-3 w-3 text-accent" aria-hidden />
          {text}
        </button>
        {target && (
          <button
            type="button"
            onClick={() => jumpTo(target)}
            className="mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft"
            title="Buka di daftar"
          >
            buka
          </button>
        )}
      </li>
    );
  };

  /** Kata serupa & collocation dari Datamuse (bukan AI) — hanya untuk detail yang sudah memilikinya. */
  const renderLinks = (detail: StudyDetail) => {
    const links = detail.links;
    if (!links) return null;
    const aiWords = new Set(detail.similar.map((s) => s.word.toLowerCase()));
    const similar = links.similar.filter((w) => !aiWords.has(w));
    if (similar.length === 0 && links.collocations.length === 0) return null;
    return (
      <div className="space-y-3 rounded-lg border border-line px-3 py-2.5">
        {links.collocations.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
              Sering dipakai bersama · {g.label}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {g.phrases.map(renderChip)}
            </ul>
          </div>
        ))}
        {similar.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Kata serupa lainnya</p>
            <ul className="flex flex-wrap gap-1.5">
              {similar.map(renderChip)}
            </ul>
          </div>
        )}
        <p className="text-[10px] text-muted">
          Sumber: Datamuse (data pemakaian bahasa Inggris nyata). Belum tentu cocok untuk semua konteks — cek contoh di atas.
        </p>
      </div>
    );
  };

  const renderDetail = (item: StudyItem) => {
    const state = details[item.key];
    if (!state || state.status === 'loading') {
      return (
        <p className="flex items-center gap-2 text-xs text-muted" role="status">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Menyiapkan arti, contoh, dan {similarLabel.toLowerCase()}...
        </p>
      );
    }
    if (state.status === 'error') {
      return (
        <Alert
          tone="error"
          action={
            <Button size="sm" variant="secondary" onClick={() => loadDetail(item.key)}>
              Coba lagi
            </Button>
          }
        >
          {state.message}
        </Alert>
      );
    }
    const { detail } = state;
    const isLearned = learned.has(item.key);
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-fg">{detail.meaningId}</p>
          <p className="mt-0.5 text-xs text-muted">{detail.definitionEn}</p>
        </div>

        {detail.mistake && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm">
            <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            <p className="min-w-0">
              <span className="text-danger line-through">{detail.mistake.wrong}</span>
              <span className="mx-1.5 text-muted">→</span>
              <span className="font-medium text-fg">{item.key}</span>
              {detail.mistake.note && <span className="block text-xs text-muted">{detail.mistake.note}</span>}
            </p>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Contoh penggunaan</p>
          <ul className="space-y-2">
            {detail.examples.map((ex, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{ex.en}</p>
                  <p className="text-xs text-muted italic">{ex.id}</p>
                </div>
                <SpeakButton text={ex.en} label="Dengarkan contoh kalimat" small />
              </li>
            ))}
          </ul>
        </div>

        {detail.similar.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{similarLabel}</p>
            <ul className="space-y-1.5">
              {detail.similar.map((s) => {
                const target = groupOf.get(s.word.toLowerCase());
                return (
                  <li key={s.word} className="flex items-start gap-2 text-sm">
                    <SpeakButton text={s.word} label={`Ucapkan ${s.word}`} small />
                    <div className="min-w-0 flex-1">
                      {target ? (
                        <button type="button" onClick={() => jumpTo(target)} className="font-medium text-accent hover:underline">
                          {s.word}
                          {target.group !== group && (
                            <span className="ml-1 text-[10px] text-muted">
                              {groups.find((g) => g.id === target.group)?.label}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="font-medium text-fg">{s.word}</span>
                      )}
                      {s.note && <span className="text-xs text-muted"> — {s.note}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {renderLinks(detail)}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button
            size="sm"
            variant={isLearned ? 'secondary' : 'primary'}
            onClick={() => toggleLearned(item.key)}
            disabled={!canSave || saving === item.key}
          >
            {isLearned ? <Check className="h-3.5 w-3.5" /> : <BookCheck className="h-3.5 w-3.5" />}
            {isLearned ? 'Sudah dipelajari (batalkan)' : 'Simpan: sudah dipelajari'}
          </Button>
          {saveError && <span className="text-xs text-danger">{saveError}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />

      <div role="tablist" aria-label="Kelompok" className={cn('grid gap-2', groupGridClassName)}>
        {groups.map((g) => {
          const c = counts[g.id];
          const active = g.id === activeGroup.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseGroup(g.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-surface-muted',
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn('text-sm font-semibold', active ? 'text-accent' : 'text-fg')}>{g.label}</span>
                <span className="shrink-0 text-[11px] text-muted tabular-nums">
                  {c.learned}/{c.total}
                </span>
              </span>
              <ProgressBar
                value={c.total ? (c.learned / c.total) * 100 : 0}
                label={`Progres ${g.label}`}
                tone="success"
                className="mt-2 h-1.5"
              />
            </button>
          );
        })}
      </div>

      <Card className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="min-w-0">
            <span className="font-medium text-fg">{activeGroup.label}</span>
            <span className="ml-2 text-xs text-muted">{activeGroup.info}</span>
          </span>
          <span className="shrink-0 text-muted tabular-nums">
            {learnedCount} / {total} {unit}
          </span>
        </div>
        <ProgressBar
          value={total ? (learnedCount / total) * 100 : 0}
          label={`Progres ${activeGroup.label}`}
          tone="success"
        />
      </Card>

      {storageNotice && <Alert tone="info">{storageNotice}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={`Cari ${unit}...`}
            aria-label={`Cari ${unit}`}
            className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE_SIZE);
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === f.id ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:bg-surface-muted hover:text-fg',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={`Tidak ada ${unit}`}
          description={filter === 'learned' ? `Belum ada ${unit} yang ditandai sudah dipelajari.` : 'Coba kata kunci lain.'}
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {filtered.slice(0, limit).map((item) => {
              const isOpen = open === item.key;
              const isLearned = learned.has(item.key);
              const detail = details[item.key];
              const audioUrl = detail?.status === 'ok' ? detail.detail.audioUrl : undefined;
              return (
                <li key={item.key}>
                  <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
                    <button
                      type="button"
                      onClick={() => toggleOpen(item.key)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          isLearned ? 'border-success bg-success text-white' : 'border-line',
                        )}
                        aria-label={isLearned ? 'Sudah dipelajari' : undefined}
                      >
                        {isLearned && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium break-words text-fg">{item.key}</span>
                        {item.tag && <span className="ml-2 font-mono text-xs text-muted">{item.tag}</span>}
                        {item.sub && <span className="block truncate text-[11px] text-muted">{item.sub}</span>}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
                    </button>
                    <SpeakButton text={item.key} audioUrl={audioUrl} label={`Ucapkan ${item.key}`} />
                  </div>
                  {isOpen && <div className="px-4 pt-1 pb-4 sm:pl-12">{renderDetail(item)}</div>}
                </li>
              );
            })}
          </ul>
          {filtered.length > limit && (
            <div className="border-t border-line p-3 text-center">
              <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Tampilkan lebih banyak ({filtered.length - limit} lagi)
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
