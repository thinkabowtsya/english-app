'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, BookOpen, Mic, Sparkles, Zap, Flame, Award, ArrowRight, PhoneCall, Volume2 } from 'lucide-react';
import { speakText } from '@/lib/speech';

export default function HomePage() {
  const [expressionAudio, setExpressionAudio] = useState(false);

  const handleSpeakExpression = () => {
    setExpressionAudio(true);
    speakText(
      "Hit the nail on the head. That means to describe exactly what is causing a situation or problem.",
      () => setExpressionAudio(false),
      'en-US'
    );
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-800 p-8 sm:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-600/30 to-indigo-600/30 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-pink-600/20 to-teal-600/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 border border-indigo-700/50 px-3.5 py-1 text-xs font-bold text-indigo-300 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI-Powered English Learning Experience</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Master English Fluency with <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">Live AI Voice Calls</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Call AI hands-free (Stimuler style), practice real-world conversations with voice recognition, receive real-time grammar corrections, and build CEFR vocabulary.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/call"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all"
            >
              <PhoneCall className="h-4 w-4" />
              <span>Call AI Now (Stimuler Style)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/practice"
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition-all"
            >
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              <span>Text & Practice Studio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Daily Streak</span>
            <span className="text-xl font-extrabold text-white">5 Days 🔥</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <PhoneCall className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">AI Voice Calls</span>
            <span className="text-xl font-extrabold text-white">12 Calls</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Words Mastered</span>
            <span className="text-xl font-extrabold text-white">42 Words</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg Fluency</span>
            <span className="text-xl font-extrabold text-indigo-400">88 / 100</span>
          </div>
        </div>

      </div>

      {/* EXPRESSION OF THE DAY & MODEL ENGINE WIDGET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Idiom of the Day */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Idiom of the Day</h3>
            </div>
            
            <button
              onClick={handleSpeakExpression}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-xs font-semibold text-indigo-300 hover:bg-indigo-900 transition-colors"
            >
              <Volume2 className={`h-3.5 w-3.5 ${expressionAudio ? 'animate-pulse text-indigo-400' : ''}`} />
              <span>Listen</span>
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="text-2xl font-extrabold text-white">&ldquo;Hit the nail on the head&rdquo;</h4>
            <p className="text-xs text-indigo-300 font-mono">/hɪt ðə neɪl ɒn ðə hɛd/</p>
          </div>

          <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 space-y-1 text-xs">
            <p className="text-slate-200 font-medium">
              <strong className="text-indigo-400">Meaning:</strong> To describe exactly what is causing a situation or problem.
            </p>
            <p className="text-slate-400 italic">
              <strong className="text-slate-300">Arti:</strong> Menjelaskan sesuatu dengan sangat tepat dan akurat.
            </p>
          </div>
        </div>

        {/* Engine Tech Status Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
              <h3 className="text-sm font-bold text-white">Groq AI Engine Status</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Powered by Groq Cloud API running `llama-3.3-70b-versatile` with ultra-low latency response times.
            </p>
          </div>

          <div className="space-y-2 border-t border-slate-800/60 pt-3 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Model:</span>
              <span className="font-mono text-indigo-400 font-bold">Llama-3.3-70b</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>STT Engine:</span>
              <span className="font-mono text-emerald-400 font-bold">Web Speech API</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>TTS Voice:</span>
              <span className="font-mono text-pink-400 font-bold">en-US Native</span>
            </div>
          </div>
        </div>

      </div>

      {/* CORE MODULE CARDS */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight">Interactive Practice Modules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: AI Voice Phone Call (NEW) */}
          <Link
            href="/call"
            className="group glass-panel rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/60 transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1 shadow-xl bg-gradient-to-b from-emerald-950/20 to-transparent"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                AI Phone Call (Stimuler)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live hands-free voice call simulation. Talk freely about any topic or pick AI topic suggestions.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 pt-3 border-t border-slate-800/60">
              <span>Call Now</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Practice Studio */}
          <Link
            href="/practice"
            className="group glass-panel rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/60 transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1 shadow-xl"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Conversation Studio
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Roleplay real-world scenarios (Job Interview, Travel, IELTS) with text & voice plus instant grammar analysis.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 pt-3 border-t border-slate-800/60">
              <span>Start Studio</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Vocab Builder */}
          <Link
            href="/vocabulary"
            className="group glass-panel rounded-2xl p-6 border border-slate-800 hover:border-purple-500/60 transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1 shadow-xl"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                Vocab & Idiom Builder
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic 3D flashcards across CEFR levels A1-C2 with audio pronunciation, example sentences, and quiz mode.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 pt-3 border-t border-slate-800/60">
              <span>Learn Words</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Speaking Lab */}
          <Link
            href="/pronunciation"
            className="group glass-panel rounded-2xl p-6 border border-slate-800 hover:border-pink-500/60 transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1 shadow-xl"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <Mic className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                Speaking Lab
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Read aloud sentence challenges, compare your voice against en-US native reference audio, and check accuracy.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400 pt-3 border-t border-slate-800/60">
              <span>Train Accent</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

    </div>
  );
}
