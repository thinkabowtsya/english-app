-- My Journey — riwayat latihan (Latihan grammar, Susun kalimat, Evaluasi, dan mode
-- ketik/dikte/buat kalimat di Vocabulary Recall).
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per sesi latihan yang selesai. Soal dibuat AI dari isi materi (lesson) atau dari
-- kosakata yang sedang dipelajari. items: array JSON PracticeItem (lihat lib/practice.ts),
-- termasuk jawaban pengguna dan hasil pemeriksaannya.
-- ---------------------------------------------------------------------------
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('grammar', 'sentence', 'evaluation', 'vocab-type', 'vocab-dictation', 'vocab-write')),
  title text not null check (char_length(title) between 1 and 200),
  lesson_id text check (lesson_id is null or char_length(lesson_id) <= 80),
  total integer not null check (total between 1 and 30),
  correct integer not null check (correct between 0 and total),
  score integer not null check (score between 0 and 100),
  items jsonb not null
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) = total
      and pg_column_size(items) <= 262144),
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_kind_idx
  on public.practice_sessions (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.practice_sessions enable row level security;

drop policy if exists "practice_select_own" on public.practice_sessions;
create policy "practice_select_own" on public.practice_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "practice_insert_own" on public.practice_sessions;
create policy "practice_insert_own" on public.practice_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "practice_delete_own" on public.practice_sessions;
create policy "practice_delete_own" on public.practice_sessions
  for delete to authenticated using (user_id = (select auth.uid()));
