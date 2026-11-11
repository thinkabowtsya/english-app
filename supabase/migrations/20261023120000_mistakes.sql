-- My Journey — Buku kesalahan pribadi.
-- Aman dijalankan ulang: CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS / ADD COLUMN IF NOT EXISTS,
-- dan constraint kind practice_sessions dibuat ulang dengan daftar yang lebih lengkap.
-- Tidak ada operasi yang menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per kesalahan yang ditemukan di Telepon AI (koreksi per kalimat) dan latihan
-- (jawaban salah). pattern = pola kesalahan (lihat lib/mistakes.ts), dipakai untuk mengelompokkan
-- dan membuat latihan khusus. source_ref + ref_key membuat pengumpulan ulang tidak menggandakan data.
-- status: open (masih perlu dilatih) · resolved (latihan pola ≥ 80%) · dismissed (bukan kesalahan).
-- ---------------------------------------------------------------------------
create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('call', 'practice')),
  source_ref uuid not null,
  ref_key text not null check (char_length(ref_key) between 1 and 40),
  pattern text not null check (char_length(pattern) between 1 and 40),
  wrong text not null check (char_length(wrong) between 1 and 500),
  correct text not null check (char_length(correct) between 1 and 500),
  explanation text check (explanation is null or char_length(explanation) <= 800),
  context text check (context is null or char_length(context) <= 600),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint mistakes_source_unique unique (user_id, source_ref, ref_key)
);

create index if not exists mistakes_user_pattern_idx on public.mistakes (user_id, pattern, status, created_at desc);

alter table public.mistakes enable row level security;

drop policy if exists "mistakes_select_own" on public.mistakes;
create policy "mistakes_select_own" on public.mistakes
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "mistakes_insert_own" on public.mistakes;
create policy "mistakes_insert_own" on public.mistakes
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "mistakes_update_own" on public.mistakes;
create policy "mistakes_update_own" on public.mistakes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "mistakes_delete_own" on public.mistakes;
create policy "mistakes_delete_own" on public.mistakes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- practice_sessions: jenis baru 'mistakes' (latihan dari pola kesalahan) + kolom pattern.
-- ---------------------------------------------------------------------------
alter table public.practice_sessions drop constraint if exists practice_sessions_kind_check;
alter table public.practice_sessions add constraint practice_sessions_kind_check
  check (kind in ('grammar', 'sentence', 'evaluation', 'vocab-type', 'vocab-dictation', 'vocab-write', 'mistakes'));
alter table public.practice_sessions
  add column if not exists pattern text check (pattern is null or char_length(pattern) between 1 and 40);
