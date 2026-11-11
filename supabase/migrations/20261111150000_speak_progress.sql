-- My Journey — Progres menu Speak (latihan percakapan per topik).
-- Aman dijalankan ulang: CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS. Tidak menghapus data.

-- ---------------------------------------------------------------------------
-- Satu baris per topik per pengguna: skor terbaik, skor terakhir, dan jumlah percobaan.
-- topic_id mengikuti data/speak/topics.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.speak_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id text not null check (char_length(topic_id) between 1 and 60),
  best_score smallint not null check (best_score between 0 and 100),
  last_score smallint not null check (last_score between 0 and 100),
  attempts integer not null default 1 check (attempts >= 1),
  last_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.speak_progress enable row level security;

drop policy if exists "speak_progress_select_own" on public.speak_progress;
create policy "speak_progress_select_own" on public.speak_progress
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "speak_progress_insert_own" on public.speak_progress;
create policy "speak_progress_insert_own" on public.speak_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "speak_progress_update_own" on public.speak_progress;
create policy "speak_progress_update_own" on public.speak_progress
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "speak_progress_delete_own" on public.speak_progress;
create policy "speak_progress_delete_own" on public.speak_progress
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.speak_progress from anon;
