/**
 * Helper murni untuk panggilan suara yang terasa seperti telepon biasa:
 * balasan diucapkan per kalimat saat masih di-stream, dan pengguna bisa memotong AI.
 */

/**
 * Mengambil kalimat lengkap dari buffer teks stream. Kalimat dianggap lengkap bila diakhiri
 * . ! ? … lalu spasi/baris baru (agar "3.5" atau "e.g." di tengah tidak terpotong lebih awal).
 */
export function takeSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let begin = 0;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    let endAt = -1;
    if (ch === '\n') endAt = i;
    else if ('.!?…'.includes(ch)) {
      let j = i;
      while (j + 1 < buffer.length && '.!?…'.includes(buffer[j + 1])) j++;
      // Hanya selesai bila diikuti spasi (bukan "8.3" atau akhir buffer yang masih di-stream).
      if (j + 1 < buffer.length && /\s/.test(buffer[j + 1])) endAt = j;
      i = j;
    }
    if (endAt >= 0) {
      const sentence = buffer.slice(begin, endAt + 1).trim();
      if (sentence) sentences.push(sentence);
      begin = endAt + 1;
    }
  }
  return { sentences, rest: buffer.slice(begin) };
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Mendeteksi apakah yang "terdengar" oleh mikrofon kemungkinan adalah suara AI sendiri
 * (gema dari speaker): sebagian besar katanya ada di kalimat yang sedang diucapkan AI.
 */
export function isLikelyEcho(heard: string, aiSpeech: string): boolean {
  const h = words(heard);
  if (h.length === 0) return true;
  const ai = new Set(words(aiSpeech));
  if (ai.size === 0) return false;
  const overlap = h.filter((w) => ai.has(w)).length / h.length;
  return overlap >= 0.7;
}

/** Pengguna mulai bicara (minimal 2 kata, bukan gema) → AI berhenti bicara. */
export function shouldBargeIn(heard: string, aiSpeech: string): boolean {
  return words(heard).length >= 2 && !isLikelyEcho(heard, aiSpeech);
}

export interface MicErrorInfo {
  /** Pesan untuk pengguna; null = bukan masalah (mis. diam sejenak). */
  message: string | null;
  /** true = jangan dinyalakan ulang otomatis (perlu tindakan pengguna). */
  fatal: boolean;
}

/** Terjemahkan kode error Web Speech Recognition menjadi pesan yang bisa ditindaklanjuti. */
export function micErrorInfo(error: string): MicErrorInfo {
  switch (error) {
    case 'no-speech':
    case 'aborted':
      return { message: null, fatal: false };
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        message: 'Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser, lalu tekan tombol mikrofon.',
        fatal: true,
      };
    case 'audio-capture':
      return { message: 'Mikrofon tidak terdeteksi. Periksa mikrofon/headset, lalu tekan tombol mikrofon.', fatal: true };
    case 'network':
      return { message: 'Pengenalan suara butuh koneksi internet yang stabil. Mencoba lagi…', fatal: false };
    case 'language-not-supported':
      return { message: 'Browser ini tidak mendukung pengenalan suara bahasa Inggris.', fatal: true };
    default:
      return { message: `Mikrofon bermasalah (${error}). Mencoba lagi…`, fatal: false };
  }
}
