-- My Journey — riwayat sesi Tanya Tutor.
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS.
-- Tidak ada operasi yang menghapus data. Membutuhkan fungsi public.set_updated_at dari migrasi learning_data.

-- ---------------------------------------------------------------------------
-- Satu baris per sesi tanya jawab dengan tutor. Disimpan saat pengguna memulai sesi baru.
-- ID dibuat di browser: sesi lama yang dibuka lalu dilanjutkan disimpan ulang ke baris yang sama.
-- messages: array JSON [{ "role": "user" | "assistant", "content": text, "createdAt": epoch ms }].
-- ---------------------------------------------------------------------------
create table if not exists public.tutor_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  messages jsonb not null
    check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) between 1 and 400),
  message_count integer not null check (message_count between 1 and 400),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_sessions_time_order check (ended_at >= started_at),
  -- Batasi ukuran satu sesi (±1 MB) agar tetap ringan di paket Free.
  constraint tutor_sessions_size check (pg_column_size(messages) <= 1048576)
);

create index if not exists tutor_sessions_user_ended_idx
  on public.tutor_sessions (user_id, ended_at desc);

drop trigger if exists tutor_sessions_updated_at on public.tutor_sessions;
create trigger tutor_sessions_updated_at
  before update on public.tutor_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.tutor_sessions enable row level security;

drop policy if exists "tutor_select_own" on public.tutor_sessions;
create policy "tutor_select_own" on public.tutor_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "tutor_insert_own" on public.tutor_sessions;
create policy "tutor_insert_own" on public.tutor_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "tutor_update_own" on public.tutor_sessions;
create policy "tutor_update_own" on public.tutor_sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "tutor_delete_own" on public.tutor_sessions;
create policy "tutor_delete_own" on public.tutor_sessions
  for delete to authenticated using (user_id = (select auth.uid()));
