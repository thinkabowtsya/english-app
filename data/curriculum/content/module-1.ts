import 'server-only';
import type { LessonContent } from '@/types/curriculum';

/**
 * Isi Modul 1 — Grammar Dasar Sederhana. Hanya dimuat di server (halaman materi), sehingga
 * tidak ikut terunduh di halaman lain. Penjelasan dalam Bahasa Indonesia, contoh & latihan
 * dalam bahasa Inggris natural (konteks sehari-hari dan kerja IT).
 */

export const module1Content: Record<string, LessonContent> = {
  'level-1-m1-l1': {
    objectives: [
      'Mengenali tiga pola kalimat dasar bahasa Inggris.',
      'Menyusun kalimat pendek sendiri tentang diri dan pekerjaan tanpa menerjemahkan kata per kata.',
      'Membedakan kalimat dengan verb biasa dan kalimat dengan "be" (am/is/are).',
    ],
    explanation: [
      'Hampir setiap kalimat bahasa Inggris punya subject (siapa/apa yang dibicarakan) dan verb (kata kerja). Berbeda dengan bahasa Indonesia, verb ini tidak boleh hilang. "Saya sibuk" tidak bisa jadi "I busy" — harus ada verb: "I am busy".',
      'Object adalah sesuatu yang dikenai pekerjaan: "I use Laravel" — yang dipakai adalah Laravel. Tidak semua verb butuh object: "I work" sudah lengkap.',
      'Kalau kamu ingin menjelaskan keadaan, identitas, atau sifat (sibuk, developer, siap), pakai "be" (am/is/are) lalu complement. Complement bukan object; ia menjelaskan subject: "I am busy" = saya (dalam keadaan) sibuk.',
      'Kunci praktis: tanyakan dulu "Apakah aku sedang menyebut tindakan?" → pakai verb biasa. "Apakah aku sedang menjelaskan keadaan/identitas?" → pakai be.',
    ],
    patterns: [
      { pattern: 'Subject + Verb', meaning: 'Tindakan tanpa object.', examples: ['I work.', 'The server crashed.'] },
      {
        pattern: 'Subject + Verb + Object',
        meaning: 'Tindakan yang mengenai sesuatu.',
        examples: ['I use Laravel.', 'She writes the documentation.'],
      },
      {
        pattern: 'Subject + be + Complement',
        meaning: 'Keadaan, identitas, sifat, atau lokasi.',
        examples: ['I am busy.', 'The API is slow.'],
      },
    ],
    examples: [
      { en: 'I work.', id: 'Saya bekerja.', note: 'Subject + Verb' },
      { en: 'I use Laravel.', id: 'Saya pakai Laravel.', note: 'Subject + Verb + Object' },
      { en: 'I am busy.', id: 'Saya sedang sibuk.', note: 'Subject + be + Complement' },
      { en: 'My team uses MySQL.', id: 'Tim saya pakai MySQL.' },
      { en: 'The query is slow.', id: 'Query-nya lambat.' },
      { en: 'We need more time.', id: 'Kami butuh waktu tambahan.' },
    ],
    comparisons: [
      {
        a: { en: 'I am busy.', id: 'Saya sibuk (keadaan).' },
        b: { en: 'I work.', id: 'Saya bekerja (tindakan).' },
        explanation: '"Busy" adalah keadaan → butuh "am". "Work" adalah verb → langsung setelah subject, tanpa "am".',
      },
      {
        a: { en: 'I use PHP.', id: 'Saya memakai PHP.' },
        b: { en: 'I am a PHP developer.', id: 'Saya seorang PHP developer.' },
        explanation: 'Kalimat pertama menyebut tindakan (use + object). Kalimat kedua menyebut identitas (am + complement).',
      },
    ],
    mistakes: [
      { wrong: 'I busy.', correct: 'I am busy.', reason: 'Kata sifat seperti busy tidak bisa berdiri sebagai verb; perlu "am".' },
      { wrong: 'I am work here.', correct: 'I work here.', reason: '"Work" sudah verb. "Am" tidak dipakai sebelum verb biasa di sini.' },
      { wrong: 'Is ready the system.', correct: 'The system is ready.', reason: 'Urutan kalimat pernyataan: subject dulu, lalu be/verb.' },
    ],
    expressions: [
      { phrase: "I'm a bit busy right now.", meaning: 'Saya agak sibuk sekarang.', usage: 'Menolak ajakan dengan sopan.' },
      { phrase: 'It works.', meaning: 'Sudah jalan / berhasil.', usage: 'Setelah fitur atau perbaikan berhasil dites.' },
    ],
    dialog: {
      title: 'Perkenalan singkat di tim',
      lines: [
        { speaker: 'Lead', text: 'Hi, are you the new developer?', translation: 'Hai, kamu developer baru?' },
        { speaker: 'You', text: 'Yes, I am. I work on the backend.', translation: 'Ya. Saya mengerjakan backend.' },
        { speaker: 'Lead', text: 'Great. What do you use?', translation: 'Bagus. Kamu pakai apa?' },
        { speaker: 'You', text: 'I use Laravel and MySQL.', translation: 'Saya pakai Laravel dan MySQL.' },
      ],
    },
    activities: [
      {
        id: 'l1-ex1',
        type: 'exercise',
        title: 'Lengkapi kalimat',
        instructions: 'Isi bagian kosong dengan "am" atau biarkan kosong (tulis "-") jika tidak perlu.',
        items: [
          { prompt: 'I ___ tired.', answer: 'am', explanation: 'Tired = keadaan → I am tired.' },
          { prompt: 'I ___ work from home on Fridays.', answer: '-', explanation: '"Work" verb biasa → I work from home on Fridays.' },
          { prompt: 'I ___ a backend developer.', answer: 'am', explanation: 'Identitas → I am a backend developer.' },
          { prompt: 'I ___ use VS Code.', answer: '-', explanation: '"Use" verb biasa → I use VS Code.' },
        ],
      },
      {
        id: 'l1-ex2',
        type: 'exercise',
        title: 'Susun kalimat',
        instructions: 'Susun kata-kata berikut menjadi kalimat yang benar.',
        items: [
          { prompt: 'Laravel / use / we', answer: 'We use Laravel.' },
          { prompt: 'ready / is / the database', answer: 'The database is ready.' },
          { prompt: 'the bug / fix / I', answer: 'I fix the bug.', explanation: 'Subject + Verb + Object.' },
        ],
      },
      {
        id: 'l1-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        instructions: 'Tulis kalimatmu sendiri, lalu ucapkan dengan keras. Contoh jawaban hanya referensi.',
        items: [
          {
            prompt: 'Tulis 1 kalimat Subject + Verb + Object tentang tools yang kamu pakai di kantor.',
            answer: 'Contoh: I use Git every day.',
            alternatives: ['My team uses Jira.', 'I write PHP code.'],
          },
          {
            prompt: 'Tulis 1 kalimat Subject + be + Complement tentang kondisimu hari ini.',
            answer: 'Contoh: I am a little tired today.',
            alternatives: ['I am ready for the meeting.', 'I am happy with the result.'],
          },
        ],
      },
      {
        id: 'l1-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        instructions: 'Ucapkan dulu tanpa melihat jawaban, lalu cek.',
        items: [
          { prompt: 'Saya programmer.', answer: 'I am a programmer.' },
          { prompt: 'Saya pakai MySQL.', answer: 'I use MySQL.' },
          { prompt: 'Servernya siap.', answer: 'The server is ready.' },
        ],
      },
      {
        id: 'l1-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        instructions: 'Kalimat mana yang benar? Perbaiki yang salah.',
        items: [
          { prompt: 'I am use Laravel.', answer: 'Salah → I use Laravel.' },
          { prompt: 'The app is fast.', answer: 'Benar.' },
          { prompt: 'We busy today.', answer: 'Salah → We are busy today.' },
        ],
      },
    ],
    summary: [
      'Setiap kalimat butuh subject dan verb.',
      'Tindakan → Subject + Verb (+ Object): I use Laravel.',
      'Keadaan/identitas → Subject + be + Complement: I am busy.',
      'Jangan menaruh am/is/are sebelum verb biasa: "I am work" salah.',
    ],
    reviewRecommendation:
      'Ulangi materi ini jika kamu masih sering lupa "am" sebelum kata sifat, atau menambahkan "am" sebelum verb.',
  },
  'level-1-m1-l2': {
    objectives: [
      'Memakai kata ganti subject dengan tepat untuk orang, tim, dan benda/sistem.',
      'Memahami bahwa he/she/it memengaruhi bentuk verb dan be.',
    ],
    explanation: [
      'Kata ganti subject: I (saya), you (kamu/kalian), we (kami/kita), they (mereka), he (dia laki-laki), she (dia perempuan), it (benda, sistem, hewan, ide).',
      'Bahasa Indonesia sering menghilangkan subject ("Lagi meeting"). Dalam bahasa Inggris, subject hampir selalu harus ada: "I\'m in a meeting."',
      'Untuk benda atau sistem (server, app, bug), pakai "it" — bukan he/she. Untuk kelompok orang atau beberapa benda, pakai "they".',
      'Subject menentukan bentuk berikutnya: he/she/it memakai "is" dan verb ber-s (he works), sedangkan I/you/we/they memakai bentuk dasar (they work). Detailnya dibahas di materi berikutnya.',
    ],
    patterns: [
      { pattern: 'I / you / we / they + verb', examples: ['They deploy on Friday.'] },
      { pattern: 'he / she / it + verb-s', examples: ['It runs on Linux.', 'She tests the API.'] },
    ],
    examples: [
      { en: 'I check my email in the morning.', id: 'Saya cek email di pagi hari.' },
      { en: 'We have a stand-up at nine.', id: 'Kami ada stand-up jam sembilan.' },
      { en: 'They work in Singapore.', id: 'Mereka bekerja di Singapura.' },
      { en: 'She leads the QA team.', id: 'Dia memimpin tim QA.' },
      { en: 'The app is slow. It needs caching.', id: 'Aplikasinya lambat. Perlu caching.', note: 'Benda → it.' },
      { en: 'My manager is in Jakarta. He is online now.', id: 'Manajer saya di Jakarta. Dia sedang online.' },
    ],
    comparisons: [
      {
        a: { en: 'They are ready.', id: 'Mereka/itu (banyak) siap.' },
        b: { en: 'It is ready.', id: 'Itu (satu) siap.' },
        explanation: '"They" untuk lebih dari satu (orang atau benda), "it" untuk satu benda/sistem.',
      },
    ],
    mistakes: [
      { wrong: 'Is broken.', correct: 'It is broken. / It\'s broken.', reason: 'Subject tidak boleh dihilangkan.' },
      { wrong: 'The server, he is down.', correct: 'The server is down.', reason: 'Jangan mengulang subject; dan benda memakai it, bukan he.' },
      { wrong: 'Me use PHP.', correct: 'I use PHP.', reason: '"Me" bukan bentuk subject. Subject = I.' },
    ],
    expressions: [
      { phrase: "I'm in a meeting.", meaning: 'Saya lagi meeting.' },
      { phrase: "It's on me.", meaning: 'Itu tanggung jawab saya (atau: saya yang traktir).' },
    ],
    dialog: {
      lines: [
        { speaker: 'A', text: 'Where is Rina?', translation: 'Rina di mana?' },
        { speaker: 'B', text: "She's in a meeting. She is back at two.", translation: 'Dia lagi meeting. Balik jam dua.' },
        { speaker: 'A', text: 'And the staging server?', translation: 'Kalau server staging?' },
        { speaker: 'B', text: "It's down. We are on it.", translation: 'Lagi down. Kami sedang tangani.' },
      ],
    },
    activities: [
      {
        id: 'l2-ex1',
        type: 'exercise',
        title: 'Pilih kata ganti',
        instructions: 'Ganti bagian dalam kurung dengan kata ganti subject yang tepat.',
        items: [
          { prompt: '(Andi) works on the mobile app.', answer: 'He works on the mobile app.' },
          { prompt: '(The database) is too big.', answer: 'It is too big.' },
          { prompt: '(My team and I) use Laravel.', answer: 'We use Laravel.' },
          { prompt: '(The developers) are in Bandung.', answer: 'They are in Bandung.' },
        ],
      },
      {
        id: 'l2-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        instructions: 'Ceritakan rekan kerja atau sistem di kantormu.',
        items: [
          {
            prompt: 'Satu kalimat tentang rekan kerja dengan he atau she.',
            answer: 'Contoh: She manages the database.',
            alternatives: ['He reviews my code.'],
          },
          { prompt: 'Satu kalimat tentang aplikasi kantormu dengan it.', answer: 'Contoh: It runs on AWS.' },
        ],
      },
      {
        id: 'l2-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Kami pakai MySQL.', answer: 'We use MySQL.' },
          { prompt: 'Dia (perempuan) seorang designer.', answer: 'She is a designer.' },
          { prompt: '(Aplikasinya) error lagi.', answer: 'It has an error again.', alternatives: ["It's broken again.", 'The app has an error again.'] },
        ],
      },
      {
        id: 'l2-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: 'The bug is fixed. ___ works now. (It / He)', answer: 'It' },
          { prompt: 'Rudi and Sari ___ in the office. (is / are)', answer: 'are', explanation: 'Dua orang → they → are.' },
        ],
      },
    ],
    summary: [
      'Subject hampir selalu wajib: "It\'s down", bukan "Is down".',
      'Benda/sistem = it; banyak orang/benda = they.',
      'He/she/it → is dan verb-s; I/you/we/they → bentuk dasar.',
    ],
    reviewRecommendation: 'Ulangi jika kamu masih sering menghilangkan subject atau memakai he/she untuk benda.',
  },
  'level-1-m1-l3': {
    objectives: [
      'Memilih am/is/are sesuai subject.',
      'Membuat kalimat negatif dan pertanyaan dengan be.',
      'Membedakan "I am busy" (keadaan) dan "I work every day" (kebiasaan).',
    ],
    explanation: [
      'I → am. He/she/it (dan satu benda) → is. You/we/they (dan banyak benda) → are.',
      'Be dipakai untuk menjelaskan subject: kondisi (tired, ready), identitas/pekerjaan (a developer), lokasi (at work, in Jakarta), dan keadaan saat ini.',
      'Negatif: tambahkan "not" setelah be — isn\'t, aren\'t, I\'m not. Pertanyaan: pindahkan be ke depan — "Are you ready?"',
      'Be bukan penanda "sedang" yang bisa ditempel ke verb mana saja. "I am work" salah; untuk kebiasaan pakai verb langsung: "I work every day."',
    ],
    patterns: [
      { pattern: 'Subject + am/is/are + complement', examples: ['The system is ready.'] },
      { pattern: "Subject + am not / isn't / aren't + complement", examples: ["The build isn't ready."] },
      { pattern: 'Am/Is/Are + subject + complement?', examples: ['Is the server up?'] },
    ],
    examples: [
      { en: 'I am tired.', id: 'Saya capek.' },
      { en: 'She is a developer.', id: 'Dia seorang developer.' },
      { en: 'We are at work.', id: 'Kami sedang di kantor.' },
      { en: 'The system is ready.', id: 'Sistemnya sudah siap.' },
      { en: "I'm not sure.", id: 'Saya kurang yakin.' },
      { en: 'Are you free now?', id: 'Kamu senggang sekarang?' },
    ],
    comparisons: [
      {
        a: { en: 'I am busy.', id: 'Saya sedang sibuk (keadaan).' },
        b: { en: 'I work every day.', id: 'Saya bekerja setiap hari (kebiasaan).' },
        explanation: 'Busy adalah keadaan → am. Work adalah tindakan rutin → verb langsung, tanpa am.',
      },
      {
        a: { en: 'Is she in the office?', id: 'Dia ada di kantor?' },
        b: { en: "She isn't in the office.", id: 'Dia tidak di kantor.' },
        explanation: 'Pertanyaan: be pindah ke depan. Negatif: be + not di posisi biasa.',
      },
    ],
    mistakes: [
      { wrong: 'The servers is down.', correct: 'The servers are down.', reason: 'Servers (jamak) → are.' },
      { wrong: 'I am agree.', correct: 'I agree.', reason: '"Agree" adalah verb, jadi tidak perlu am.' },
      { wrong: 'You are ready?', correct: 'Are you ready?', reason: 'Dalam pertanyaan formal/tulisan, be di depan. (Dalam obrolan lisan, nada bertanya kadang dipakai, tapi pelajari bentuk standarnya dulu.)' },
    ],
    expressions: [
      { phrase: "I'm on it.", meaning: 'Saya sedang menanganinya.' },
      { phrase: "Are you around?", meaning: 'Kamu ada (online/di tempat)?' },
      { phrase: "I'm not sure yet.", meaning: 'Saya belum yakin.' },
    ],
    dialog: {
      lines: [
        { speaker: 'PM', text: 'Is the release ready?', translation: 'Rilisnya sudah siap?' },
        { speaker: 'You', text: "Not yet. The tests aren't green.", translation: 'Belum. Tesnya belum lolos.' },
        { speaker: 'PM', text: 'Are you busy after lunch?', translation: 'Kamu sibuk setelah makan siang?' },
        { speaker: 'You', text: "No, I'm free. I'm on it.", translation: 'Tidak, saya senggang. Saya tangani.' },
      ],
    },
    activities: [
      {
        id: 'l3-ex1',
        type: 'exercise',
        title: 'Isi am / is / are',
        items: [
          { prompt: 'The API ___ slow today.', answer: 'is' },
          { prompt: 'My teammates ___ online.', answer: 'are' },
          { prompt: 'I ___ in a meeting.', answer: 'am' },
          { prompt: 'You ___ right.', answer: 'are' },
        ],
      },
      {
        id: 'l3-ex2',
        type: 'exercise',
        title: 'Ubah bentuk',
        instructions: 'Ubah menjadi negatif lalu pertanyaan.',
        items: [
          {
            prompt: 'The database is full.',
            answer: "The database isn't full. / Is the database full?",
          },
          { prompt: 'They are in the office.', answer: "They aren't in the office. / Are they in the office?" },
          { prompt: 'I am late.', answer: "I'm not late. / Am I late?", explanation: 'Untuk I, negatifnya "I\'m not" (bukan "I amn\'t").' },
        ],
      },
      {
        id: 'l3-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        items: [
          {
            prompt: 'Tulis 3 kalimat tentang dirimu: pekerjaan, lokasi sekarang, dan kondisi.',
            answer: 'Contoh: I am a Laravel developer. I am at home. I am a bit sleepy.',
          },
          {
            prompt: 'Tulis 1 pertanyaan dengan be untuk rekan kerja.',
            answer: 'Contoh: Are you free for a quick call?',
            alternatives: ['Is the staging server up?'],
          },
        ],
      },
      {
        id: 'l3-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Saya belum siap.', answer: "I'm not ready yet." },
          { prompt: 'Servernya mati?', answer: 'Is the server down?' },
          { prompt: 'Mereka bukan developer.', answer: "They aren't developers." },
        ],
      },
      {
        id: 'l3-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: 'Perbaiki: "I am work here."', answer: 'I work here.' },
          { prompt: 'Perbaiki: "The logs is empty."', answer: 'The logs are empty.' },
        ],
      },
    ],
    summary: [
      'I am · he/she/it is · you/we/they are.',
      "Negatif: I'm not / isn't / aren't.",
      'Pertanyaan: Am/Is/Are + subject …?',
      'Be untuk keadaan/identitas/lokasi, bukan untuk ditempel ke verb biasa.',
    ],
    reviewRecommendation: 'Ulangi jika kamu masih menulis "I am agree" atau "The servers is".',
  },
  'level-1-m1-l4': {
    objectives: [
      'Menceritakan rutinitas dan fakta tentang pekerjaan dengan Simple Present.',
      'Menambahkan -s/-es untuk he/she/it dengan benar.',
      'Membuat negatif dan pertanyaan dengan do/does.',
    ],
    explanation: [
      'Simple Present dipakai untuk hal yang biasa/rutin terjadi atau fakta umum: "I work every day", "PHP runs on the server".',
      'Untuk he/she/it, verb ditambah -s: works, uses. Verb berakhiran -s, -sh, -ch, -x, -o ditambah -es: fixes, pushes, goes. Konsonan + y → -ies: studies. Have → has.',
      'Negatif memakai don\'t (I/you/we/they) atau doesn\'t (he/she/it) + verb dasar. Pertanyaan memakai Do/Does di depan + verb dasar.',
      'Penting: setelah does/doesn\'t, -s pindah ke "does", jadi verb kembali ke bentuk dasar. "She works" → "Does she work?" (bukan "works").',
    ],
    patterns: [
      { pattern: 'I/you/we/they + verb', examples: ['I work every day.'] },
      { pattern: 'he/she/it + verb-s/-es', examples: ['She works in an office.', 'He fixes bugs.'] },
      { pattern: "Subject + don't/doesn't + verb", examples: ["I don't understand.", "He doesn't use PHP."] },
      { pattern: 'Do/Does + subject + verb?', examples: ['Do you work here?', 'Does she work here?'] },
    ],
    examples: [
      { en: 'I work every day.', id: 'Saya bekerja setiap hari.' },
      { en: 'She works in an office.', id: 'Dia bekerja di kantor.' },
      { en: "I don't understand.", id: 'Saya tidak paham.' },
      { en: "He doesn't use PHP.", id: 'Dia tidak pakai PHP.' },
      { en: 'Do you work here?', id: 'Kamu kerja di sini?' },
      { en: 'Does she work here?', id: 'Dia kerja di sini?' },
      { en: 'Our team deploys every Thursday.', id: 'Tim kami deploy tiap Kamis.' },
    ],
    comparisons: [
      {
        a: { en: 'She works remotely.', id: 'Dia kerja remote.' },
        b: { en: 'Does she work remotely?', id: 'Apakah dia kerja remote?' },
        explanation: 'Di pertanyaan, -s "pindah" ke does. Verb kembali ke bentuk dasar: work.',
      },
      {
        a: { en: "I'm not busy.", id: 'Saya tidak sibuk (keadaan).' },
        b: { en: "I don't work on weekends.", id: 'Saya tidak kerja di akhir pekan (kebiasaan).' },
        explanation: 'Kalimat dengan be dinegatifkan dengan not. Kalimat dengan verb biasa memakai don\'t/doesn\'t.',
      },
    ],
    mistakes: [
      { wrong: "He don't work here.", correct: "He doesn't work here.", reason: 'He/she/it memakai doesn\'t.' },
      { wrong: 'Does she works here?', correct: 'Does she work here?', reason: 'Setelah does, verb kembali ke bentuk dasar.' },
      { wrong: 'She work in Jakarta.', correct: 'She works in Jakarta.', reason: 'She → verb + s.' },
      { wrong: 'I am not understand.', correct: "I don't understand.", reason: 'Understand adalah verb biasa → pakai don\'t, bukan am not.' },
    ],
    expressions: [
      { phrase: "I don't get it.", meaning: 'Saya belum nangkap / paham.' },
      { phrase: 'It depends.', meaning: 'Tergantung.' },
      { phrase: 'How often do you deploy?', meaning: 'Seberapa sering kalian deploy?' },
    ],
    dialog: {
      title: 'Ngobrol di wawancara kerja',
      lines: [
        { speaker: 'Interviewer', text: 'What do you do in your current job?', translation: 'Apa yang kamu kerjakan di pekerjaanmu sekarang?' },
        { speaker: 'You', text: 'I build APIs with Laravel. I also maintain our MySQL database.', translation: 'Saya membuat API dengan Laravel. Saya juga merawat database MySQL kami.' },
        { speaker: 'Interviewer', text: 'Does your team write tests?', translation: 'Timmu menulis tes?' },
        { speaker: 'You', text: "Yes, we do. But we don't have full coverage yet.", translation: 'Ya. Tapi cakupannya belum penuh.' },
      ],
    },
    activities: [
      {
        id: 'l4-ex1',
        type: 'exercise',
        title: 'Bentuk verb yang benar',
        items: [
          { prompt: 'She ___ (push) her code every evening.', answer: 'pushes', explanation: 'Berakhiran -sh → -es.' },
          { prompt: 'My manager ___ (have) a meeting at ten.', answer: 'has' },
          { prompt: 'We ___ (not use) Docker.', answer: "don't use" },
          { prompt: 'He ___ (not reply) on weekends.', answer: "doesn't reply" },
          { prompt: '___ the app ___ (support) dark mode?', answer: 'Does … support', explanation: 'App = it → does + verb dasar.' },
        ],
      },
      {
        id: 'l4-ex2',
        type: 'exercise',
        title: 'Perbaiki kalimat',
        items: [
          { prompt: 'Does he likes coffee?', answer: 'Does he like coffee?' },
          { prompt: "They doesn't work here.", answer: "They don't work here." },
          { prompt: 'The script run every hour.', answer: 'The script runs every hour.' },
        ],
      },
      {
        id: 'l4-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        items: [
          {
            prompt: 'Ceritakan rutinitas kerjamu dalam 3 kalimat (mulai kerja, tools, kebiasaan).',
            answer: 'Contoh: I start work at eight. I check Slack first. I usually write code after the stand-up.',
          },
          {
            prompt: 'Tulis 1 kalimat tentang rekan kerja dengan doesn\'t.',
            answer: "Contoh: She doesn't like long meetings.",
          },
          { prompt: 'Tulis 2 pertanyaan untuk kandidat baru dengan Do you…?', answer: 'Contoh: Do you know Laravel? Do you write unit tests?' },
        ],
      },
      {
        id: 'l4-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Saya tidak paham pertanyaannya.', answer: "I don't understand the question." },
          { prompt: 'Dia (laki-laki) kerja dari rumah.', answer: 'He works from home.' },
          { prompt: 'Kamu pakai Laravel?', answer: 'Do you use Laravel?' },
        ],
      },
      {
        id: 'l4-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: 'Pilih: She (go / goes) to the office on Mondays.', answer: 'goes' },
          { prompt: 'Pilih: (Do / Does) they need help?', answer: 'Do' },
          { prompt: 'Pilih: It (doesn\'t work / doesn\'t works).', answer: "doesn't work" },
        ],
      },
    ],
    summary: [
      'Rutinitas & fakta → Simple Present.',
      'He/she/it + verb-s/-es (has untuk have).',
      "Negatif: don't/doesn't + verb dasar.",
      'Pertanyaan: Do/Does + subject + verb dasar?',
    ],
    reviewRecommendation: 'Ulangi jika kamu masih menulis "He don\'t" atau "Does she works".',
  },
  'level-1-m1-l5': {
    objectives: [
      'Menentukan apakah sebuah kalimat memakai be atau verb biasa sebelum mengubahnya.',
      'Mengubah kalimat positif ke negatif dan pertanyaan dengan cepat.',
      'Membuat pertanyaan dengan kata tanya (what, where, when).',
    ],
    explanation: [
      'Langkah pertama: lihat kalimatnya. Ada am/is/are? Itu kalimat be. Tidak ada, hanya verb biasa? Itu kalimat do/does.',
      'Kalimat be: negatif = be + not; pertanyaan = be pindah ke depan. Tidak perlu do/does.',
      'Kalimat verb biasa: negatif = don\'t/doesn\'t + verb dasar; pertanyaan = Do/Does di depan + verb dasar.',
      'Kata tanya (What, Where, When, Why, How) diletakkan paling depan, lalu pola pertanyaannya sama: "Where are you?", "What do you use?"',
    ],
    patterns: [
      { pattern: 'Be: You are busy → You aren\'t busy → Are you busy?' },
      { pattern: "Verb: You work here → You don't work here → Do you work here?" },
      { pattern: 'Wh- + be + subject?', examples: ['Where is the file?'] },
      { pattern: 'Wh- + do/does + subject + verb?', examples: ['What does this function do?'] },
    ],
    examples: [
      { en: 'You are busy.', id: 'Kamu sibuk.' },
      { en: "You aren't busy.", id: 'Kamu tidak sibuk.' },
      { en: 'Are you busy?', id: 'Kamu sibuk?' },
      { en: 'You work here.', id: 'Kamu kerja di sini.' },
      { en: "You don't work here.", id: 'Kamu tidak kerja di sini.' },
      { en: 'Do you work here?', id: 'Kamu kerja di sini?' },
      { en: 'Where is the config file?', id: 'File config-nya di mana?' },
      { en: 'What does this error mean?', id: 'Error ini artinya apa?' },
    ],
    comparisons: [
      {
        a: { en: 'Is the test slow?', id: 'Tesnya lambat?' },
        b: { en: 'Does the test fail?', id: 'Tesnya gagal?' },
        explanation: 'Slow = keadaan (be). Fail = verb → pakai does.',
      },
    ],
    mistakes: [
      { wrong: 'Do you are ready?', correct: 'Are you ready?', reason: 'Kalimat be tidak memakai do.' },
      { wrong: 'Are you work here?', correct: 'Do you work here?', reason: 'Work adalah verb biasa → do.' },
      { wrong: 'Where you are?', correct: 'Where are you?', reason: 'Setelah kata tanya, be tetap di depan subject.' },
      { wrong: 'What this function does?', correct: 'What does this function do?', reason: 'Kata tanya + does + subject + verb dasar.' },
    ],
    expressions: [
      { phrase: 'What do you mean?', meaning: 'Maksudnya apa?' },
      { phrase: 'Does that make sense?', meaning: 'Masuk akal? / Bisa dipahami?' },
    ],
    dialog: {
      lines: [
        { speaker: 'You', text: 'Does this endpoint need a token?', translation: 'Endpoint ini perlu token?' },
        { speaker: 'Senior', text: "Yes, it does. Is your token valid?", translation: 'Ya. Token kamu valid?' },
        { speaker: 'You', text: "I'm not sure. Where is the auth config?", translation: 'Saya kurang yakin. Config auth-nya di mana?' },
        { speaker: 'Senior', text: "It's in the .env file.", translation: 'Di file .env.' },
      ],
    },
    activities: [
      {
        id: 'l5-ex1',
        type: 'exercise',
        title: 'Ubah ke negatif dan pertanyaan',
        items: [
          { prompt: 'The build is green.', answer: "The build isn't green. / Is the build green?" },
          { prompt: 'She uses Postman.', answer: "She doesn't use Postman. / Does she use Postman?" },
          { prompt: 'They are online.', answer: "They aren't online. / Are they online?" },
          { prompt: 'We need a new server.', answer: "We don't need a new server. / Do we need a new server?" },
        ],
      },
      {
        id: 'l5-ex2',
        type: 'exercise',
        title: 'Buat pertanyaan dengan kata tanya',
        items: [
          { prompt: 'Where / the logs? (be)', answer: 'Where are the logs?' },
          { prompt: 'What / you / use for testing?', answer: 'What do you use for testing?' },
          { prompt: 'When / the meeting? (be)', answer: 'When is the meeting?' },
          { prompt: 'How / this function / work?', answer: 'How does this function work?' },
        ],
      },
      {
        id: 'l5-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        items: [
          {
            prompt: 'Tulis 2 pertanyaan yang biasa kamu tanyakan saat onboarding di proyek baru (satu dengan be, satu dengan do).',
            answer: 'Contoh: Where is the documentation? Do we have a staging server?',
          },
          {
            prompt: 'Tulis 1 kalimat negatif tentang hal yang tidak kamu kerjakan.',
            answer: "Contoh: I don't work on the frontend.",
          },
        ],
      },
      {
        id: 'l5-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Kamu paham?', answer: 'Do you understand?' },
          { prompt: 'Kamu siap?', answer: 'Are you ready?' },
          { prompt: 'Fungsi ini buat apa?', answer: 'What does this function do?', alternatives: ['What is this function for?'] },
        ],
      },
      {
        id: 'l5-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: '___ the server down? (Is / Does)', answer: 'Is', explanation: 'Down = keadaan → be.' },
          { prompt: '___ the server restart every night? (Is / Does)', answer: 'Does', explanation: 'Restart = verb → does.' },
        ],
      },
    ],
    summary: [
      'Cek dulu: kalimat be atau verb biasa?',
      "Be: isn't/aren't; Is/Are …?",
      "Verb: don't/doesn't + verb; Do/Does … + verb?",
      'Kata tanya selalu di depan: Where are…? What do…?',
    ],
    reviewRecommendation: 'Ulangi jika kamu masih mencampur "Do you are" atau "Are you work".',
  },
  'level-1-m1-l6': {
    objectives: [
      'Memakai a/an untuk benda tunggal yang baru disebut atau tidak spesifik.',
      'Memilih a atau an berdasarkan bunyi awal.',
      'Memakai the untuk sesuatu yang sudah jelas dari konteks.',
    ],
    explanation: [
      'Bahasa Indonesia tidak punya artikel, jadi ini sering terlewat. Kata benda tunggal yang bisa dihitung (a developer, a bug) biasanya butuh artikel.',
      '"A/an" = salah satu, belum spesifik, atau baru diperkenalkan: "I have an idea." "She is a developer."',
      '"A" atau "an" ditentukan oleh BUNYI awal, bukan huruf: an idea, an error, an hour (h tidak dibaca), an API (dibaca "ei-pi-ai"), tetapi a user (dibaca "yu-") dan a URL (dibaca "yu-ar-el").',
      '"The" = yang sudah jelas mana yang dimaksud, karena sudah disebut atau karena konteksnya: "Please check the database" (database proyek kita).',
    ],
    patterns: [
      { pattern: 'a + bunyi konsonan', examples: ['a developer', 'a user', 'a bug'] },
      { pattern: 'an + bunyi vokal', examples: ['an idea', 'an error', 'an API', 'an hour'] },
      { pattern: 'the + benda yang spesifik', examples: ['the database', 'the meeting this afternoon'] },
    ],
    examples: [
      { en: 'I am a developer.', id: 'Saya seorang developer.' },
      { en: 'I have an idea.', id: 'Saya punya ide.' },
      { en: 'Please check the database.', id: 'Tolong cek database-nya.' },
      { en: 'The system is ready.', id: 'Sistemnya sudah siap.' },
      { en: 'There is a bug in the login page.', id: 'Ada bug di halaman login.' },
      { en: 'I found a bug. The bug is in the payment module.', id: 'Saya menemukan bug. Bug-nya ada di modul pembayaran.', note: 'Pertama a, selanjutnya the.' },
    ],
    comparisons: [
      {
        a: { en: 'I need a laptop.', id: 'Saya butuh laptop (mana saja).' },
        b: { en: 'I need the laptop.', id: 'Saya butuh laptop itu (yang kita tahu).' },
        explanation: 'A = tidak spesifik. The = yang sudah diketahui pembicara dan pendengar.',
      },
      {
        a: { en: 'a user', id: 'a, karena bunyi awal "yu"' },
        b: { en: 'an update', id: 'an, karena bunyi awal "a"' },
        explanation: 'Huruf awal sama-sama "u", tetapi bunyinya berbeda.',
      },
    ],
    mistakes: [
      { wrong: 'I am developer.', correct: 'I am a developer.', reason: 'Profesi tunggal butuh a/an.' },
      { wrong: 'I have a idea.', correct: 'I have an idea.', reason: 'Idea diawali bunyi vokal.' },
      { wrong: 'Please restart server.', correct: 'Please restart the server.', reason: 'Server yang dimaksud spesifik → the.' },
    ],
    expressions: [
      { phrase: 'Give me a minute.', meaning: 'Tunggu sebentar.' },
      { phrase: "That's a good point.", meaning: 'Poin yang bagus.' },
    ],
    dialog: {
      lines: [
        { speaker: 'A', text: 'I have an idea for the dashboard.', translation: 'Saya punya ide untuk dashboard-nya.' },
        { speaker: 'B', text: "Great. Is it a big change?", translation: 'Bagus. Perubahannya besar?' },
        { speaker: 'A', text: 'No, just a new chart. The data is already in the database.', translation: 'Tidak, cuma grafik baru. Datanya sudah ada di database.' },
      ],
    },
    activities: [
      {
        id: 'l6-ex1',
        type: 'exercise',
        title: 'Isi a / an / the',
        items: [
          { prompt: "She is ___ engineer.", answer: 'an' },
          { prompt: 'We need ___ new server.', answer: 'a' },
          { prompt: 'It takes ___ hour to deploy.', answer: 'an', explanation: 'Hour dibaca "aur" → bunyi vokal.' },
          { prompt: 'Can you send me ___ report from yesterday?', answer: 'the', explanation: 'Laporan yang spesifik (dari kemarin).' },
          { prompt: 'This is ___ useful tool.', answer: 'a', explanation: 'Useful dibaca "yus-" → bunyi konsonan.' },
        ],
      },
      {
        id: 'l6-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        items: [
          {
            prompt: 'Ceritakan sebuah masalah di proyekmu: sebut dulu dengan a/an, lalu lanjutkan dengan the.',
            answer: 'Contoh: We have a problem with an API. The API returns a 500 error.',
          },
          { prompt: 'Perkenalkan pekerjaanmu dengan a/an.', answer: 'Contoh: I am a backend developer at an e-commerce company.' },
        ],
      },
      {
        id: 'l6-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Saya punya pertanyaan.', answer: 'I have a question.' },
          { prompt: 'Tolong cek log-nya.', answer: 'Please check the logs.' },
          { prompt: 'Ada error di halaman ini.', answer: 'There is an error on this page.' },
        ],
      },
      {
        id: 'l6-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: '(a / an) URL', answer: 'a URL', explanation: 'Dibaca "yu-ar-el".' },
          { prompt: '(a / an) SQL query', answer: 'an SQL query', alternatives: ['a SQL query'], explanation: 'Tergantung cara baca: "es-kyu-el" → an; "sequel" → a.' },
        ],
      },
    ],
    summary: [
      'Benda tunggal yang bisa dihitung biasanya butuh artikel.',
      'a/an = baru disebut atau tidak spesifik; the = sudah jelas yang mana.',
      'Pilih a/an berdasarkan bunyi: an hour, a user.',
    ],
    reviewRecommendation: 'Ulangi jika kamu masih sering menulis "I am developer" atau "restart server".',
  },
  'level-1-m1-l7': {
    objectives: [
      'Memakai in/on/at untuk tempat dan waktu yang umum.',
      'Memakai to untuk arah/penerima dan for untuk tujuan/manfaat.',
    ],
    explanation: [
      'Preposisi jarang bisa diterjemahkan satu-satu dari bahasa Indonesia ("di" bisa jadi in, on, atau at). Pelajari dalam pasangan kata yang sering dipakai.',
      'Tempat: in = di dalam ruang/area (in an office, in Jakarta). On = di permukaan atau platform (on the table, on GitHub, on Slack). At = di titik/lokasi kegiatan (at work, at home, at the office).',
      'Waktu: at + jam (at 9 a.m.), on + hari/tanggal (on Monday), in + bulan/tahun/bagian hari (in May, in the morning).',
      'To = menuju atau kepada siapa (go to work, send it to my manager). For = untuk tujuan atau untuk siapa manfaatnya (a tool for testing, this is for you).',
      'Aturan ini adalah pola umum, bukan hukum mutlak. Kalau ragu, ingat contoh frasa utuhnya.',
    ],
    patterns: [
      { pattern: 'in + kota/negara/ruangan', examples: ['I work in an office.', 'She lives in Bandung.'] },
      { pattern: 'on + hari / platform', examples: ['The meeting is on Monday.', "It's on GitHub."] },
      { pattern: 'at + jam / lokasi kegiatan', examples: ['I am at work.', 'The call is at 3 p.m.'] },
      { pattern: 'verb + to + tujuan/penerima', examples: ['I send the report to my manager.'] },
      { pattern: 'for + tujuan/penerima manfaat', examples: ['This tool is for testing.'] },
    ],
    examples: [
      { en: 'I work in an office.', id: 'Saya bekerja di kantor.' },
      { en: 'The meeting is on Monday.', id: 'Rapatnya hari Senin.' },
      { en: 'I am at work.', id: 'Saya sedang di kantor/bekerja.' },
      { en: 'I send the report to my manager.', id: 'Saya mengirim laporan ke manajer saya.' },
      { en: 'This tool is for testing.', id: 'Alat ini untuk testing.' },
      { en: 'The code is on GitHub.', id: 'Kodenya ada di GitHub.' },
      { en: 'I usually code in the morning.', id: 'Saya biasanya ngoding pagi hari.' },
    ],
    comparisons: [
      {
        a: { en: "I'm at the office.", id: 'Saya di kantor (sebagai lokasi kegiatan).' },
        b: { en: "I'm in the office.", id: 'Saya di dalam gedung/ruang kantor.' },
        explanation: 'Keduanya umum. At menekankan lokasi; in menekankan berada di dalam ruangan.',
      },
      {
        a: { en: 'I send it to you.', id: 'Saya kirim ke kamu (penerima).' },
        b: { en: 'I made it for you.', id: 'Saya buat untuk kamu (manfaat).' },
        explanation: 'To = arah/penerima. For = tujuan atau manfaat.',
      },
    ],
    mistakes: [
      { wrong: 'The meeting is in Monday.', correct: 'The meeting is on Monday.', reason: 'Hari memakai on.' },
      { wrong: 'See you on 3 p.m.', correct: 'See you at 3 p.m.', reason: 'Jam memakai at.' },
      { wrong: 'I go to home.', correct: 'I go home.', reason: '"Home" setelah go tidak memakai to.' },
      { wrong: 'This function is to validate input.', correct: 'This function is for validating input. / This function validates input.', reason: 'Untuk fungsi/kegunaan, pakai "for + -ing" atau verb langsung.' },
    ],
    expressions: [
      { phrase: "I'll send it to you on Slack.", meaning: 'Saya kirim ke kamu lewat Slack.' },
      { phrase: "Let's meet at ten.", meaning: 'Ketemu jam sepuluh ya.' },
    ],
    dialog: {
      lines: [
        { speaker: 'A', text: 'When is the sprint review?', translation: 'Sprint review kapan?' },
        { speaker: 'B', text: "It's on Friday at two.", translation: 'Hari Jumat jam dua.' },
        { speaker: 'A', text: "I'm not in the office on Friday.", translation: 'Saya tidak di kantor hari Jumat.' },
        { speaker: 'B', text: "No problem. I'll send the link to you.", translation: 'Tidak apa-apa. Saya kirim link-nya ke kamu.' },
      ],
    },
    activities: [
      {
        id: 'l7-ex1',
        type: 'exercise',
        title: 'Isi in / on / at / to / for',
        items: [
          { prompt: 'The stand-up is ___ 9 a.m.', answer: 'at' },
          { prompt: 'Our servers are ___ Singapore.', answer: 'in' },
          { prompt: 'The documentation is ___ Confluence.', answer: 'on', explanation: 'Platform → on.' },
          { prompt: 'Please send the invoice ___ the client.', answer: 'to' },
          { prompt: 'This script is ___ database backups.', answer: 'for' },
          { prompt: 'I have a day off ___ Friday.', answer: 'on' },
        ],
      },
      {
        id: 'l7-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        items: [
          {
            prompt: 'Jelaskan jadwal kerjamu minggu ini (gunakan on dan at).',
            answer: 'Contoh: I have a client call on Tuesday at 10 a.m.',
          },
          {
            prompt: 'Jelaskan kegunaan satu tool yang kamu pakai (gunakan for).',
            answer: 'Contoh: I use Postman for API testing.',
          },
        ],
      },
      {
        id: 'l7-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Saya lagi di rumah.', answer: "I'm at home." },
          { prompt: 'Kodenya ada di GitHub.', answer: 'The code is on GitHub.' },
          { prompt: 'Saya kirim email ke tim.', answer: 'I send an email to the team.', alternatives: ["I'll send an email to the team."] },
        ],
      },
      {
        id: 'l7-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: 'Perbaiki: "The release is in Friday."', answer: 'The release is on Friday.' },
          { prompt: 'Perbaiki: "I work at Jakarta."', answer: 'I work in Jakarta.', explanation: 'Kota → in.' },
        ],
      },
    ],
    summary: [
      'Waktu: at + jam, on + hari, in + bulan/tahun/pagi.',
      'Tempat: in (di dalam/kota), on (permukaan/platform), at (lokasi kegiatan).',
      'To = arah/penerima; for = tujuan/manfaat.',
    ],
    reviewRecommendation: 'Ulangi jika kamu masih ragu antara in/on/at untuk waktu.',
  },
  'level-1-m1-l8': {
    objectives: [
      'Menggabungkan dua ide pendek menjadi satu kalimat yang natural.',
      'Memakai because untuk alasan dan so untuk akibat.',
    ],
    explanation: [
      'And = menambahkan informasi. But = kontras/berlawanan. Because = alasan (kenapa). So = akibat/hasil (jadi).',
      'Because dan so membicarakan hal yang sama dari arah berbeda: "I am tired because I worked late" (alasan) = "I worked late, so I am tired" (akibat).',
      'Kalimat pendek yang benar itu bagus. Kata sambung membantu kamu terdengar lebih lancar saat menjelaskan masalah atau status pekerjaan.',
      'Dalam tulisan, biasanya ada koma sebelum but dan so ketika menghubungkan dua kalimat lengkap.',
    ],
    patterns: [
      { pattern: 'Kalimat + and + kalimat/kata', examples: ['I work with PHP and MySQL.'] },
      { pattern: 'Kalimat, but + kalimat', examples: ['I understand the problem, but I need more time.'] },
      { pattern: 'Kalimat + because + alasan', examples: ['I am learning English because I want to work abroad.'] },
      { pattern: 'Sebab, so + akibat', examples: ['The server is down, so I am checking the logs.'] },
    ],
    examples: [
      { en: 'I work with PHP and MySQL.', id: 'Saya bekerja dengan PHP dan MySQL.' },
      { en: 'I understand the problem, but I need more time.', id: 'Saya paham masalahnya, tapi butuh waktu lebih.' },
      { en: 'I am learning English because I want to work abroad.', id: 'Saya belajar bahasa Inggris karena ingin kerja di luar negeri.' },
      { en: 'The server is down, so I am checking the logs.', id: 'Servernya mati, jadi saya sedang cek log.' },
      { en: "The fix is small, but it's important.", id: 'Perbaikannya kecil, tapi penting.' },
    ],
    comparisons: [
      {
        a: { en: "I'm late because the traffic is bad.", id: 'Saya terlambat karena macet.' },
        b: { en: "The traffic is bad, so I'm late.", id: 'Macet, jadi saya terlambat.' },
        explanation: 'Because memperkenalkan alasan; so memperkenalkan akibat.',
      },
    ],
    mistakes: [
      {
        wrong: 'Because the server is down, so I check the logs.',
        correct: 'The server is down, so I check the logs. / Because the server is down, I check the logs.',
        reason: 'Pilih salah satu: because ATAU so, jangan keduanya (beda dengan "karena…, jadi…").',
      },
      { wrong: 'I like Laravel but.', correct: 'I like Laravel, but I prefer Go for this project.', reason: 'But harus diikuti ide yang berlawanan.' },
    ],
    expressions: [
      { phrase: "It works, but it's slow.", meaning: 'Jalan, tapi lambat.' },
      { phrase: "I'm stuck, so I need a second pair of eyes.", meaning: 'Saya buntu, jadi butuh orang lain untuk ikut lihat.' },
    ],
    dialog: {
      title: 'Update di daily stand-up',
      lines: [
        { speaker: 'You', text: 'Yesterday I finished the login API and the tests.', translation: 'Kemarin saya menyelesaikan API login dan tesnya.' },
        { speaker: 'You', text: "Today I'm working on the payment module, but I need access to the sandbox.", translation: 'Hari ini saya mengerjakan modul pembayaran, tapi butuh akses ke sandbox.' },
        { speaker: 'Lead', text: "OK. I'll ask the admin, because I don't have permission.", translation: 'Oke. Saya minta ke admin, karena saya tidak punya izin.' },
      ],
    },
    activities: [
      {
        id: 'l8-ex1',
        type: 'exercise',
        title: 'Pilih and / but / because / so',
        items: [
          { prompt: 'I know Laravel ___ Vue.', answer: 'and' },
          { prompt: 'The test passes locally, ___ it fails on CI.', answer: 'but' },
          { prompt: "I can't join the call ___ my internet is unstable.", answer: 'because' },
          { prompt: 'The deadline is tomorrow, ___ we need to focus.', answer: 'so' },
        ],
      },
      {
        id: 'l8-ex2',
        type: 'exercise',
        title: 'Gabungkan dua kalimat',
        instructions: 'Gabungkan dengan kata sambung yang paling tepat. Bisa lebih dari satu jawaban.',
        items: [
          {
            prompt: 'The query is slow. We need an index.',
            answer: 'The query is slow, so we need an index.',
            alternatives: ['We need an index because the query is slow.'],
          },
          {
            prompt: 'I write the code. I test it.',
            answer: 'I write the code and test it.',
            alternatives: ['I write the code, and I test it.'],
          },
          {
            prompt: 'The feature is ready. The client wants changes.',
            answer: 'The feature is ready, but the client wants changes.',
          },
        ],
      },
      {
        id: 'l8-prod',
        type: 'exercise',
        title: 'Latihan produksi kalimat',
        open: true,
        items: [
          {
            prompt: 'Buat update stand-up singkat (2–3 kalimat) yang memakai minimal dua kata sambung.',
            answer: "Contoh: I finished the report and sent it to the client. Now I'm fixing a bug, but I need help with the database.",
          },
          {
            prompt: 'Jelaskan alasan kamu belajar bahasa Inggris dengan because.',
            answer: 'Contoh: I am learning English because I want to join an international team.',
          },
        ],
      },
      {
        id: 'l8-recall',
        type: 'recall',
        title: 'Ubah maksud ke bahasa Inggris',
        items: [
          { prompt: 'Saya paham, tapi saya butuh contoh.', answer: 'I understand, but I need an example.' },
          { prompt: 'API-nya error, jadi saya cek log-nya.', answer: 'The API has an error, so I am checking the logs.', alternatives: ["The API is returning errors, so I'm checking the logs."] },
          { prompt: 'Saya terlambat karena hujan.', answer: "I'm late because it's raining." },
        ],
      },
      {
        id: 'l8-eval',
        type: 'evaluation',
        title: 'Cek pemahaman',
        items: [
          { prompt: 'Perbaiki: "Because I am tired, so I go home."', answer: 'I am tired, so I go home. / Because I am tired, I go home.' },
        ],
      },
    ],
    summary: [
      'and = tambah, but = berlawanan, because = alasan, so = akibat.',
      'Jangan pakai because dan so sekaligus dalam satu kalimat.',
      'Gabungkan kalimat pendek untuk update kerja yang lebih jelas.',
    ],
    reviewRecommendation: 'Ulangi sambil menyusun update stand-up harianmu dengan and/but/because/so.',
  },
};
