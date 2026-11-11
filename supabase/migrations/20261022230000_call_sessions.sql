-- My Journey — riwayat & penilaian Telepon AI.
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per panggilan yang selesai (minimal satu ucapan pengguna).
-- lines: array JSON [{ role: 'user' | 'ai', text, time, correction? }].
-- assessment: penilaian AI setelah panggilan (lihat lib/call-assessment.ts); null bila gagal dibuat.
-- ---------------------------------------------------------------------------
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 200),
  duration_seconds integer not null check (duration_seconds between 0 and 86400),
  user_turns integer not null check (user_turns between 1 and 500),
  overall_score integer check (overall_score between 0 and 100),
  lines jsonb not null
    check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 600
      and pg_column_size(lines) <= 524288),
  assessment jsonb check (assessment is null or jsonb_typeof(assessment) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists call_sessions_user_created_idx
  on public.call_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.call_sessions enable row level security;

drop policy if exists "call_select_own" on public.call_sessions;
create policy "call_select_own" on public.call_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "call_insert_own" on public.call_sessions;
create policy "call_insert_own" on public.call_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "call_delete_own" on public.call_sessions;
create policy "call_delete_own" on public.call_sessions
  for delete to authenticated using (user_id = (select auth.uid()));
