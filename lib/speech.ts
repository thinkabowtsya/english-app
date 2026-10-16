// Web Speech API helper for STT (webkitSpeechRecognition) and TTS (SpeechSynthesis)

export interface SpeechRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function createSpeechRecognizer(options: SpeechRecognitionOptions) {
  if (!isSpeechRecognitionSupported()) {
    options.onError?.('Web Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Brave.');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionConstructor();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.lang || 'en-US';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const transcript = finalTranscript || interimTranscript;
    options.onResult(transcript, !!finalTranscript);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    options.onError?.(event.error || 'Speech recognition error');
  };

  recognition.onend = () => {
    options.onEnd?.();
  };

  return recognition;
}

export function speakText(text: string, onEnd?: () => void, voiceLang: string = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this environment');
    onEnd?.();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLang;
  utterance.rate = 0.95; // slightly deliberate pace for clear learning
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  // Find a high quality English voice (Google US English, Samantha, Alex, Natural, etc.)
  const preferredVoice = voices.find(
    v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('US'))
  ) || voices.find(v => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (err) => {
    console.error('Speech synthesis error:', err);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(
      (v) => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('US')),
    ) || voices.find((v) => v.lang.startsWith('en'))
  );
}

export interface SpeechQueue {
  /** Menambahkan kalimat ke antrean tanpa memotong kalimat yang sedang diucapkan. */
  enqueue(text: string): void;
  /** Menghentikan suara sekarang juga dan mengosongkan antrean (dipakai saat pengguna memotong). */
  cancel(): void;
  /** Teks yang sedang/akan diucapkan — untuk mendeteksi gema suara AI di mikrofon. */
  spokenText(): string;
  isBusy(): boolean;
}

/**
 * Antrean text-to-speech untuk panggilan suara: kalimat diucapkan berurutan begitu tersedia
 * (tidak perlu menunggu seluruh balasan). `onIdle` dipanggil saat antrean selesai.
 */
export function createSpeechQueue(options: { onStart?: () => void; onIdle?: () => void; lang?: string } = {}): SpeechQueue {
  let pending = 0;
  let generation = 0;
  let texts: string[] = [];
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    enqueue(text) {
      const clean = text.trim();
      if (!clean || !supported) return;
      const gen = generation;
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = options.lang ?? 'en-US';
      utterance.rate = 1.0;
      const voice = pickEnglishVoice();
      if (voice) utterance.voice = voice;
      const done = () => {
        if (gen !== generation) return; // milik antrean yang sudah dibatalkan
        pending = Math.max(0, pending - 1);
        texts = texts.slice(1);
        if (pending === 0) options.onIdle?.();
      };
      utterance.onend = done;
      utterance.onerror = done;
      if (pending === 0) options.onStart?.();
      pending++;
      texts.push(clean);
      window.speechSynthesis.speak(utterance);
    },
    cancel() {
      generation++;
      pending = 0;
      texts = [];
      if (supported) window.speechSynthesis.cancel();
    },
    spokenText: () => texts.join(' '),
    isBusy: () => pending > 0,
  };
}
