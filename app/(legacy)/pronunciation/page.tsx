'use client';

import React, { useState } from 'react';
import { Volume2, Sparkles, CheckCircle2, RefreshCw, VolumeX, Award } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speech';
import VoiceInput from '@/components/chat/voice-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, PageHeader } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';

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

  const difficultyTone = { Easy: 'success', Medium: 'warning', Hard: 'danger' } as const;

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      <PageHeader
        title="Speaking & Pronunciation Lab"
        description="Dengarkan audio referensi native, rekam suaramu, lalu bandingkan akurasi pelafalan."
        action={
          <Button size="sm" onClick={nextChallenge}>
            <RefreshCw className="h-3.5 w-3.5" />
            Tantangan berikutnya ({currentIdx + 1}/{CHALLENGES.length})
          </Button>
        }
      />

      {/* Main Pronunciation Card */}
      <Card className="space-y-6 p-5 sm:p-8">

        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{challenge.focusArea}</Badge>
            <Badge tone={difficultyTone[challenge.difficulty]}>{challenge.difficulty}</Badge>
          </div>

          <span className="font-mono text-xs text-muted">Tantangan {currentIdx + 1}</span>
        </div>

        {/* Target Sentence Display */}
        <div className="space-y-3 rounded-2xl bg-surface-muted px-4 py-6 text-center">
          <h2 className="text-xl leading-relaxed font-semibold tracking-tight break-words text-fg sm:text-3xl">
            &ldquo;{challenge.text}&rdquo;
          </h2>
          <p className="font-mono text-xs break-words text-accent">{challenge.phonetics}</p>
          <p className="text-xs text-muted italic">Terjemahan: &ldquo;{challenge.translation}&rdquo;</p>
        </div>

        {/* Action Controls: Reference Audio & Microphone Record */}
        <div className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
          {/* Reference Audio button */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePlayReference}
            aria-pressed={isPlayingReference}
            className={cn('text-sm', isPlayingReference && 'border-accent bg-accent-soft text-accent hover:bg-accent-soft')}
          >
            {isPlayingReference ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isPlayingReference ? 'Hentikan audio native' : 'Dengarkan aksen native (en-US)'}
          </Button>

          {/* Microphone Recording Input */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2 sm:justify-start">
            <span className="text-xs font-medium text-fg">Rekam suaramu:</span>
            <VoiceInput onTranscript={evaluateAccuracy} />
          </div>
        </div>

        {/* Evaluation & Result Feedback Card */}
        {spokenTranscript && (
          <div className="space-y-4 rounded-2xl border border-line p-4 sm:p-5" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-semibold text-fg">Transkrip suara tertangkap</span>
              </div>

              {accuracyScore !== null && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium text-muted uppercase">Skor akurasi:</span>
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    accuracyScore >= 80 ? 'text-success' : accuracyScore >= 50 ? 'text-warning' : 'text-danger'
                  )}>
                    {accuracyScore}%
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="mb-1 block text-[10px] font-semibold text-muted uppercase">Yang didengar mikrofon:</span>
              <p className="rounded-xl bg-surface-muted p-3 text-sm font-medium break-words text-fg">
                &ldquo;{spokenTranscript}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Pronunciation Tip Box */}
        <div className="flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-xs text-fg">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <span className="mb-1 block text-xs font-semibold text-warning">Tips Pelafalan Native:</span>
            <p className="leading-relaxed">{challenge.tip}</p>
          </div>
        </div>

      </Card>

    </div>
  );
}
