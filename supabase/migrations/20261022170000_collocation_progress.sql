-- My Journey — progres menu Collocation.
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS.
-- Tidak ada operasi yang menghapus data. Membutuhkan fungsi public.set_updated_at dari migrasi learning_data.

-- ---------------------------------------------------------------------------
-- Satu baris per collocation per pengguna. Bentuknya sama dengan oxford_words:
-- baris dibuat saat detail pertama kali dibuka (detail disimpan agar tidak dibuat ulang oleh AI)
-- atau saat collocation ditandai sudah dipelajari.
-- detail: objek JSON StudyDetail (lihat lib/study-list.ts). learned_at null = belum dipelajari.
-- ---------------------------------------------------------------------------
create table if not exists public.collocation_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 120),
  detail jsonb check (detail is null or (jsonb_typeof(detail) = 'object' and pg_column_size(detail) <= 16384)),
  learned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item)
);

drop trigger if exists collocation_progress_updated_at on public.collocation_progress;
create trigger collocation_progress_updated_at
  before update on public.collocation_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.collocation_progress enable row level security;

drop policy if exists "colloc_select_own" on public.collocation_progress;
create policy "colloc_select_own" on public.collocation_progress
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "colloc_insert_own" on public.collocation_progress;
create policy "colloc_insert_own" on public.collocation_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "colloc_update_own" on public.collocation_progress;
create policy "colloc_update_own" on public.collocation_progress
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "colloc_delete_own" on public.collocation_progress;
create policy "colloc_delete_own" on public.collocation_progress
  for delete to authenticated using (user_id = (select auth.uid()));
