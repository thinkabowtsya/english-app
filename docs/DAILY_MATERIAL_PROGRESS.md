# Daily Material Progress

Catatan kerja rutinitas harian penambahan materi (bukan fitur aplikasi). Satu eksekusi = satu unit.
Rekap Excel: `D:\myapps\english-materi-harian.xlsx` (dibangun dari `D:\myapps\_routine\progress.json`
lewat `python -I D:\myapps\_routine\build_excel.py`).

**Terakhir diperbarui:** 2026-10-16
**Unit berikutnya:** `level-1-m2-l2` — Modul 2 · 2.2 Nouns

## Kurikulum tetap Modul 1–10

| Modul | Judul | Status |
| --- | --- | --- |
| 1 | Basic Sentence Foundations (di app: "Grammar Dasar Sederhana") | Lengkap (8 unit) — jangan diubah |
| 2 | Parts of Speech | 1/10 unit |
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
| level-1-m2-l2 | Nouns | placeholder |
| level-1-m2-l3 | Pronouns | placeholder |
| level-1-m2-l4 | Verbs | placeholder |
| level-1-m2-l5 | Adjectives | placeholder |
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
