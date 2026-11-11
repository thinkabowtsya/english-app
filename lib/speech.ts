// Web Speech API helper for STT (webkitSpeechRecognition) and TTS (SpeechSynthesis)
import { TTS_MAX_CHARS, splitForTts, type VoicePreference } from './tts';
import { getSpeech, getVoicePreference, isNaturalVoiceLimited, playNatural, type Playback } from './tts-client';

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

/** Rekaman/suara natural yang sedang diputar (dihentikan oleh stopSpeaking atau suara berikutnya). */
let current: Playback | null = null;

/** Putar rekaman pengucapan asli bila ada; jika tidak ada atau gagal diputar, pakai speakText. */
export function playPronunciation(text: string, audioUrl?: string) {
  if (typeof window === 'undefined') return;
  if (!audioUrl) return speakText(text, undefined, 'en-US');
  stopSpeaking();
  const audio = new Audio(audioUrl);
  current = { stop: () => audio.pause() };
  audio.play().catch(() => speakText(text, undefined, 'en-US'));
}

/**
 * Ucapkan teks. Bahasa Inggris memakai suara natural Groq Orpheus (lewat /api/tts, di-cache)
 * kecuali pengguna memilih "Suara browser" di Pengaturan; bila gagal, otomatis kembali ke
 * suara browser untuk bagian yang belum terucap.
 */
export function speakText(text: string, onEnd?: () => void, voiceLang: string = 'en-US') {
  if (typeof window === 'undefined') return;
  stopSpeaking();
  const voice = getVoicePreference();
  if (voice !== 'browser' && voiceLang.toLowerCase().startsWith('en') && typeof Audio !== 'undefined') {
    current = playNatural(text, voice, () => onEnd?.(), (remaining) => speakWithBrowser(remaining, onEnd, voiceLang));
    return;
  }
  speakWithBrowser(text, onEnd, voiceLang);
}

/** Putar contoh dengan suara tertentu (untuk "Coba suara" di Pengaturan sebelum disimpan). */
export function previewVoice(text: string, voice: VoicePreference) {
  if (typeof window === 'undefined') return;
  stopSpeaking();
  if (voice === 'browser') return speakWithBrowser(text);
  current = playNatural(text, voice, () => {}, (remaining) => speakWithBrowser(remaining));
}

/** Utterance yang sedang diucapkan disimpan global: Chrome bisa membuangnya (GC) sebelum onend terpanggil. */
let activeUtterance: SpeechSynthesisUtterance | null = null;

const normLang = (lang: string) => lang.toLowerCase().replace('_', '-');

/**
 * Pilih suara browser untuk bahasa `lang`. Suara lokal (terpasang di perangkat) diutamakan:
 * suara online seperti "Google US English" sering diam tanpa error atau berhenti di tengah,
 * apalagi saat mikrofon pengenalan suara sedang aktif.
 */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const want = normLang(lang);
  const prefix = want.split('-')[0];
  const voices = window.speechSynthesis.getVoices().filter((v) => normLang(v.lang).startsWith(prefix));
  const exact = (v: SpeechSynthesisVoice) => normLang(v.lang) === want;
  return (
    voices.find((v) => v.localService && exact(v)) ||
    voices.find((v) => v.localService) ||
    voices.find(exact) ||
    voices[0]
  );
}

/** Daftar suara browser dimuat asinkron di Chrome; tunggu sebentar bila masih kosong. */
function waitForVoices(timeoutMs = 1000): Promise<void> {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, timeoutMs);
    synth.addEventListener('voiceschanged', done);
  });
}

interface Utterance {
  /** Selesai saat suara selesai, gagal, dibatalkan, atau macet (pengaman waktu). */
  done: Promise<void>;
  cancel(): void;
}

/**
 * Ucapkan teks dengan suara browser secara andal: tunggu daftar suara, pilih suara lokal, beri jeda
 * singkat setelah cancel() (Chrome kadang membuang speak() yang langsung menyusul cancel()), dan
 * pengaman waktu agar pemanggil tidak menunggu selamanya bila onend tidak pernah terpanggil.
 */
function utter(text: string, lang: string, rate: number): Utterance {
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));
  const synth = window.speechSynthesis;
  const timers: number[] = [];
  let settled = false;
  let started = false;
  const utterance = new SpeechSynthesisUtterance(text);

  const settle = (cancelSpeech: boolean) => {
    if (settled) return;
    settled = true;
    timers.forEach((t) => window.clearTimeout(t));
    if (activeUtterance === utterance) activeUtterance = null;
    if (cancelSpeech) synth.cancel();
    resolveDone();
  };

  void waitForVoices().then(() => {
    if (settled) return;
    timers.push(
      window.setTimeout(() => {
        if (settled) return;
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1;
        const voice = pickVoice(lang);
        if (voice) utterance.voice = voice;
        utterance.onstart = () => {
          started = true;
        };
        utterance.onend = () => settle(false);
        utterance.onerror = (event) => {
          if (event.error !== 'interrupted' && event.error !== 'canceled') console.warn('Speech synthesis error:', event.error);
          settle(false);
        };
        activeUtterance = utterance;
        synth.resume();
        synth.speak(utterance);
        // Tidak pernah mulai (diblokir/macet) → lepaskan; terlalu lama → anggap selesai.
        timers.push(window.setTimeout(() => !started && settle(true), 5000));
        timers.push(window.setTimeout(() => settle(true), 6000 + (text.length * 110) / rate));
      }, 60),
    );
  });

  return {
    done,
    cancel: () => settle(true),
  };
}

/** Suara bawaan browser (speechSynthesis) — cadangan bila suara natural tidak tersedia. */
function speakWithBrowser(text: string, onEnd?: () => void, voiceLang: string = 'en-US') {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this environment');
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const speech = utter(text, voiceLang, 0.95);
  current = { stop: () => speech.cancel() };
  void speech.done.then(() => onEnd?.());
}

export function stopSpeaking() {
  current?.stop();
  current = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
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
 *
 * Memakai suara natural Groq Orpheus (sesuai pilihan di Pengaturan): audio tiap kalimat langsung
 * diambil saat kalimat masuk antrean, jadi kalimat berikutnya siap selagi kalimat sebelumnya
 * diputar. Bila Orpheus gagal, sisa panggilan memakai suara browser.
 */
export function createSpeechQueue(options: { onStart?: () => void; onIdle?: () => void; lang?: string } = {}): SpeechQueue {
  const lang = options.lang ?? 'en-US';
  let generation = 0;
  // `prepared` = teks sudah dikunci & audionya sudah diminta (atau diputuskan pakai suara browser).
  let items: { text: string; audio: Promise<Blob> | null; prepared: boolean }[] = [];
  let playing = false;
  // Setelah Orpheus gagal sekali, sisa panggilan langsung memakai suara browser agar tidak tersendat.
  let browserOnly = false;
  let interrupt: (() => void) | null = null;
  const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speakBrowser = (text: string): Promise<void> => {
    if (!browserSupported) return Promise.resolve();
    const speech = utter(text, lang, 1.0);
    interrupt = () => speech.cancel();
    return speech.done;
  };

  const playBlob = (blob: Blob) =>
    new Promise<boolean>((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      let settled = false;
      // Pengaman: audio yang macet (tidak pernah memanggil onended) tidak boleh menahan antrean.
      let guard = window.setTimeout(() => finish(true), 60_000);
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(guard);
        URL.revokeObjectURL(url);
        resolve(ok);
      };
      audio.onloadedmetadata = () => {
        if (!Number.isFinite(audio.duration)) return;
        window.clearTimeout(guard);
        guard = window.setTimeout(() => finish(true), audio.duration * 1000 + 3000);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      interrupt = () => {
        audio.pause();
        finish(true);
      };
      audio.play().catch(() => finish(false));
    });

  /**
   * Kunci item ke-`index`: gabungkan kalimat-kalimat berikutnya yang masih menunggu (selama ≤ batas
   * TTS) lalu minta audionya sekali. Kuota Orpheus kecil (±100 permintaan/hari), jadi satu balasan
   * beberapa kalimat cukup memakai 1–2 permintaan, bukan satu per kalimat.
   */
  const prepare = (index: number) => {
    const item = items[index];
    if (!item || item.prepared) return;
    while (items[index + 1] && !items[index + 1].prepared && item.text.length + 1 + items[index + 1].text.length <= TTS_MAX_CHARS) {
      item.text = `${item.text} ${items[index + 1].text}`;
      items.splice(index + 1, 1);
    }
    item.prepared = true;
    const voice = getVoicePreference();
    if (voice !== 'browser' && !browserOnly && !isNaturalVoiceLimited() && lang.toLowerCase().startsWith('en')) {
      item.audio = getSpeech(item.text, voice);
      // Kegagalan ditangani saat giliran diputar; cegah peringatan "unhandled rejection".
      item.audio.catch(() => {});
    }
  };

  async function pump(gen: number) {
    playing = true;
    while (gen === generation && items.length > 0) {
      prepare(0);
      const item = items[0];
      let played = false;
      if (item.audio && !browserOnly) {
        try {
          const blob = await item.audio;
          if (gen !== generation) return;
          // Selagi kalimat ini diputar, siapkan berikutnya (kalimat yang masuk sementara ikut digabung).
          prepare(1);
          played = await playBlob(blob);
        } catch {
          browserOnly = true;
        }
      }
      if (gen !== generation) return;
      if (!played) await speakBrowser(item.text);
      if (gen !== generation) return;
      items.shift();
    }
    interrupt = null;
    playing = false;
    options.onIdle?.();
  }

  return {
    enqueue(text) {
      const clean = text.trim();
      if (!clean || typeof window === 'undefined') return;
      // Audio baru diminta saat giliran hampir tiba (prepare), agar kalimat yang menunggu bisa digabung.
      for (const chunk of splitForTts(clean)) items.push({ text: chunk, audio: null, prepared: false });
      if (!playing && items.length > 0) {
        options.onStart?.();
        void pump(generation);
      }
    },
    cancel() {
      generation++;
      items = [];
      playing = false;
      interrupt?.();
      interrupt = null;
      if (browserSupported) window.speechSynthesis.cancel();
    },
    spokenText: () => items.map((i) => i.text).join(' '),
    isBusy: () => playing || items.length > 0,
  };
}
