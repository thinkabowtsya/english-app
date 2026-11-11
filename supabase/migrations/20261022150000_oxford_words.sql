-- My Journey — progres daftar kata Oxford 3000 (menu Oxford 3000).
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per kata per pengguna. Baris dibuat saat detail kata pertama kali dibuka
-- (detail disimpan agar tidak dibuat ulang oleh AI) atau saat kata ditandai sudah dipelajari.
-- detail: objek JSON OxfordDetail (lihat lib/oxford.ts): arti, contoh, kata serupa, audio.
-- learned_at: kapan kata ditandai sudah dipelajari; null = belum.
-- ---------------------------------------------------------------------------
create table if not exists public.oxford_words (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 60),
  detail jsonb check (detail is null or (jsonb_typeof(detail) = 'object' and pg_column_size(detail) <= 16384)),
  learned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

drop trigger if exists oxford_words_updated_at on public.oxford_words;
create trigger oxford_words_updated_at
  before update on public.oxford_words
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.oxford_words enable row level security;

drop policy if exists "oxford_select_own" on public.oxford_words;
create policy "oxford_select_own" on public.oxford_words
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "oxford_insert_own" on public.oxford_words;
create policy "oxford_insert_own" on public.oxford_words
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "oxford_update_own" on public.oxford_words;
create policy "oxford_update_own" on public.oxford_words
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "oxford_delete_own" on public.oxford_words;
create policy "oxford_delete_own" on public.oxford_words
  for delete to authenticated using (user_id = (select auth.uid()));
