import 'server-only';
import type { LessonContent } from '@/types/curriculum';

/**
 * Isi Modul 2 — Parts of Speech. Hanya dimuat di server (halaman materi). Penjelasan dalam
 * Bahasa Indonesia, contoh & latihan dalam bahasa Inggris natural (konteks sehari-hari dan kerja IT).
 * Bank soal ditulis langsung per aktivitas (pickCount), tidak lewat bank Modul 1.
 */

/** Nama jenis kata yang diterima sebagai jawaban, termasuk istilah Indonesianya. */
const POS = {
  noun: ['kata benda'],
  pronoun: ['kata ganti'],
  verb: ['kata kerja'],
  adjective: ['kata sifat'],
  adverb: ['kata keterangan'],
  preposition: ['kata depan', 'preposisi'],
  conjunction: ['kata sambung', 'kata hubung'],
  article: ['artikel', 'determiner'],
  determiner: ['kata penentu', 'possessive determiner'],
} as const;

const pos = (prompt: string, answer: keyof typeof POS, explanation: string) => ({
  prompt,
  answer,
  alternatives: [...POS[answer]],
  explanation,
});

export const module2Content: Record<string, LessonContent> = {
  'level-1-m2-l1': {
    objectives: [
      'Mengenali delapan jenis kata utama (parts of speech) dan fungsinya dalam kalimat.',
      'Menebak jenis kata dari posisinya, bukan dari terjemahannya.',
      'Menghindari kesalahan umum orang Indonesia: urutan adjective + noun, dan tertukar antara verb, noun, dan adjective.',
    ],
    explanation: [
      'Di Modul 1 kamu menyusun kalimat dari subject, verb, object, dan complement. Itu adalah PERAN dalam kalimat. Parts of speech adalah JENIS KATA yang mengisi peran itu. Contoh: dalam "The server is slow", "server" adalah noun yang berperan sebagai subject, dan "slow" adalah adjective yang berperan sebagai complement.',
      'Kenapa ini penting? Banyak kesalahan saat bicara terjadi karena jenis kata tertukar: "I am agree" (agree itu verb, bukan adjective), "This is very importance" (importance itu noun, yang benar adjective "important"), atau "The deployment is success" (yang benar "successful"). Kalau kamu tahu jenis katanya, kamu tahu di mana kata itu boleh diletakkan.',
      'Delapan jenis kata yang kita pakai di modul ini: noun (benda/orang/ide), pronoun (pengganti noun), verb (tindakan atau keadaan), adjective (menjelaskan noun), adverb (menjelaskan cara, waktu, atau seberapa sering), preposition (penghubung posisi/waktu/arah sebelum noun), conjunction (penyambung kata atau kalimat), dan article/determiner (penentu sebelum noun: a, an, the, this, my).',
      'Trik paling berguna: lihat POSISI. Kata setelah a/an/the hampir selalu noun atau adjective + noun. Kata tepat setelah subject biasanya verb. Kata setelah am/is/are sering adjective. Kata yang menjelaskan "bagaimana" sebuah tindakan dilakukan (sering berakhiran -ly) biasanya adverb.',
      'Satu kata bisa punya lebih dari satu jenis, tergantung posisinya. "I test the API" → test = verb. "The test fails" → test = noun. Jadi jangan menghafal jenis kata dari kamus saja; lihat fungsinya di kalimat.',
      'Bahasa Indonesia meletakkan kata sifat SETELAH benda ("server baru"). Bahasa Inggris kebalikannya: adjective SEBELUM noun ("a new server"). Ini salah satu kebiasaan yang paling perlu dilatih.',
      'Unit ini hanya pengenalan. Setiap jenis kata akan dibahas lebih dalam di materi 2.2 sampai 2.9, lalu dilatih lagi di 2.10.',
    ],
    patterns: [
      {
        pattern: 'Article/Determiner + (Adjective) + Noun',
        meaning: 'Kelompok kata benda. Adjective selalu di depan noun.',
        examples: ['a new server', 'the slow query', 'my old laptop'],
      },
      {
        pattern: 'Subject (Noun/Pronoun) + Verb + Object',
        meaning: 'Verb datang tepat setelah subject.',
        examples: ['She reviews the code.', 'Our team uses Laravel.'],
      },
      {
        pattern: 'Subject + be + Adjective',
        meaning: 'Adjective setelah am/is/are menjelaskan keadaan subject.',
        examples: ['The API is fast.', 'This task is important.'],
      },
      {
        pattern: 'Verb (+ Object) + Adverb',
        meaning: 'Adverb menjelaskan cara tindakan dilakukan.',
        examples: ['He explains things clearly.', 'We check the logs carefully.'],
      },
      {
        pattern: 'Preposition + Noun',
        meaning: 'Preposition hampir selalu diikuti noun atau pronoun.',
        examples: ['in the database', 'on Friday', 'with the client'],
      },
    ],
    examples: [
      {
        en: 'My team usually tests the new feature carefully on Friday.',
        id: 'Tim saya biasanya mengetes fitur baru dengan teliti pada hari Jumat.',
        note: 'My (determiner) · team (noun) · usually (adverb) · tests (verb) · the (article) · new (adjective) · feature (noun) · carefully (adverb) · on (preposition) · Friday (noun)',
      },
      {
        en: 'She writes clean code, and I review it.',
        id: 'Dia menulis kode yang rapi, dan saya me-review-nya.',
        note: 'She (pronoun) · writes (verb) · clean (adjective) · code (noun) · and (conjunction) · I (pronoun) · review (verb) · it (pronoun)',
      },
      {
        en: 'The report page is slow in the morning.',
        id: 'Halaman laporan lambat di pagi hari.',
        note: 'slow = adjective setelah is · in = preposition sebelum "the morning"',
      },
      {
        en: 'We need a new server because the old one is full.',
        id: 'Kami butuh server baru karena yang lama sudah penuh.',
        note: 'a new server = article + adjective + noun · because = conjunction',
      },
      {
        en: 'I agree with you.',
        id: 'Saya setuju denganmu.',
        note: 'agree = verb, jadi tidak perlu "am".',
      },
      {
        en: 'This update is very important for our clients.',
        id: 'Update ini sangat penting untuk klien kami.',
        note: 'important = adjective · very = adverb yang menguatkan adjective · for = preposition',
      },
    ],
    comparisons: [
      {
        a: { en: 'I test the API every day.', id: 'Saya mengetes API setiap hari.' },
        b: { en: 'The test fails on my laptop.', id: 'Tesnya gagal di laptop saya.' },
        explanation: 'Kata yang sama, jenis berbeda. Setelah subject "I" → test adalah verb. Setelah "the" → test adalah noun.',
      },
      {
        a: { en: 'The app is slow.', id: 'Aplikasinya lambat.' },
        b: { en: 'The app loads slowly.', id: 'Aplikasinya memuat dengan lambat.' },
        explanation: 'Slow (adjective) menjelaskan noun "app" setelah is. Slowly (adverb) menjelaskan verb "loads" — bagaimana aplikasinya memuat. Detailnya di materi Adverbs (2.6).',
      },
      {
        a: { en: 'This feature is important.', id: 'Fitur ini penting.' },
        b: { en: 'I understand the importance of this feature.', id: 'Saya paham pentingnya fitur ini.' },
        explanation: 'Important = adjective (setelah is). Importance = noun (setelah the). Akhiran sering memberi petunjuk: -ance/-ment/-tion biasanya noun, -ful/-ant/-ive biasanya adjective.',
      },
    ],
    mistakes: [
      { wrong: 'We need a server new.', correct: 'We need a new server.', reason: 'Adjective diletakkan sebelum noun, bukan sesudahnya seperti bahasa Indonesia.' },
      { wrong: 'I am agree with you.', correct: 'I agree with you.', reason: 'Agree adalah verb. Verb biasa tidak memakai am/is/are di depannya (ingat Modul 1).' },
      { wrong: 'This task is very importance.', correct: 'This task is very important.', reason: 'Setelah is + very dibutuhkan adjective (important), bukan noun (importance).' },
      { wrong: 'The deployment is success.', correct: 'The deployment is successful.', reason: 'Success adalah noun. Untuk menjelaskan keadaan setelah is, pakai adjective successful.' },
      { wrong: 'I very like Laravel.', correct: 'I really like Laravel. / I like Laravel very much.', reason: '"Very" menguatkan adjective (very good), tidak bisa langsung menguatkan verb. Untuk verb pakai really atau very much.' },
    ],
    expressions: [
      { phrase: "It's a quick fix.", meaning: 'Perbaikannya cepat/kecil.', usage: 'quick = adjective sebelum noun fix.' },
      { phrase: 'Let me check it quickly.', meaning: 'Saya cek sebentar.', usage: 'quickly = adverb, menjelaskan cara check.' },
      { phrase: 'I totally agree.', meaning: 'Saya sangat setuju.', usage: 'Pengganti "I am very agree" yang salah.' },
    ],
    dialog: {
      title: 'Membahas halaman yang lambat',
      lines: [
        { speaker: 'Lead', text: 'The report page is slow again.', translation: 'Halaman laporannya lambat lagi.' },
        { speaker: 'You', text: 'Yes, I know. The main query is very heavy.', translation: 'Ya, saya tahu. Query utamanya sangat berat.' },
        { speaker: 'Lead', text: 'Do we need a new server?', translation: 'Kita butuh server baru?' },
        { speaker: 'You', text: "I don't think so. We need a better index, and I want to add it today.", translation: 'Menurut saya tidak. Kita butuh index yang lebih baik, dan saya mau menambahkannya hari ini.' },
        { speaker: 'Lead', text: 'Great. Please test it carefully on staging first.', translation: 'Bagus. Tolong tes dengan teliti di staging dulu.' },
        { speaker: 'You', text: 'Sure. I agree.', translation: 'Tentu. Saya setuju.' },
      ],
    },
    activities: [
      {
        id: 'm2-l1-identify',
        type: 'exercise',
        title: 'Kenali jenis kata',
        instructions:
          'Tulis jenis kata di dalam [kurung]: noun, pronoun, verb, adjective, adverb, preposition, conjunction, article, atau determiner. Istilah Indonesia (kata benda, kata kerja, dst.) juga diterima.',
        pickCount: 5,
        items: [
          pos('We [deploy] on Friday.', 'verb', 'Tepat setelah subject "We" → verb.'),
          pos('The [database] is slow.', 'noun', 'Setelah "the" dan berperan sebagai subject → noun.'),
          pos('She writes [clean] code.', 'adjective', 'Menjelaskan noun "code" dan diletakkan sebelum noun → adjective.'),
          pos('He reviews the code [carefully].', 'adverb', 'Menjelaskan bagaimana dia me-review → adverb.'),
          pos('The report is [on] the shared drive.', 'preposition', 'Sebelum noun "the shared drive" dan menunjukkan posisi → preposition.'),
          pos('I like PHP, [but] I prefer Go for this project.', 'conjunction', 'Menyambung dua kalimat yang berlawanan → conjunction.'),
          pos('[They] use Jira every day.', 'pronoun', 'Menggantikan nama orang/tim → pronoun.'),
          pos('Please open [the] dashboard.', 'article', 'The adalah article (salah satu jenis determiner).'),
          pos('The API is [fast].', 'adjective', 'Setelah is, menjelaskan keadaan API → adjective.'),
          pos('The tests [usually] pass.', 'adverb', 'Menjelaskan seberapa sering → adverb.'),
          pos('Rina checks the logs [and] fixes the issue.', 'conjunction', 'Menyambung dua tindakan → conjunction.'),
          pos('[My] laptop is old.', 'determiner', 'My menentukan milik siapa noun "laptop" → determiner (possessive).'),
        ],
      },
      {
        id: 'm2-l1-choose',
        type: 'exercise',
        title: 'Pilih kata yang pas',
        instructions: 'Pilih satu kata di dalam kurung yang cocok dengan posisinya, lalu tulis kata itu saja.',
        pickCount: 4,
        items: [
          { prompt: 'The ___ is down. (server / quick)', answer: 'server', explanation: 'Setelah "the" dan sebelum "is" butuh noun sebagai subject.' },
          { prompt: 'The query is very ___. (slow / slowly)', answer: 'slow', explanation: 'Setelah is → adjective.' },
          { prompt: 'We ___ the code every morning. (review / careful)', answer: 'review', explanation: 'Setelah subject "We" → verb.' },
          { prompt: 'She is a ___ developer. (good / well)', answer: 'good', explanation: 'Sebelum noun "developer" → adjective.' },
          { prompt: 'He explains the problem ___. (clear / clearly)', answer: 'clearly', explanation: 'Menjelaskan cara "explains" → adverb.' },
          { prompt: 'The meeting starts ___ nine. (at / and)', answer: 'at', explanation: 'Sebelum jam → preposition at.' },
          { prompt: 'I am tired, ___ I want to finish this task. (but / on)', answer: 'but', explanation: 'Dua ide berlawanan → conjunction but.' },
          { prompt: 'This feature is very ___. (important / importance)', answer: 'important', explanation: 'Setelah is + very → adjective.' },
          { prompt: 'The deployment is ___. (successful / success)', answer: 'successful', explanation: 'Setelah is → adjective successful.' },
          { prompt: 'I ___ with you. (agree / am agree)', answer: 'agree', explanation: 'Agree adalah verb → tanpa am.' },
        ],
      },
      {
        id: 'm2-l1-arrange',
        type: 'exercise',
        title: 'Susun kalimat',
        instructions: 'Susun kata-kata berikut menjadi kalimat yang benar. Perhatikan posisi adjective dan adverb.',
        pickCount: 3,
        items: [
          { prompt: 'server / a / new / we / need', answer: 'We need a new server.', explanation: 'Article + adjective + noun: a new server.' },
          { prompt: 'clean / writes / she / code', answer: 'She writes clean code.' },
          { prompt: 'carefully / reviews / he / the code', answer: 'He reviews the code carefully.', alternatives: ['He carefully reviews the code.'], explanation: 'Adverb cara biasanya di akhir, tetapi boleh juga sebelum verb.' },
          { prompt: 'is / slow / the / report page', answer: 'The report page is slow.' },
          { prompt: 'on Monday / starts / the sprint', answer: 'The sprint starts on Monday.' },
          { prompt: 'simple / a / fix / it / is', answer: 'It is a simple fix.' },
          { prompt: 'the app / but / works / it / is / slow', answer: 'The app works, but it is slow.' },
        ],
      },
      {
        id: 'm2-l1-twofunctions',
        type: 'exercise',
        title: 'Satu kata, dua fungsi',
        instructions: 'Kata di dalam [kurung] sama, tetapi posisinya berbeda. Tulis jenisnya: noun, verb, adjective, atau adverb.',
        items: [
          pos('I [test] the API every day.', 'verb', 'Setelah subject I → verb.'),
          pos('The [test] fails on my laptop.', 'noun', 'Setelah the → noun.'),
          pos('We [update] the app every month.', 'verb', 'Setelah subject We → verb.'),
          pos('The new [update] is ready.', 'noun', 'Setelah the + adjective new → noun.'),
          pos('It is a [fast] server.', 'adjective', 'Sebelum noun server → adjective.'),
          pos('The server runs [fast].', 'adverb', 'Menjelaskan cara "runs" → adverb. Fast termasuk kata yang bentuk adverb-nya sama.'),
        ],
      },
      {
        id: 'm2-l1-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        pickCount: 2,
        instructions: 'Tulis kalimatmu sendiri tentang pekerjaan atau harimu, lalu ucapkan dengan keras. Contoh jawaban hanya referensi.',
        items: [
          { prompt: 'Tulis 1 kalimat dengan pola article + adjective + noun.', answer: 'Contoh: I use a new framework at work.', alternatives: ['We have a big meeting today.'] },
          { prompt: 'Tulis 1 kalimat dengan adverb yang menjelaskan cara kamu bekerja.', answer: 'Contoh: I test my code carefully.', alternatives: ['I reply to emails quickly.'] },
          { prompt: 'Tulis 1 kalimat dengan preposition + noun tentang lokasi file atau data.', answer: 'Contoh: The report is in the shared folder.', alternatives: ['The data is in the main table.'] },
          { prompt: 'Tulis 2 kalimat: "test" sebagai verb, lalu "test" sebagai noun.', answer: 'Contoh: I test the login page. The test passes.' },
          { prompt: 'Tulis 1 kalimat dengan conjunction but tentang aplikasi yang kamu pakai.', answer: 'Contoh: The app is fast, but the report page is slow.' },
          { prompt: 'Ceritakan rekan kerja dengan pola pronoun + verb + adjective + noun.', answer: 'Contoh: She writes clear documentation.', alternatives: ['He builds simple tools.'] },
        ],
      },
      {
        id: 'm2-l1-expand',
        type: 'exercise',
        title: 'Kembangkan menjadi penjelasan',
        open: true,
        instructions:
          'Kembangkan kalimat dasar menjadi 3–4 kalimat. Pakai minimal satu adjective, satu adverb, satu preposition, dan satu conjunction. Lalu tandai sendiri jenis katanya.',
        items: [
          {
            prompt: 'Kalimat dasar: "The app is slow."',
            answer:
              'Contoh: The app is slow in the morning. Many users open the report page at the same time, so the database is very busy. We check the slow queries carefully every day, but we need a better index.',
          },
          {
            prompt: 'Kalimat dasar: "I am a backend developer."',
            answer:
              'Contoh: I am a backend developer at a small company. I build new features for our ERP system with Laravel and MySQL. I usually work from home, but I go to the office on Monday. I really like my team because they are helpful.',
          },
        ],
      },
      {
        id: 'm2-l1-recall',
        type: 'recall',
        title: 'Recall tanpa melihat materi',
        instructions: 'Jawab atau ucapkan dulu tanpa melihat materi di atas, lalu cek.',
        items: [
          pos('Jenis kata untuk orang, benda, tempat, atau ide?', 'noun', 'Contoh: developer, server, Jakarta, idea.'),
          pos('Jenis kata yang menggantikan noun (I, she, it, they)?', 'pronoun', 'Pronoun menghindari pengulangan nama.'),
          pos('Jenis kata yang menjelaskan noun (slow, new, important)?', 'adjective', 'Letaknya sebelum noun atau setelah be.'),
          pos('Jenis kata yang menjelaskan cara, waktu, atau frekuensi tindakan (carefully, usually)?', 'adverb', 'Banyak adverb berakhiran -ly.'),
          { prompt: 'Terjemahkan: Saya setuju.', answer: 'I agree.' },
          { prompt: 'Terjemahkan: Kami butuh server baru.', answer: 'We need a new server.' },
          { prompt: 'Terjemahkan: Fitur ini sangat penting.', answer: 'This feature is very important.' },
          { prompt: 'Terjemahkan: Deployment-nya berhasil.', answer: 'The deployment is successful.', alternatives: ['The deployment was successful.', 'The deployment succeeded.'] },
        ],
      },
      {
        id: 'm2-l1-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        instructions: 'Kalimat mana yang benar? Tulis "Benar", atau tulis versi yang sudah diperbaiki.',
        items: [
          { prompt: 'We need a server new.', answer: 'Salah → We need a new server.', explanation: 'Adjective sebelum noun.' },
          { prompt: 'I am agree with you.', answer: 'Salah → I agree with you.', explanation: 'Agree adalah verb, tanpa am.' },
          { prompt: 'She explains the problem clearly.', answer: 'Benar.', explanation: 'Clearly (adverb) menjelaskan cara explains.' },
          { prompt: 'This task is very importance.', answer: 'Salah → This task is very important.', explanation: 'Setelah is butuh adjective.' },
          { prompt: 'I very like Laravel.', answer: 'Salah → I really like Laravel.', alternatives: ['I like Laravel very much.'], explanation: 'Very tidak langsung menguatkan verb.' },
          { prompt: 'The deployment is success.', answer: 'Salah → The deployment is successful.', explanation: 'Success = noun; successful = adjective.' },
        ],
      },
    ],
    summary: [
      'Peran (subject, verb, object, complement) berbeda dengan jenis kata (noun, verb, adjective, dst.).',
      'Delapan jenis kata: noun, pronoun, verb, adjective, adverb, preposition, conjunction, article/determiner.',
      'Tebak jenis kata dari posisinya: setelah the → noun; setelah subject → verb; setelah is → adjective.',
      'Adjective SEBELUM noun: a new server, bukan a server new.',
      'Satu kata bisa dua jenis: I test (verb) / the test (noun).',
      'Hati-hati: I agree (bukan I am agree), very important (bukan very importance), successful (bukan success) setelah is.',
    ],
    reviewRecommendation:
      'Ulangi materi ini jika kamu masih menulis "a server new", "I am agree", atau tertukar antara important/importance dan success/successful.',
  },
};
