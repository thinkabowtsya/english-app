# My Journey — English Learning

Aplikasi web **pribadi** untuk belajar bahasa Inggris secara terstruktur: timer belajar harian, target harian,
progres pribadi, materi bertingkat, dan AI English Coach berbasis Groq.

- **Tanpa login (mode tamu)**: semua fitur bisa dipakai; progres tersimpan di `localStorage` browser itu saja.
- **Dengan login (satu akun pribadi)**: progres tersimpan di Supabase PostgreSQL dan tersinkron antar perangkat.

## 1. Instalasi & menjalankan lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya (lihat bagian 3)
npm run dev                  # http://localhost:3000
```

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Unit test (Vitest) |

## 2. Membuat proyek Supabase Free

1. Buat proyek baru di [supabase.com](https://supabase.com/dashboard) (paket Free cukup).
2. Catat **Project URL** dan **Publishable key** di *Project Settings → API Keys*.
   Jangan pakai *secret key* / *service_role* di aplikasi ini.

## 3. Environment variables

| Variabel | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`). Aman di browser **karena** semua tabel memakai RLS. |
| `GROQ_API_KEY` | API key Groq — hanya dibaca di server. Tanpa ini AI Coach memakai **mock response** (ditandai jelas). |
| `GROQ_BASE_URL` | Opsional, default `https://api.groq.com/openai/v1`. |
| `GROQ_MODEL` | Opsional, default `openai/gpt-oss-120b` (`llama-3.3-70b-versatile` sudah dihentikan Groq). |
| `AI_PROVIDER` | Opsional. `mock` memaksa mock walau API key ada. |

Aturan: jangan commit `.env.local`, jangan pakai prefix `NEXT_PUBLIC_` untuk Groq atau secret apa pun.
Tanpa variabel Supabase, aplikasi tetap jalan dalam mode tamu.

## 4. Menjalankan migrasi database

File migrasi (jalankan berurutan; semuanya aman dijalankan ulang, tidak menghapus data):

- `supabase/migrations/20261016120000_learning_data.sql`
- `supabase/migrations/20261016150000_tutor_sessions.sql` (riwayat Tanya Tutor)

1. Buka *SQL Editor → New query* di dashboard Supabase.
2. Tempel seluruh isi tiap file migrasi, klik **Run**. Supabase akan memperingatkan "destructive operations" karena ada
   `DROP POLICY/TRIGGER IF EXISTS` — itu hanya untuk membuat ulang policy/trigger milik migrasi ini, bukan data.

Tabel yang dibuat (semua dengan RLS aktif, akses hanya untuk role `authenticated` dan hanya baris milik sendiri
lewat `user_id = auth.uid()`):

| Tabel | Isi | Hak pengguna |
| --- | --- | --- |
| `learning_sessions` | Sesi belajar selesai: mulai, selesai, `active_seconds`, status, tanggal lokal | select, insert, delete |
| `learning_progress` | Progres per materi (unik per `user_id + item_id`), status review | select, insert, update, delete |
| `learning_settings` | Target harian, durasi sesi default, nama, tingkat AI | select, insert, update |
| `review_items` | Materi/pola/frasa yang perlu diulang | select, insert, update, delete |
| `tutor_sessions` | Riwayat sesi Tanya Tutor (pesan disimpan sebagai JSON), disimpan saat menekan "Sesi baru" | select, insert, update, delete |

## 5. Membuat akun pribadi pertama

Aplikasi **tidak** menyediakan pendaftaran publik. Buat akun lewat dashboard:

1. *Authentication → Users → Add user → Create new user*.
2. Isi email dan password yang kuat, centang **Auto Confirm User**, simpan.
3. Login di `/login`.
4. Setelah login berhasil, matikan pendaftaran publik: *Authentication → Sign In / Providers →*
   nonaktifkan **Allow new users to sign up**. (Jangan dimatikan sebelum akun pertama berhasil dibuat & login.)

## 6. Memverifikasi RLS

Jalankan di SQL Editor (hanya membaca):

```sql
select c.relname, c.relrowsecurity as rls,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
  has_table_privilege('anon', c.oid, 'select') as anon_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('learning_sessions','learning_progress','learning_settings','review_items');
```

Hasil yang benar: `rls = true`, `policies` 3–4, `anon_select = false`. Uji dari luar tanpa login juga harus ditolak:

```bash
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/learning_sessions?select=id" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
```

Respons yang diharapkan: `permission denied for table learning_sessions`.

## 7. Deploy ke Netlify

1. Push repository ke GitHub, lalu *Add new site → Import an existing project* di Netlify.
2. Build sudah diatur di `netlify.toml` (`npm run build`, plugin `@netlify/plugin-nextjs`).
3. *Site configuration → Environment variables*: isi `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GROQ_API_KEY` (dan opsional `GROQ_MODEL`). Deploy ulang setelah mengubahnya.
4. Di Supabase *Authentication → URL Configuration*, isi **Site URL** dengan domain Netlify.

## 8. Menguji setelah setup

- **Login**: buka `/login`, masuk dengan akun pribadi; nama/email tampil di sidebar; reload → tetap login.
- **Timer & sinkron**: jalankan sesi singkat (mis. durasi khusus 1 menit) → dialog menunjukkan "Tersimpan ke cloud";
  baris baru muncul di tabel `learning_sessions`; buka aplikasi di perangkat lain → angka di dashboard sama.
- **Offline**: matikan jaringan, selesaikan sesi → banner "sesi belum tersimpan" muncul; nyalakan jaringan → terkirim
  otomatis tanpa duplikat.
- **Mode tamu**: logout → aplikasi tetap bisa dipakai, data tersimpan di browser saja.

## 9. Batasan paket gratis & yang perlu dipantau

- **Supabase Free**: proyek dijeda setelah ±1 minggu tanpa aktivitas (aktifkan lagi dari dashboard); database
  500 MB; kuota bandwidth & MAU terbatas. Data aplikasi ini sangat kecil, tetapi pantau *Reports* sesekali.
- **Groq**: ada batas request/token per menit & per hari sesuai paket; respons 429 ditampilkan sebagai "kuota penuh".
- **Netlify Free**: kuota build minutes & bandwidth bulanan.
- **Mode tamu + AI**: endpoint AI dapat dipakai tanpa login (dibatasi rate limit 30 req/menit per pengguna/IP).
  Rate limit disimpan di memori proses, jadi di Netlify (serverless) batasnya per instance. Jika aplikasi dibuka
  publik, pertimbangkan mewajibkan login untuk AI atau memakai rate limit terpusat.

## Fitur

- **Dashboard**: ringkasan hari ini, Daily Learning Timer, target harian, lanjutkan belajar, ringkasan progres,
  rekomendasi berikutnya (aturan statis — bukan AI).
- **Timer** (`lib/timer.ts`): berbasis timestamp. Pause tidak dihitung; selesai otomatis; berhenti lebih awal minta
  konfirmasi dan mencatat **durasi aktual**; browser tertutup/perangkat tidur > 2,5 menit → waktu setelah aktivitas
  terakhir tidak dihitung; sesi dijeda yang berganti hari dicatat `interrupted`; pencatatan idempoten per ID sesi.
- **Definisi hari aktif & streak**: hari dihitung berdasarkan **zona waktu browser saat sesi dimulai** (`local_date`).
  Hari aktif = total waktu aktif hari itu ≥ 1 menit. Streak = hari aktif berturut-turut; jika hari ini belum belajar,
  streak dari kemarin tetap berlaku sampai hari berganti. Membuka aplikasi tidak menambah streak.
- **Materi**: Level → Modul → Materi → Aktivitas. **Modul 1 — Grammar Dasar Sederhana** sudah berisi 8 materi
  lengkap; materi terbuka berurutan.
- **Latihan**: daftar review (materi, pola, frasa) + alat latihan `/vocabulary`, `/pronunciation`.
- **Percakapan AI**: 4 mode, tingkat kesulitan, penjelasan grammar, simpan frasa, penanda mock, `/call`, `/practice`.
- **Pengaturan**: target, durasi default, tema, suara, notifikasi, ekspor JSON, reset progres (ketik `RESET`),
  impor data lokal versi lama ke akun (hanya dengan konfirmasi).

**Masih placeholder**: Modul 2 dan modul berikutnya; riwayat evaluasi belum disinkronkan ke cloud.

## Struktur

```
app/                    Halaman (App Router), /login, Route Handlers (app/api/*)
  (legacy)/             Alat latihan (call, practice, vocabulary, pronunciation)
proxy.ts                Refresh sesi Supabase (Next 16 "proxy", pengganti middleware)
components/app-shell/   Sidebar, navigasi, loader data cloud/tamu, tema
features/               dashboard, timer, learning, ai-coach, settings
lib/storage/            Store di memori, actions, mapping Supabase (remote.ts), outbox sesi, preferensi lokal
lib/supabase/           Klien browser/server Supabase
services/ai/            AiCoachService (mock & Groq)
supabase/migrations/    Migrasi SQL
data/curriculum/        Konten kurikulum (module-1.ts) & placeholder
```

### Penyimpanan

| Data | Login | Tamu |
| --- | --- | --- |
| Sesi, progres materi, review, pengaturan belajar | Supabase | `localStorage['english-app:guest-data']` |
| Sesi yang belum terkirim (offline) | `localStorage['english-app:outbox:<userId>']` → dikirim ulang otomatis | — |
| Timer yang sedang berjalan | `localStorage['english-app:active-timer']` | sama |
| Tema, suara, notifikasi | `localStorage['english-app:prefs']` (per perangkat) | sama |

Data lokal versi lama (`english-app:data`) tidak dihapus; tamu melanjutkan darinya, dan pengguna login dapat
mengimpornya dari Pengaturan.

### Menambah kurikulum

Buat file data di `data/curriculum/` mengikuti `types/curriculum.ts` (lihat `module-1.ts`), lalu daftarkan di
`data/curriculum/placeholder.ts` / `index.ts`. ID materi menjadi kunci progres — jangan diubah setelah dipakai.
