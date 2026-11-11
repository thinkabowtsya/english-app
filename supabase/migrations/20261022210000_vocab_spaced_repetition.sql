-- My Journey — jadwal pengulangan (spaced repetition) untuk kata Oxford 3000 & collocation.
-- Aman dijalankan ulang: hanya ADD COLUMN IF NOT EXISTS dan UPDATE untuk baris yang belum punya jadwal.
-- Tidak ada operasi yang menghapus data.
--
-- review_step: posisi di jadwal (lib/srs.ts: 1, 3, 7, 14, 30, 60 hari). Naik saat jawaban Recall benar,
--   kembali ke 0 saat salah. step >= 3 dianggap "dikuasai".
-- due_at: kapan item perlu diulang; null bila belum ditandai dipelajari.

alter table public.oxford_words
  add column if not exists review_step smallint not null default 0 check (review_step between 0 and 10),
  add column if not exists due_at timestamptz,
  add column if not exists correct_count integer not null default 0 check (correct_count >= 0),
  add column if not exists wrong_count integer not null default 0 check (wrong_count >= 0),
  add column if not exists last_reviewed_at timestamptz;

alter table public.collocation_progress
  add column if not exists review_step smallint not null default 0 check (review_step between 0 and 10),
  add column if not exists due_at timestamptz,
  add column if not exists correct_count integer not null default 0 check (correct_count >= 0),
  add column if not exists wrong_count integer not null default 0 check (wrong_count >= 0),
  add column if not exists last_reviewed_at timestamptz;

-- Item yang sudah ditandai dipelajari sebelum migrasi ini: ulang pertama 1 hari setelah ditandai.
update public.oxford_words set due_at = learned_at + interval '1 day'
  where learned_at is not null and due_at is null;
update public.collocation_progress set due_at = learned_at + interval '1 day'
  where learned_at is not null and due_at is null;

create index if not exists oxford_words_user_due_idx on public.oxford_words (user_id, due_at)
  where learned_at is not null;
create index if not exists collocation_progress_user_due_idx on public.collocation_progress (user_id, due_at)
  where learned_at is not null;
