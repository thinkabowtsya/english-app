-- My Journey — data belajar pribadi.
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Utilitas: updated_at otomatis
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- A. Sesi belajar yang sudah selesai (completed / stopped / interrupted).
--    ID dibuat di browser sehingga penyimpanan ulang (retry) tidak membuat duplikat.
-- ---------------------------------------------------------------------------
create table if not exists public.learning_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Tanggal lokal (zona waktu browser) saat sesi dimulai; dasar hitungan harian & streak.
  local_date date not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  target_seconds integer not null check (target_seconds between 60 and 10800),
  active_seconds integer not null check (active_seconds >= 1 and active_seconds <= target_seconds),
  status text not null check (status in ('completed', 'stopped', 'interrupted')),
  lesson_id text check (char_length(lesson_id) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint learning_sessions_time_order check (ended_at >= started_at),
  -- Waktu aktif tidak boleh melebihi rentang waktu nyata (toleransi 5 detik).
  constraint learning_sessions_active_le_wall
    check (active_seconds <= extract(epoch from (ended_at - started_at)) + 5)
);

create index if not exists learning_sessions_user_date_idx
  on public.learning_sessions (user_id, local_date);

-- ---------------------------------------------------------------------------
-- B. Progres per item pembelajaran (ID stabil dari kurikulum).
-- ---------------------------------------------------------------------------
create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 120),
  module_id text not null check (char_length(module_id) between 1 and 120),
  status text not null check (status in ('in_progress', 'completed', 'needs_review')),
  last_score numeric,
  last_studied_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint learning_progress_user_item_key unique (user_id, item_id)
);

drop trigger if exists learning_progress_updated_at on public.learning_progress;
create trigger learning_progress_updated_at
  before update on public.learning_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- C. Pengaturan belajar yang disinkronkan lintas perangkat.
--    (Tema, suara, dan notifikasi tetap preferensi lokal per perangkat.)
-- ---------------------------------------------------------------------------
create table if not exists public.learning_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  daily_goal_minutes integer not null default 30 check (daily_goal_minutes between 5 and 600),
  default_session_minutes integer not null default 25 check (default_session_minutes between 1 and 180),
  coach_difficulty text not null default 'intermediate'
    check (coach_difficulty in ('beginner', 'intermediate', 'advanced')),
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_settings_updated_at on public.learning_settings;
create trigger learning_settings_updated_at
  before update on public.learning_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- D. Daftar review: materi/pola yang perlu diulang dan frasa yang disimpan.
-- ---------------------------------------------------------------------------
create table if not exists public.review_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'pattern', 'phrase')),
  label text not null check (char_length(label) between 1 and 500),
  note text check (char_length(note) <= 1000),
  reason text not null default '' check (char_length(reason) <= 300),
  item_id text check (char_length(item_id) between 1 and 120),
  source text not null check (source in ('manual', 'evaluation', 'ai-coach')),
  next_review_at timestamptz,
  fail_count integer not null default 0 check (fail_count >= 0),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists review_items_user_idx on public.review_items (user_id, resolved_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: setiap pengguna hanya bisa mengakses barisnya sendiri.
-- Kepemilikan ditentukan oleh auth.uid() dari JWT, bukan nilai dari browser.
-- Tidak ada policy untuk role anon → pengunjung tanpa login tidak bisa membaca/menulis.
-- ---------------------------------------------------------------------------
alter table public.learning_sessions enable row level security;
alter table public.learning_progress enable row level security;
alter table public.learning_settings enable row level security;
alter table public.review_items enable row level security;

-- learning_sessions: baca, tambah, hapus (reset progres). Tidak ada UPDATE: sesi tercatat bersifat final.
drop policy if exists "sessions_select_own" on public.learning_sessions;
create policy "sessions_select_own" on public.learning_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "sessions_insert_own" on public.learning_sessions;
create policy "sessions_insert_own" on public.learning_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "sessions_delete_own" on public.learning_sessions;
create policy "sessions_delete_own" on public.learning_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- learning_progress
drop policy if exists "progress_select_own" on public.learning_progress;
create policy "progress_select_own" on public.learning_progress
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "progress_insert_own" on public.learning_progress;
create policy "progress_insert_own" on public.learning_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "progress_update_own" on public.learning_progress;
create policy "progress_update_own" on public.learning_progress
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "progress_delete_own" on public.learning_progress;
create policy "progress_delete_own" on public.learning_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- learning_settings
drop policy if exists "settings_select_own" on public.learning_settings;
create policy "settings_select_own" on public.learning_settings
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "settings_insert_own" on public.learning_settings;
create policy "settings_insert_own" on public.learning_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "settings_update_own" on public.learning_settings;
create policy "settings_update_own" on public.learning_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- review_items
drop policy if exists "reviews_select_own" on public.review_items;
create policy "reviews_select_own" on public.review_items
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "reviews_insert_own" on public.review_items;
create policy "reviews_insert_own" on public.review_items
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "reviews_update_own" on public.review_items;
create policy "reviews_update_own" on public.review_items
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "reviews_delete_own" on public.review_items;
create policy "reviews_delete_own" on public.review_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Role anon tidak membutuhkan hak apa pun pada tabel ini.
revoke all on public.learning_sessions, public.learning_progress, public.learning_settings, public.review_items from anon;
