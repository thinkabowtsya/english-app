'use client';

import React, { useState } from 'react';
import { Mic, Volume2, Sparkles, CheckCircle2, RefreshCw, VolumeX, AlertCircle, Award } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speech';
import VoiceInput from '@/components/chat/voice-input';

interface SentenceChallenge {
  id: string;
  text: string;
  translation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  phonetics: string;
  focusArea: string;
  tip: string;
}

const CHALLENGES: SentenceChallenge[] = [
  {
    id: '1',
    text: "Thirty-three thousand thankful thieves thought through Thursday.",
    translation: "Tiga puluh tiga ribu pencuri yang bersyukur berpikir keras hingga hari Kamis.",
    difficulty: 'Hard',
    phonetics: "/ˈθɜː.ti ˈθriː ˈθaʊ.zənd ˈθæŋk.fəl θiːvz θɔːt θruː ˈθɜːz.deɪ/",
    focusArea: "Voiceless 'TH' (/θ/) Sound Clarity",
    tip: "Let your tongue touch the edge of your top front teeth and blow air out gently without vocalizing."
  },
  {
    id: '2',
    text: "She sells seashells by the seashore with shimmering shine.",
    translation: "Dia menjual kerang laut di tepi pantai dengan kilauan yang bersinar.",
    difficulty: 'Medium',
    phonetics: "/ʃiː sɛlz ˈsiː.ʃɛlz baɪ ðə ˈsiː.ʃɔːr/",
    focusArea: "'S' (/s/) vs 'SH' (/ʃ/) Contrast",
    tip: "For 'S', pull tongue slightly back and keep lips spread. For 'SH', round your lips like shushing someone."
  },
  {
    id: '3',
    text: "I would appreciate the opportunity to discuss this further in detail.",
    translation: "Saya akan menghargai kesempatan untuk mendiskusikan hal ini lebih lanjut secara mendalam.",
    difficulty: 'Medium',
    phonetics: "/aɪ wʊd əˈpriː.ʃi.eɪt ði ˌɒp.əˈtjuː.nə.ti tʊ dɪˈskʌs ðɪs ˈfɜː.ðər ɪn dɪˈteɪl/",
    focusArea: "Professional Intonation & Stress",
    tip: "Stress the key content words: appreciate, opportunity, discuss, detail."
  },
  {
    id: '4',
    text: "Red lorry, yellow lorry, rare green rural world.",
    translation: "Truk merah, truk kuning, dunia pedesaan hijau yang langka.",
    difficulty: 'Hard',
    phonetics: "/rɛd ˈlɒr.i ˈjɛl.oʊ ˈlɒr.i rɛər ɡriːn ˈrʊə.rəl wɜːld/",
    focusArea: "'R' (/r/) vs 'L' (/l/) Tongue Transitions",
    tip: "Keep tongue tip touching alveolar ridge for L, but curl tongue back without touching the roof for R."
  },
  {
    id: '5',
    text: "Could you please clarify the main objectives of our project timeline?",
    translation: "Bisakah Anda memperjelas tujuan utama dari linimasa proyek kita?",
    difficulty: 'Easy',
    phonetics: "/kʊd juː pliːz ˈklær.ɪ.faɪ ðə meɪn əbˈdʒɛk.tɪvz əv aʊər ˈprɒdʒ.ɛkt ˈtaɪm.laɪn/",
    focusArea: "Polite Business Request Tone",
    tip: "Rise tone slightly at the end of polite questions to sound engaging and professional."
  }
];

export default function PronunciationLabPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);

  const challenge = CHALLENGES[currentIdx];

  const handlePlayReference = () => {
    if (isPlayingReference) {
      stopSpeaking();
      setIsPlayingReference(false);
    } else {
      setIsPlayingReference(true);
      speakText(challenge.text, () => setIsPlayingReference(false), 'en-US');
    }
  };

  // Simple string similarity matching score algorithm
  const evaluateAccuracy = (transcript: string) => {
    setSpokenTranscript(transcript);
    
    const targetWords = challenge.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const spokenWords = transcript.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);

    let matches = 0;
    targetWords.forEach(w => {
      if (spokenWords.includes(w)) matches++;
    });

    const score = Math.round((matches / targetWords.length) * 100);
    setAccuracyScore(Math.min(100, Math.max(0, score)));
  };

  const nextChallenge = () => {
    setCurrentIdx((prev) => (prev + 1) % CHALLENGES.length);
    setSpokenTranscript('');
    setAccuracyScore(null);
    stopSpeaking();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Mic className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Speaking & Pronunciation Lab</h1>
          </div>
          <p className="text-xs text-slate-400">
            Listen to native reference audio, record your voice, and compare pronunciation accuracy.
          </p>
        </div>

        <button
          onClick={nextChallenge}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Next Challenge ({currentIdx + 1}/{CHALLENGES.length})</span>
        </button>
      </div>

      {/* Main Pronunciation Card */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* Header Metadata */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-xs font-bold text-indigo-300">
              {challenge.focusArea}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
              challenge.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-300' :
              challenge.difficulty === 'Medium' ? 'bg-amber-950 text-amber-300' : 'bg-rose-950 text-rose-300'
            }`}>
              {challenge.difficulty}
            </span>
          </div>

          <span className="text-xs text-slate-400 font-mono">Challenge {currentIdx + 1}</span>
        </div>

        {/* Target Sentence Display */}
        <div className="text-center py-6 px-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed tracking-tight">
            &ldquo;{challenge.text}&rdquo;
          </h2>
          <p className="text-xs text-indigo-300 font-mono">{challenge.phonetics}</p>
          <p className="text-xs text-slate-400 italic">Terjemahan: &ldquo;{challenge.translation}&rdquo;</p>
        </div>

        {/* Action Controls: Reference Audio & Microphone Record */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Reference Audio button */}
          <button
            onClick={handlePlayReference}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-xs font-bold transition-all shadow-md ${
              isPlayingReference
                ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse'
                : 'bg-slate-900 border-slate-700 text-indigo-300 hover:text-white hover:border-indigo-500'
            }`}
          >
            {isPlayingReference ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span>{isPlayingReference ? 'Stop Native Audio' : 'Listen Native Accent (en-US)'}</span>
          </button>

          {/* Microphone Recording Input */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="text-xs font-bold text-slate-300">Record Your Voice:</span>
            <VoiceInput onTranscript={evaluateAccuracy} />
          </div>
        </div>

        {/* Evaluation & Result Feedback Card */}
        {spokenTranscript && (
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Voice Transcript Captured</span>
              </div>

              {accuracyScore !== null && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-slate-400 font-bold uppercase">Accuracy Score:</span>
                  <span className={`text-sm font-extrabold ${
                    accuracyScore >= 80 ? 'text-emerald-400' : accuracyScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {accuracyScore}%
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">What the mic heard:</span>
              <p className="text-sm font-semibold text-indigo-200 bg-slate-900 p-3 rounded-xl border border-slate-800">
                &ldquo;{spokenTranscript}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Pronunciation Tip Box */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-950/20 border border-amber-800/40 p-4 text-xs text-amber-200">
          <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block text-xs mb-1">Tips Pelafalan Native:</span>
            <p className="leading-relaxed">{challenge.tip}</p>
          </div>
        </div>

      </div>

    </div>
  );
}
