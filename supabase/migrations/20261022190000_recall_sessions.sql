-- My Journey — riwayat Vocabulary Recall.
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per sesi kuis yang sudah selesai. Soal dibuat AI dari kata Oxford 3000 dan
-- collocation (utamanya yang sudah ditandai "sudah dipelajari").
-- questions: array JSON RecallQuestion (lihat lib/recall.ts), termasuk jawaban pengguna (chosen).
-- ---------------------------------------------------------------------------
create table if not exists public.recall_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('mix', 'oxford', 'collocation')),
  total integer not null check (total between 1 and 20),
  correct integer not null check (correct between 0 and total),
  questions jsonb not null
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = total
      and pg_column_size(questions) <= 65536),
  created_at timestamptz not null default now()
);

create index if not exists recall_sessions_user_created_idx
  on public.recall_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.recall_sessions enable row level security;

drop policy if exists "recall_select_own" on public.recall_sessions;
create policy "recall_select_own" on public.recall_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "recall_insert_own" on public.recall_sessions;
create policy "recall_insert_own" on public.recall_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "recall_delete_own" on public.recall_sessions;
create policy "recall_delete_own" on public.recall_sessions
  for delete to authenticated using (user_id = (select auth.uid()));
