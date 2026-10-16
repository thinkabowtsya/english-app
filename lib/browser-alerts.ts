/** Suara & notifikasi browser untuk akhir sesi. Semua fungsi aman dipanggil walau API tidak tersedia. */

type AudioCtor = typeof AudioContext;
let audioContext: AudioContext | null = null;

function getAudioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Browser hanya mengizinkan audio setelah interaksi pengguna. Panggil dari handler klik
 * (mis. tombol "Mulai Belajar") agar bunyi di akhir sesi dapat diputar.
 */
export function unlockAudio() {
  const Ctor = getAudioCtor();
  if (!Ctor) return;
  try {
    audioContext ??= new Ctor();
    if (audioContext.state === 'suspended') void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

export function playChime() {
  if (!audioContext) return;
  try {
    const ctx = audioContext;
    const start = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch {
    // Audio tidak tersedia — notifikasi visual tetap tampil.
  }
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function showBrowserNotification(title: string, body: string) {
  if (!notificationSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: 'learning-session' });
  } catch {
    // Beberapa browser mobile hanya mengizinkan notifikasi via service worker.
  }
}
