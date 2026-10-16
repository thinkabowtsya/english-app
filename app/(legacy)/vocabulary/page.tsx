'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { VocabCard } from '@/lib/types';
import Flashcard from '@/components/vocabulary/flashcard';
import { BookOpen, RefreshCw, Bookmark, HelpCircle, CheckCircle, XCircle, Award, PartyPopper, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, EmptyState, PageHeader, Skeleton } from '@/components/ui/feedback';
import { PHRASE_REASONS, findOpenPhrase, getOpenPhrasesByReason, vocabNote } from '@/lib/phrase-reviews';
import { addReview, removeReview } from '@/lib/storage/actions';
import { useAppData } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Daily', 'Business', 'Travel', 'Academic', 'Idioms & Slang'] as const;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const TABS = [
  { id: 'cards', label: 'Kartu', icon: BookOpen },
  { id: 'quiz', label: 'Kuis', icon: HelpCircle },
  { id: 'bookmarks', label: 'Tersimpan', icon: Bookmark },
] as const;

export default function VocabularyPage() {
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('Business');
  const [selectedLevel, setSelectedLevel] = useState<typeof LEVELS[number]>('B2');
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'quiz' | 'bookmarks'>('cards');

  // Bookmark = frasa di daftar review (kind 'phrase', source 'manual'), tersimpan di localStorage.
  const data = useAppData();
  const reviews = data?.reviews ?? [];
  const savedWords = getOpenPhrasesByReason(reviews, PHRASE_REASONS.vocabulary);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: selectedCategory, level: selectedLevel, count: 6 }),
      signal: controller.signal
    })
      .then(async res => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(body?.items)) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Gagal memuat kosakata. Coba lagi nanti.');
        }
        setCards(body.items);
        setLoadError(null);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch vocabulary:', err);
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat kosakata. Coba lagi nanti.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [selectedCategory, selectedLevel, reloadKey]);

  const bookmarkState = (card: VocabCard) => {
    const existing = findOpenPhrase(reviews, card.word);
    const ownedHere = existing?.source === 'manual' && existing.reason === PHRASE_REASONS.vocabulary;
    // Kata yang sudah disimpan dari fitur lain (mis. AI Coach) tidak dihapus dari sini.
    const locked = !data || (!!existing && !ownedHere);
    const label = !data ? 'Memuat daftar review...' : locked ? 'Sudah ada di daftar review' : undefined;
    return { existing, locked, label };
  };

  const toggleBookmark = (card: VocabCard) => {
    const { existing, locked } = bookmarkState(card);
    if (locked) return;
    if (existing) {
      removeReview(existing.id);
    } else {
      addReview({
        kind: 'phrase',
        label: card.word,
        note: vocabNote(card),
        reason: PHRASE_REASONS.vocabulary,
        lessonId: null,
        source: 'manual',
        nextReviewAt: null,
      });
    }
  };

  const reload = () => {
    setIsLoading(true);
    setReloadKey(k => k + 1);
  };

  // Quiz helper: options for current card definition
  const currentQuizCard = cards[quizIndex];
  const quizOptions = React.useMemo(() => {
    if (!currentQuizCard || cards.length < 2) return [];
    const wrongOptions = cards
      .filter(c => c.word !== currentQuizCard.word)
      .map(c => c.definitionId)
      .slice(0, 3);
    const options = [currentQuizCard.definitionId, ...wrongOptions];
    // Rotasi deterministik (bukan Math.random saat render) agar posisi jawaban bervariasi.
    const offset = (currentQuizCard.word.length + quizIndex) % options.length;
    return [...options.slice(offset), ...options.slice(0, offset)];
  }, [currentQuizCard, cards, quizIndex]);

  const handleQuizAnswer = (option: string) => {
    if (quizAnswered) return;
    setSelectedOption(option);
    setQuizAnswered(true);

    if (option === currentQuizCard.definitionId) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    if (quizIndex < cards.length - 1) {
      setQuizIndex(prev => prev + 1);
      setQuizAnswered(false);
      setSelectedOption(null);
    } else {
      // Quiz complete!
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswered(false);
    setSelectedOption(null);
  };

  const pill = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:bg-surface-muted hover:text-fg'
    );

  return (
    <div className="space-y-5">

      <PageHeader
        title="Vocab & Idiom Builder"
        description="Kosakata CEFR dan idiom native yang dibuat AI. Kata yang di-bookmark masuk ke daftar review."
      />

      {/* View Mode Tabs */}
      <div role="tablist" aria-label="Mode tampilan" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-grid">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => {
              setActiveTab(id);
              if (id === 'quiz') resetQuiz();
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-3',
              activeTab === id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>
              {label}
              {id === 'bookmarks' && ` (${savedWords.length})`}
            </span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      {activeTab === 'cards' && (
        <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted">Kategori:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() => {
                  if (cat !== selectedCategory) setIsLoading(true);
                  setSelectedCategory(cat);
                }}
                className={pill(selectedCategory === cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* CEFR Level Selector & Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs font-medium text-muted">Level:</span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={selectedLevel === lvl}
                  onClick={() => {
                    if (lvl !== selectedLevel) setIsLoading(true);
                    setSelectedLevel(lvl);
                  }}
                  className={cn(
                    'rounded-md border px-2 py-0.5 font-mono text-xs font-semibold transition-colors',
                    selectedLevel === lvl
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-line text-muted hover:bg-surface-muted hover:text-fg'
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <Button size="sm" variant="secondary" onClick={reload} disabled={isLoading}>
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Buat set baru
            </Button>
          </div>
        </Card>
      )}

      {/* CONTENT DISPLAY AREA */}
      {activeTab === 'cards' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label={`Membuat kosakata CEFR ${selectedLevel}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : loadError ? (
            <Alert
              tone="error"
              title="Kosakata tidak dapat dimuat"
              action={
                <Button size="sm" variant="secondary" onClick={reload}>
                  Coba lagi
                </Button>
              }
            >
              {loadError}
            </Alert>
          ) : cards.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Belum ada kartu" description="Pilih kategori & level lalu buat set baru." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => {
                const { existing, locked, label } = bookmarkState(card);
                return (
                  <Flashcard
                    key={card.id || card.word}
                    card={card}
                    onBookmark={toggleBookmark}
                    isBookmarked={!!existing}
                    bookmarkDisabled={locked}
                    bookmarkLabel={label}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* QUIZ PRACTICE MODE */}
      {activeTab === 'quiz' && cards.length === 0 && (
        <EmptyState
          icon={<HelpCircle className="h-6 w-6" />}
          title="Belum ada kartu untuk kuis"
          description="Muat set kosakata di tab Kartu terlebih dahulu."
        />
      )}

      {activeTab === 'quiz' && cards.length > 0 && (
        <Card className="mx-auto max-w-2xl space-y-5 p-5 sm:p-8">

          <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <span className="text-xs font-semibold text-accent uppercase">Kuis kosakata</span>
              <h2 className="text-lg font-semibold text-fg">Soal {quizIndex + 1} dari {cards.length}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1">
              <Award className="h-4 w-4 text-warning" />
              <span className="text-xs font-semibold text-fg tabular-nums">Skor: {quizScore}</span>
            </div>
          </div>

          {quizIndex < cards.length ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-surface-muted px-4 py-5 text-center">
                <span className="mb-1 block text-xs text-muted">Pilih arti bahasa Indonesia yang benar untuk:</span>
                <h3 className="text-2xl font-bold tracking-tight break-words text-fg sm:text-3xl">{currentQuizCard.word}</h3>
                <span className="font-mono text-xs text-accent">[{currentQuizCard.phonetic}]</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {quizOptions.map((opt, idx) => {
                  const isCorrect = opt === currentQuizCard.definitionId;
                  const isSelected = selectedOption === opt;

                  let optionStyle = 'border-line bg-surface text-fg hover:bg-surface-muted';
                  if (quizAnswered) {
                    if (isCorrect) optionStyle = 'border-success bg-success-soft text-success font-semibold';
                    else if (isSelected) optionStyle = 'border-danger bg-danger-soft text-danger';
                    else optionStyle = 'border-line text-muted opacity-60';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuizAnswer(opt)}
                      disabled={quizAnswered}
                      className={cn('flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors', optionStyle)}
                    >
                      <span>{opt}</span>
                      {quizAnswered && isCorrect && <CheckCircle className="h-4 w-4 shrink-0" />}
                      {quizAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {quizAnswered && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleNextQuiz}>
                    {quizIndex === cards.length - 1 ? (
                      <>
                        <PartyPopper className="h-4 w-4" />
                        Selesaikan kuis
                      </>
                    ) : (
                      'Soal berikutnya →'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-8 text-center">
              <PartyPopper className="mx-auto h-12 w-12 text-warning" />
              <h3 className="text-2xl font-semibold text-fg">Kuis selesai!</h3>
              <p className="text-sm text-muted">
                Skor kamu <span className="font-semibold text-accent">{quizScore}</span> dari {cards.length}!
              </p>
              <Button onClick={resetQuiz}>Ulangi</Button>
            </div>
          )}

        </Card>
      )}

      {/* SAVED BOOKMARKS TAB */}
      {activeTab === 'bookmarks' && (
        <>
          {savedWords.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-6 w-6" />}
              title="Belum ada kata tersimpan"
              description="Klik ikon bookmark pada flashcard untuk menyimpan kosakata ke daftar review."
            />
          ) : (
            <Card className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <p className="text-xs text-muted">Kata yang kamu bookmark ada di daftar review dan tetap tersimpan setelah halaman ditutup.</p>
                <Link href="/latihan#review" className="text-xs font-medium text-accent hover:underline">
                  Buka daftar review
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {savedWords.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words text-fg">{item.label}</p>
                      {item.note && <p className="mt-0.5 text-xs break-words text-muted">{item.note}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeReview(item.id)}
                      aria-label={`Hapus ${item.label} dari daftar review`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Hapus</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

    </div>
  );
}
