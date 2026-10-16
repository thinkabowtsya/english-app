/** PRNG kecil (mulberry32) agar pengacakan bisa diulang dari benih yang sama. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mengacak salinan array (Fisher–Yates) secara deterministik dari `seed`. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Mengambil `count` soal untuk putaran ke-`round`. Bank diacak sekali per benih, lalu
 * dibagi per putaran sehingga "Soal lain" menampilkan soal berbeda sebelum mengulang.
 * Mengembalikan indeks asli soal di bank.
 */
export function pickRound(total: number, count: number, seed: number, round: number): number[] {
  if (count >= total) return seededShuffle([...Array(total).keys()], seed);
  const order = seededShuffle([...Array(total).keys()], seed);
  const rounds = Math.ceil(total / count);
  const r = ((round % rounds) + rounds) % rounds;
  const picked = order.slice(r * count, r * count + count);
  // Putaran terakhir bisa kurang: lengkapi dari awal urutan tanpa duplikat.
  for (let i = 0; picked.length < count; i++) if (!picked.includes(order[i])) picked.push(order[i]);
  return picked;
}

/** Benih acak baru — dipanggil di server per request (bukan saat render client). */
export function createSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
