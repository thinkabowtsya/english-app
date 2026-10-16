# Antigravity English — Personal Learning Workspace

Aplikasi web **personal (single-user)** untuk belajar bahasa Inggris secara terstruktur: timer belajar harian,
target harian, progres pribadi, kerangka kurikulum, dan AI English Coach berbasis Groq.

> Belum ada autentikasi. Progres disimpan di `localStorage` browser — bukan penyimpanan aman dan tidak
> tersinkron antar perangkat. Jangan simpan informasi sensitif di dalam aplikasi.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # lalu isi GROQ_API_KEY
npm run dev                  # http://localhost:3000
```

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Unit test (Vitest) |

### Environment (`.env.local`, hanya dibaca server)

| Variabel | Keterangan |
| --- | --- |
| `GROQ_API_KEY` | API key Groq. Tanpa ini AI Coach otomatis memakai **mock response** (ditandai jelas di UI). |
| `GROQ_BASE_URL` | Opsional, default `https://api.groq.com/openai/v1`. |
| `GROQ_MODEL` | Opsional, default `openai/gpt-oss-120b`. (`llama-3.3-70b-versatile` sudah tidak tersedia di Groq.) |
| `AI_PROVIDER` | Opsional. `mock` memaksa mock walau API key ada. |

Jangan pernah memakai prefix `NEXT_PUBLIC_` untuk secret. Browser tidak memanggil Groq langsung — semua lewat Route Handler.

## Fitur

**Berfungsi**
- **Dashboard**: sapaan & tanggal lokal, ringkasan hari ini, Daily Learning Timer, target harian (bisa diubah),
  lanjutkan belajar, ringkasan progres, rekomendasi berikutnya (aturan statis — bukan AI).
- **Timer** (`lib/timer.ts`): berbasis timestamp, bukan jumlah tick `setInterval`.
  - Pause benar-benar menghentikan waktu aktif; resume melanjutkan sisa waktu.
  - Selesai otomatis saat nol → dialog ringkasan + suara/notifikasi browser opsional.
  - Berhenti lebih awal minta konfirmasi dan mencatat **durasi aktual** (status `stopped`).
  - Reload singkat → timer lanjut. Browser tertutup/perangkat tidur > 2,5 menit → waktu setelah aktivitas terakhir
    tidak dihitung dan timer dijeda otomatis. Sesi yang dijeda lalu berganti hari dicatat `interrupted`.
  - Pencatatan idempoten berdasarkan ID sesi (aman dari klik ganda / multi-tab).
  - Durasi sesi dihitung ke tanggal lokal saat sesi dimulai.
- **Progres Saya**: total waktu, sesi selesai, hari aktif, streak (hanya dari sesi ≥ 1 menit/hari — membuka
  dashboard tidak menambah streak), grafik 7 hari, riwayat sesi, materi, evaluasi, item review.
- **Materi**: struktur Level → Modul → Materi → Aktivitas dengan status `locked/available/in_progress/completed/needs_review`.
- **Latihan**: daftar review (materi, pola, frasa dari AI Coach) dengan aksi recall sederhana.
- **Percakapan AI**: 4 mode (Help Me Say It, Free Conversation, Role-play, Correct My English), tingkat kesulitan,
  penjelasan grammar, simpan frasa ke review, riwayat per tab (sessionStorage), state loading/error/retry, penanda mock.
- **Pengaturan**: nama, target harian, durasi default, tema (sistem/terang/gelap), suara & notifikasi, tingkat AI,
  ekspor data JSON, reset progres (wajib ketik `RESET`).
- **Keamanan endpoint AI**: validasi Zod, batas ukuran body, rate limit 30 req/menit/IP, error generik tanpa detail internal.

**Masih placeholder**
- Konten kurikulum (`data/curriculum/placeholder.ts`) — judul, penjelasan, soal, dan evaluasi belum diisi.
- Bank soal latihan & evaluasi (`ExerciseContainer` menampilkan "Soal belum tersedia").
- Fitur lama `/call`, `/practice`, `/vocabulary`, `/pronunciation` tetap berjalan (tema gelap sendiri) tetapi belum
  tercatat di progres.
- Rate limit disimpan di memori proses: di hosting serverless batasnya per instance — gunakan store terpusat
  (mis. Redis) sebelum aplikasi dipublikasikan.

## Struktur

```
app/                    Halaman (App Router) & Route Handlers (app/api/*)
  (legacy)/             Halaman latihan lama, dibungkus layout gelap
components/ui/          Komponen UI reusable (Button, Card, Modal, Alert, …)
components/app-shell/   Sidebar, navigasi mobile, sinkronisasi tema
features/dashboard/     Dashboard & timer
features/timer/         Controller timer global, pill, dialog ringkasan
features/learning/      Materi, latihan, progres (+ ModuleCard, LessonCard, LessonHeader,
                        LessonContent, ExerciseContainer, ProgressIndicator, ReviewReminder)
features/ai-coach/      UI AI Coach & klien /api/coach
features/settings/      Halaman pengaturan
lib/                    Logika murni (timer, progres, tanggal, kurikulum) + storage + util server
services/ai/            Interface AiCoachService, implementasi mock & Groq, prompt
types/                  Tipe TypeScript
data/curriculum/        Metadata kurikulum (dipisah dari komponen UI)
```

### Penyimpanan

`localStorage['english-app:data']` berisi `AppData` dengan `schemaVersion` (lihat `lib/storage/schema.ts`).
Saat struktur berubah, naikkan versi dan tambahkan langkah di `migrateData`. Data yang tidak bisa dibaca
dicadangkan ke `english-app:backup:<timestamp>` sebelum diganti data baru. Timer aktif disimpan terpisah di
`english-app:active-timer`.

### Menambah kurikulum

Buat file data baru di `data/curriculum/` mengikuti tipe di `types/curriculum.ts`, lalu daftarkan di
`data/curriculum/index.ts`. ID materi menjadi kunci progres — jangan diubah setelah dipakai.
