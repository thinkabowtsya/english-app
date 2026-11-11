# Daily Material Progress

Catatan kerja rutinitas harian penambahan materi (bukan fitur aplikasi). Satu eksekusi = satu unit.
Rekap Excel: `D:\myapps\english-materi-harian.xlsx` (dibangun dari `D:\myapps\_routine\progress.json`
lewat `python -I D:\myapps\_routine\build_excel.py`).

**Terakhir diperbarui:** 2026-10-22
**Unit berikutnya:** `level-1-m2-l6` — Modul 2 · 2.6 Adverbs

## Kurikulum tetap Modul 1–10

| Modul | Judul | Status |
| --- | --- | --- |
| 1 | Basic Sentence Foundations (di app: "Grammar Dasar Sederhana") | Lengkap (8 unit) — jangan diubah |
| 2 | Parts of Speech | 5/10 unit |
| 3 | Sentence Building & Expansion | Belum mulai |
| 4 | Simple Past & Past Experiences | Belum mulai |
| 5 | Future Forms & Plans | Belum mulai |
| 6 | Question Forms & Two-Way Conversation | Belum mulai |
| 7 | Modal Verbs for Practical Communication | Belum mulai |
| 8 | Present Continuous & Ongoing Situations | Belum mulai |
| 9 | Present Perfect Foundations | Belum mulai |
| 10 | Practical Speaking & Extended Explanations | Belum mulai |

## Modul 2 — rincian unit

| ID | Unit | Status |
| --- | --- | --- |
| level-1-m2-l1 | Pengenalan Parts of Speech | ✅ ready (2026-10-16) |
| level-1-m2-l2 | Nouns | ✅ ready (2026-10-19) |
| level-1-m2-l3 | Pronouns | ✅ ready (2026-10-21) |
| level-1-m2-l4 | Verbs | ✅ ready (2026-10-22) |
| level-1-m2-l5 | Adjectives | ✅ ready (2026-10-22) |
| level-1-m2-l6 | Adverbs | placeholder |
| level-1-m2-l7 | Prepositions | placeholder |
| level-1-m2-l8 | Conjunctions | placeholder |
| level-1-m2-l9 | Articles dan Determiners | placeholder |
| level-1-m2-l10 | Mengidentifikasi Fungsi Kata | placeholder |

## Cara menambah unit (untuk eksekusi berikutnya)

1. Katalog: ubah `planned(...)` unit tersebut di `data/curriculum/module-2.ts` menjadi objek dengan `contentStatus: 'ready'`.
2. Isi: tambahkan entri `'level-1-m2-lN'` di `module2Content` (`data/curriculum/content/module-2.ts`).
   Bank soal ditulis langsung per aktivitas dengan `pickCount`; ID aktivitas berprefiks `m2-lN-`.
   Jangan lewatkan Modul 2+ ke `withExerciseBanks` Modul 1 (bank itu dipetakan per nomor materi).
3. Modul baru (3 dst.): buat `data/curriculum/module-N.ts` + `content/module-N.ts`, daftarkan di
   `data/curriculum/placeholder.ts` dan `lib/curriculum-content.ts`, lalu tambahkan tes di `lib/curriculum-content.test.ts`.
4. Validasi: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
5. Perbarui file ini, `D:\myapps\_routine\progress.json`, lalu bangun ulang Excel.

## Log

### 2026-10-16 — level-1-m2-l1 Pengenalan Parts of Speech
- Konten: 8 jenis kata & fungsinya, peran vs jenis kata, menebak jenis dari posisi, adjective sebelum noun,
  satu kata dua fungsi (test/update/fast), akhiran noun vs adjective; 5 pola, 6 contoh beranotasi, 3 perbandingan,
  5 kesalahan umum, ungkapan, dialog.
- Latihan: Kenali jenis kata (12 soal, acak 5), Pilih kata yang pas (10, acak 4), Susun kalimat (7, acak 3),
  Satu kata dua fungsi (6), Produksi kalimat terbuka (6, acak 2), Kembangkan menjadi penjelasan (2, terbuka),
  Recall (8), Evaluasi (6).
- Integrasi: katalog Modul 2 (10 unit, 9 masih placeholder) menggantikan placeholder "Modul 2" lama.
- Validasi: typecheck OK, lint OK, test 89/89 OK, build OK.
- Kendala: render halaman tidak dicek via HTTP karena app mewajibkan login saat Supabase dikonfigurasi
  (dev server port 3000 milik pengguna dibiarkan berjalan).

### 2026-10-19 — level-1-m2-l2 Nouns
- Konten: posisi noun (subject/object/setelah preposition/complement), countable vs uncountable (information, data,
  feedback, advice, software, code, equipment), countable tunggal wajib article, a piece of / a line of, many vs a lot of,
  aturan plural (-s, -es, -ies, vokal+y, tidak beraturan), kesesuaian verb, noun + noun; 5 pola, 7 contoh,
  4 perbandingan, 7 kesalahan umum, 4 ungkapan, dialog tiket klien.
- Latihan: Countable/uncountable (12, acak 5), Bentuk plural (14, acak 5), Pilih bentuk yang benar (10, acak 4),
  Susun kalimat (7, acak 3), Produksi terbuka (6, acak 2), Kembangkan menjadi penjelasan (2, terbuka), Recall (8), Evaluasi (6).
- Tes: placeholder check dipindah ke l3; tambah tes prefiks ID aktivitas `m2-lN-` dan bank soal 2.2.
- Validasi: typecheck OK, lint OK, test 95/95 OK, build OK.
- Kendala: render halaman tidak dicek via HTTP (login Supabase); dev server port 3000 tidak disentuh.

### 2026-10-21 — level-1-m2-l3 Pronouns
- Konten: bentuk pronoun menurut posisi (subject/object/possessive adjective/possessive pronoun), object setelah verb &
  preposition, my vs mine, it/its untuk benda & sistem, they untuk jamak dan satu orang tak diketahui (singular they),
  its vs it's, subject ganda, his/her ikut pemilik, "My team and I"; 5 pola, 7 contoh, 4 perbandingan, 7 kesalahan umum,
  5 ungkapan, dialog pembagian bug.
- Latihan: Kenali jenis pronoun (12, acak 5), Pilih pronoun (12, acak 5), Ganti noun dengan pronoun (8, acak 4),
  Susun kalimat (7, acak 3), Produksi terbuka (6, acak 2), Kembangkan menjadi penjelasan (2, terbuka), Recall (8), Evaluasi (6).
- Grammar dijaga tetap Simple Present/be/imperative (tanpa will/can; "Could you help me" hanya frasa siap pakai).
- Tes: placeholder check dipindah ke l4; tambah tes bank soal 2.3.
- Validasi: typecheck OK, lint OK, test 96/96 OK, build OK.
- Kendala: render halaman tidak dicek via HTTP (login Supabase); dev server port 3000 tidak disentuh.

### 2026-10-22 — level-1-m2-l4 Verbs
- Konten: kalimat wajib punya verb (tanpa action verb → be), action verb vs be (larangan "I am work"), verb dengan/tanpa
  object, paket verb + preposition (wait for, depend on, talk to/about, look at, work on, reply to, ask for, listen to),
  verb tanpa preposition (discuss, call, contact, answer), need/want/try + to + bentuk dasar, bentuk dasar setelah
  do/does/doesn't; 5 pola, 7 contoh, 4 perbandingan, 7 kesalahan umum, 5 ungkapan, dialog daily stand-up.
- Latihan: Action verb atau be? (12, acak 5), Pilih bentuk verb (12, acak 5), Verb + preposition (12, acak 5),
  Susun kalimat (7, acak 3), Produksi terbuka (6, acak 2), Kembangkan menjadi penjelasan (2, terbuka), Recall (8), Evaluasi (6).
- Grammar dijaga Simple Present/be/imperative; "I'm working on it" hanya frasa siap pakai (Present Continuous di Modul 8).
- Tes: placeholder check dipindah ke l5; tambah tes bank soal 2.4.
- Validasi: typecheck OK, lint OK, test 97/97 OK, build OK.
- Kendala: render halaman tidak dicek via HTTP (login Supabase); dev server port 3000 tidak disentuh.

### 2026-10-22 — level-1-m2-l5 Adjectives (permintaan langsung pengguna)
- Konten: posisi adjective (sebelum noun / setelah be, look, seem, feel), adjective tanpa bentuk jamak, -ed vs -ing
  (bored/boring, confused/confusing, interested/interesting), very/quite/so/too, adjective + preposition (responsible for,
  familiar with, interested in, good at, ready for, similar to, different from, aware of), urutan dua adjective, the same;
  5 pola, 7 contoh, 4 perbandingan, 7 kesalahan umum, 5 ungkapan, dialog feedback dashboard.
- Latihan: Posisi adjective (12, acak 5), -ed atau -ing (12, acak 5), Adjective + preposition (12, acak 5),
  Susun kalimat (7, acak 3), Produksi terbuka (6, acak 2), Kembangkan menjadi penjelasan (2, terbuka), Recall (8), Evaluasi (6).
- Grammar dijaga Simple Present/be; comparative (faster/bigger) sengaja tidak dipakai.
- Tes: placeholder check dipindah ke l6; tambah tes bank soal 2.5.
- Validasi: typecheck OK, lint OK, test 98/98 OK, build OK.
- Kendala: render halaman tidak dicek via HTTP (login Supabase); dev server port 3000 tidak disentuh.
