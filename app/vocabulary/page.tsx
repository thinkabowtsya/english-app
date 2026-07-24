'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VocabCard } from '@/lib/types';
import Flashcard from '@/components/vocabulary/flashcard';
import { BookOpen, Sparkles, RefreshCw, Bookmark, HelpCircle, CheckCircle, XCircle, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

const CATEGORIES = ['Daily', 'Business', 'Travel', 'Academic', 'Idioms & Slang'] as const;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export default function VocabularyPage() {
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('Business');
  const [selectedLevel, setSelectedLevel] = useState<typeof LEVELS[number]>('B2');
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [bookmarks, setBookmarks] = useState<VocabCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'quiz' | 'bookmarks'>('cards');

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const fetchVocabulary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, level: selectedLevel, count: 6 })
      });
      const data = await res.json();
      if (data.items) {
        setCards(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch vocabulary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedLevel]);

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  const toggleBookmark = (card: VocabCard) => {
    if (bookmarks.some(b => b.id === card.id || b.word === card.word)) {
      setBookmarks(bookmarks.filter(b => b.id !== card.id && b.word !== card.word));
    } else {
      setBookmarks([...bookmarks, card]);
    }
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
    return options.sort(() => Math.random() - 0.5);
  }, [currentQuizCard, cards]);

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

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Vocabulary & Idiom Builder</h1>
          </div>
          <p className="text-xs text-slate-400">
            Learn curated CEFR vocabulary and native idioms generated dynamically by Groq Llama 3.3.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'cards' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('quiz');
              resetQuiz();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Quiz Practice</span>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'bookmarks' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      {activeTab === 'cards' && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* CEFR Level Selector & Refresh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 mr-1">Level:</span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2 py-0.5 rounded text-xs font-bold font-mono transition-all ${
                    selectedLevel === lvl
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <button
              onClick={fetchVocabulary}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Generate New Set</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENT DISPLAY AREA */}
      {activeTab === 'cards' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-2xl glass-panel border border-slate-800 p-6 flex flex-col justify-center items-center text-center animate-pulse">
                  <Sparkles className="h-8 w-8 text-indigo-500/40 animate-spin mb-3" />
                  <p className="text-xs text-indigo-300">Generating CEFR {selectedLevel} vocabulary...</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card) => (
                <Flashcard
                  key={card.id || card.word}
                  card={card}
                  onBookmark={toggleBookmark}
                  isBookmarked={bookmarks.some(b => b.word === card.word)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* QUIZ PRACTICE MODE */}
      {activeTab === 'quiz' && cards.length > 0 && (
        <div className="max-w-2xl mx-auto glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-indigo-400">Vocabulary Quiz</span>
              <h2 className="text-lg font-bold text-white">Question {quizIndex + 1} of {cards.length}</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-3 py-1">
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-extrabold text-white">Score: {quizScore}</span>
            </div>
          </div>

          {quizIndex < cards.length ? (
            <div className="space-y-5">
              <div className="text-center py-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-mono text-slate-400 block mb-1">Select the correct Indonesian definition for:</span>
                <h3 className="text-3xl font-extrabold text-white tracking-tight">{currentQuizCard.word}</h3>
                <span className="text-xs text-indigo-300 font-mono">[{currentQuizCard.phonetic}]</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {quizOptions.map((opt, idx) => {
                  const isCorrect = opt === currentQuizCard.definitionId;
                  const isSelected = selectedOption === opt;

                  let optionStyle = 'bg-slate-900 border-slate-800 text-slate-200 hover:border-indigo-500/50';
                  if (quizAnswered) {
                    if (isCorrect) optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold';
                    else if (isSelected) optionStyle = 'bg-rose-950/80 border-rose-500 text-rose-300';
                    else optionStyle = 'bg-slate-950 border-slate-900 text-slate-600 opacity-60';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizAnswer(opt)}
                      disabled={quizAnswered}
                      className={`w-full text-left p-4 rounded-xl border text-xs transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <span>{opt}</span>
                      {quizAnswered && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                      {quizAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {quizAnswered && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleNextQuiz}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
                  >
                    {quizIndex === cards.length - 1 ? 'Finish Quiz 🎉' : 'Next Question →'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Sparkles className="h-12 w-12 text-amber-400 mx-auto animate-bounce" />
              <h3 className="text-2xl font-extrabold text-white">Quiz Completed!</h3>
              <p className="text-sm text-slate-300">
                You scored <span className="text-indigo-400 font-bold">{quizScore}</span> out of {cards.length}!
              </p>
              <button
                onClick={resetQuiz}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      )}

      {/* SAVED BOOKMARKS TAB */}
      {activeTab === 'bookmarks' && (
        <>
          {bookmarks.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <Bookmark className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Belum Ada Kata Tersimpan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Klik ikon bookmark pada flashcard untuk menyimpan kosakata favorit Anda di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bookmarks.map((card) => (
                <Flashcard
                  key={card.id || card.word}
                  card={card}
                  onBookmark={toggleBookmark}
                  isBookmarked={true}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
