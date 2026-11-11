-- My Journey — Centang manual tugas Kalender Belajar (Review, Kosakata, Bicara).
-- Aman dijalankan ulang: CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS. Tidak menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris = satu tugas yang dicentang pada satu tanggal lokal pengguna.
-- Membatalkan centang = menghapus barisnya. Tugas Materi & target waktu tidak disimpan di sini
-- karena dicentang otomatis dari learning_progress / learning_sessions.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_checks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_date date not null,
  task_id text not null check (task_id in ('timer', 'lesson', 'review', 'vocab', 'speaking')),
  checked_at timestamptz not null default now(),
  primary key (user_id, local_date, task_id)
);

alter table public.daily_checks enable row level security;

drop policy if exists "daily_checks_select_own" on public.daily_checks;
create policy "daily_checks_select_own" on public.daily_checks
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "daily_checks_insert_own" on public.daily_checks;
create policy "daily_checks_insert_own" on public.daily_checks
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "daily_checks_delete_own" on public.daily_checks;
create policy "daily_checks_delete_own" on public.daily_checks
  for delete to authenticated using (user_id = (select auth.uid()));

-- Tamu (anon) tidak punya akses sama sekali; data tamu tetap di localStorage.
revoke all on public.daily_checks from anon;
