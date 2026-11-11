-- My Journey — koleksi kartu Vocab Builder.
-- Aman dijalankan ulang: hanya CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per kata per pengguna. Kartu dibuat AI (Groq) lalu dilengkapi IPA/audio
-- (Free Dictionary API) dan foto (Pexels). Kata yang sudah ada tidak dibuat ulang.
-- card: objek JSON VocabCard (lihat lib/types.ts), termasuk image & audioUrl bila ada.
-- ---------------------------------------------------------------------------
create table if not exists public.vocab_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 120),
  word_key text generated always as (lower(btrim(word))) stored,
  cefr text not null check (cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  category text not null check (category in ('Daily', 'Business', 'Travel', 'Academic', 'Idioms & Slang')),
  card jsonb not null check (jsonb_typeof(card) = 'object' and pg_column_size(card) <= 16384),
  created_at timestamptz not null default now(),
  constraint vocab_cards_user_word_unique unique (user_id, word_key)
);

create index if not exists vocab_cards_user_filter_idx
  on public.vocab_cards (user_id, cefr, category, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: hanya pemilik (auth.uid()) yang bisa membaca/menulis. Tanpa policy untuk anon.
-- ---------------------------------------------------------------------------
alter table public.vocab_cards enable row level security;

drop policy if exists "vocab_select_own" on public.vocab_cards;
create policy "vocab_select_own" on public.vocab_cards
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "vocab_insert_own" on public.vocab_cards;
create policy "vocab_insert_own" on public.vocab_cards
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "vocab_delete_own" on public.vocab_cards;
create policy "vocab_delete_own" on public.vocab_cards
  for delete to authenticated using (user_id = (select auth.uid()));
