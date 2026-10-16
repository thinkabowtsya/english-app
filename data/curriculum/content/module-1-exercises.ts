import 'server-only';
import type { ExerciseItem, LessonActivity, LessonContent } from '@/types/curriculum';

/**
 * Bank soal Modul 1 untuk tiga latihan utama: isi bagian kosong, susun kalimat, dan
 * produksi kalimat. Setiap kali materi dibuka, sebagian soal dipilih acak (pickCount);
 * tombol "Soal lain" menampilkan set berikutnya.
 */

interface Banks {
  fill: { instructions: string; items: ExerciseItem[] };
  arrange: ExerciseItem[];
  produce: ExerciseItem[];
}

const BANKS: Record<number, Banks> = {
  1: {
    fill: {
      instructions: 'Isi dengan "am" jika perlu. Jika tidak perlu, tulis "-".',
      items: [
        { prompt: 'I ___ ready for the demo.', answer: 'am', explanation: 'Ready = keadaan → I am ready.' },
        { prompt: 'I ___ write unit tests.', answer: '-', explanation: '"Write" verb biasa → I write unit tests.' },
        { prompt: 'I ___ a junior programmer.', answer: 'am', explanation: 'Identitas → I am a junior programmer.' },
        { prompt: 'I ___ use MySQL at work.', answer: '-', explanation: '"Use" verb biasa → I use MySQL at work.' },
        { prompt: 'I ___ sleepy today.', answer: 'am', explanation: 'Sleepy = keadaan → I am sleepy today.' },
        { prompt: 'I ___ know the answer.', answer: '-', explanation: '"Know" verb biasa → I know the answer.' },
        { prompt: 'I ___ at the office now.', answer: 'am', explanation: 'Lokasi → I am at the office now.' },
        { prompt: 'I ___ need your help.', answer: '-', explanation: '"Need" verb biasa → I need your help.' },
      ],
    },
    arrange: [
      { prompt: 'Laravel / use / we', answer: 'We use Laravel.' },
      { prompt: 'ready / is / the database', answer: 'The database is ready.' },
      { prompt: 'the bug / fix / I', answer: 'I fix the bug.', explanation: 'Subject + Verb + Object.' },
      { prompt: 'slow / the website / is', answer: 'The website is slow.' },
      { prompt: 'every day / work / I', answer: 'I work every day.' },
      { prompt: 'a developer / am / I', answer: 'I am a developer.' },
    ],
    produce: [
      { prompt: 'Tulis 1 kalimat Subject + Verb + Object tentang tool yang kamu pakai di kantor.', answer: 'Contoh: I use Git every day.', alternatives: ['My team uses Jira.'] },
      { prompt: 'Tulis 1 kalimat Subject + be + Complement tentang kondisimu hari ini.', answer: 'Contoh: I am a little tired today.', alternatives: ['I am ready for the meeting.'] },
      { prompt: 'Perkenalkan pekerjaanmu dalam 1 kalimat dengan "am".', answer: 'Contoh: I am a backend developer.' },
      { prompt: 'Tulis 1 kalimat Subject + Verb (tanpa object) tentang dirimu.', answer: 'Contoh: I work from home.', alternatives: ['I travel a lot.'] },
      { prompt: 'Jelaskan kondisi aplikasi atau server di kantormu dalam 1 kalimat.', answer: 'Contoh: The server is stable now.', alternatives: ['The app is fast.'] },
    ],
  },
  2: {
    fill: {
      instructions: 'Isi dengan kata ganti subject yang tepat (I, you, we, they, he, she, it).',
      items: [
        { prompt: 'Budi is my teammate. ___ writes the API.', answer: 'He' },
        { prompt: 'The laptop is new. ___ is very fast.', answer: 'It' },
        { prompt: 'My team and I work remotely. ___ meet on Zoom.', answer: 'We' },
        { prompt: 'Sari and Dewi are testers. ___ check every feature.', answer: 'They' },
        { prompt: 'Lina is our designer. ___ makes the UI.', answer: 'She' },
        { prompt: 'The tests are green. ___ all pass.', answer: 'They', explanation: 'Tests (jamak) → they.' },
        { prompt: 'The bug is fixed. ___ works now.', answer: 'It' },
        { prompt: 'Hi Rina, ___ are on the project too, right?', answer: 'you' },
      ],
    },
    arrange: [
      { prompt: 'works / she / in Jakarta', answer: 'She works in Jakarta.' },
      { prompt: 'on Linux / runs / it', answer: 'It runs on Linux.' },
      { prompt: 'deploy / we / on Friday', answer: 'We deploy on Friday.' },
      { prompt: 'they / remotely / work', answer: 'They work remotely.' },
      { prompt: 'my code / reviews / he', answer: 'He reviews my code.' },
      { prompt: 'online / is / she', answer: 'She is online.' },
    ],
    produce: [
      { prompt: 'Ceritakan 1 rekan kerja dengan he atau she.', answer: 'Contoh: She manages the database.', alternatives: ['He reviews my code.'] },
      { prompt: 'Ceritakan aplikasi di kantormu dengan it.', answer: 'Contoh: It runs on AWS.' },
      { prompt: 'Ceritakan timmu dengan we.', answer: 'Contoh: We have a stand-up every morning.' },
      { prompt: 'Ceritakan klien atau pengguna aplikasimu dengan they.', answer: 'Contoh: They use the app every day.' },
      { prompt: 'Tulis 2 kalimat: sebut sebuah benda, lalu lanjutkan dengan it.', answer: 'Contoh: The report is ready. It has all the numbers.' },
    ],
  },
  3: {
    fill: {
      instructions: 'Isi dengan am, is, atau are.',
      items: [
        { prompt: 'The logs ___ full of errors.', answer: 'are' },
        { prompt: 'My manager ___ on leave this week.', answer: 'is' },
        { prompt: 'I ___ not sure about the deadline.', answer: 'am' },
        { prompt: 'We ___ ready for the release.', answer: 'are' },
        { prompt: 'The new feature ___ live now.', answer: 'is' },
        { prompt: '___ you busy right now?', answer: 'Are' },
        { prompt: '___ the API down?', answer: 'Is' },
        { prompt: 'They ___ not in the office today.', answer: 'are' },
      ],
    },
    arrange: [
      { prompt: 'ready / the build / is / ?', answer: 'Is the build ready?' },
      { prompt: 'not / busy / am / I', answer: 'I am not busy.', alternatives: ["I'm not busy."] },
      { prompt: 'at home / are / they', answer: 'They are at home.' },
      { prompt: 'a developer / is / she / ?', answer: 'Is she a developer?' },
      { prompt: "isn't / the server / ready", answer: "The server isn't ready." },
      { prompt: 'you / free / are / now / ?', answer: 'Are you free now?' },
    ],
    produce: [
      { prompt: 'Tulis 3 kalimat tentang dirimu: pekerjaan, lokasi sekarang, dan kondisi.', answer: 'Contoh: I am a Laravel developer. I am at home. I am a bit sleepy.' },
      { prompt: 'Tulis 1 pertanyaan dengan be untuk rekan kerja.', answer: 'Contoh: Are you free for a quick call?', alternatives: ['Is the staging server up?'] },
      { prompt: 'Tulis 1 kalimat negatif dengan isn\'t atau aren\'t tentang proyekmu.', answer: "Contoh: The tests aren't green yet." },
      { prompt: 'Jelaskan status pekerjaanmu ke manajer dengan "I am ...".', answer: "Contoh: I am almost done with the login page." },
      { prompt: 'Tanyakan apakah sebuah sistem sudah siap.', answer: 'Contoh: Is the payment system ready?' },
    ],
  },
  4: {
    fill: {
      instructions: 'Tulis bentuk verb yang benar (Simple Present).',
      items: [
        { prompt: 'She ___ (push) her code every evening.', answer: 'pushes', explanation: 'Berakhiran -sh → -es.' },
        { prompt: 'My manager ___ (have) a meeting at ten.', answer: 'has' },
        { prompt: 'We ___ (not use) Docker.', answer: "don't use", alternatives: ['do not use'] },
        { prompt: 'He ___ (not reply) on weekends.', answer: "doesn't reply", alternatives: ['does not reply'] },
        { prompt: 'The script ___ (run) every hour.', answer: 'runs' },
        { prompt: 'Our team ___ (study) new tools every month.', answer: 'studies', explanation: 'Konsonan + y → -ies.' },
        { prompt: 'I ___ (check) Slack every morning.', answer: 'check' },
        { prompt: 'She ___ (fix) bugs quickly.', answer: 'fixes', explanation: 'Berakhiran -x → -es.' },
      ],
    },
    arrange: [
      { prompt: 'work / here / do / you / ?', answer: 'Do you work here?' },
      { prompt: 'PHP / doesn\'t / he / use', answer: "He doesn't use PHP." },
      { prompt: 'she / in an office / works', answer: 'She works in an office.' },
      { prompt: 'understand / I / don\'t', answer: "I don't understand." },
      { prompt: 'dark mode / does / support / the app / ?', answer: 'Does the app support dark mode?' },
      { prompt: 'every Thursday / deploys / our team', answer: 'Our team deploys every Thursday.' },
    ],
    produce: [
      { prompt: 'Ceritakan rutinitas kerjamu dalam 3 kalimat (mulai kerja, tools, kebiasaan).', answer: 'Contoh: I start work at eight. I check Slack first. I usually write code after the stand-up.' },
      { prompt: "Tulis 1 kalimat tentang rekan kerja dengan doesn't.", answer: "Contoh: She doesn't like long meetings." },
      { prompt: 'Tulis 2 pertanyaan untuk kandidat baru dengan "Do you ...?".', answer: 'Contoh: Do you know Laravel? Do you write unit tests?' },
      { prompt: 'Tulis 1 fakta tentang aplikasi di kantormu (he/she/it + verb-s).', answer: 'Contoh: It sends a report every Monday.' },
      { prompt: 'Tulis 1 kebiasaan yang tidak kamu lakukan dengan don\'t.', answer: "Contoh: I don't work on weekends." },
    ],
  },
  5: {
    fill: {
      instructions: 'Isi dengan is, are, do, atau does.',
      items: [
        { prompt: '___ you ready for the meeting?', answer: 'Are' },
        { prompt: '___ you use Postman?', answer: 'Do' },
        { prompt: '___ the server down?', answer: 'Is', explanation: 'Down = keadaan → be.' },
        { prompt: '___ the server restart every night?', answer: 'Does', explanation: 'Restart = verb → does.' },
        { prompt: 'Where ___ the config file?', answer: 'is' },
        { prompt: 'What ___ this function return?', answer: 'does' },
        { prompt: 'Why ___ the tests slow?', answer: 'are' },
        { prompt: 'How often ___ you deploy?', answer: 'do' },
      ],
    },
    arrange: [
      { prompt: 'are / where / the logs / ?', answer: 'Where are the logs?' },
      { prompt: 'you / for testing / use / what / do / ?', answer: 'What do you use for testing?' },
      { prompt: 'the meeting / when / is / ?', answer: 'When is the meeting?' },
      { prompt: 'this function / how / work / does / ?', answer: 'How does this function work?' },
      { prompt: "here / don't / work / you", answer: "You don't work here." },
      { prompt: "busy / aren't / you", answer: "You aren't busy." },
    ],
    produce: [
      { prompt: 'Tulis 2 pertanyaan saat onboarding di proyek baru (satu dengan be, satu dengan do).', answer: 'Contoh: Where is the documentation? Do we have a staging server?' },
      { prompt: 'Tulis 1 kalimat negatif tentang hal yang tidak kamu kerjakan.', answer: "Contoh: I don't work on the frontend." },
      { prompt: 'Tanyakan arti sebuah error dengan "What does ...?".', answer: 'Contoh: What does this error mean?' },
      { prompt: 'Tanyakan lokasi sesuatu dengan "Where is/are ...?".', answer: 'Contoh: Where is the API key for staging?' },
      { prompt: 'Ubah kalimatmu sendiri "I use ..." menjadi pertanyaan untuk temanmu.', answer: 'Contoh: I use VS Code. → Do you use VS Code?' },
    ],
  },
  6: {
    fill: {
      instructions: 'Isi dengan a, an, atau the.',
      items: [
        { prompt: 'She is ___ engineer.', answer: 'an' },
        { prompt: 'We need ___ new server.', answer: 'a' },
        { prompt: 'It takes ___ hour to deploy.', answer: 'an', explanation: 'Hour dibaca "aur" → bunyi vokal.' },
        { prompt: 'Can you send me ___ report from yesterday?', answer: 'the', explanation: 'Laporan yang spesifik.' },
        { prompt: 'This is ___ useful tool.', answer: 'a', explanation: 'Useful dibaca "yus-" → bunyi konsonan.' },
        { prompt: 'I have ___ question about the task.', answer: 'a' },
        { prompt: 'There is ___ error on line 20.', answer: 'an' },
        { prompt: 'Please restart ___ server.', answer: 'the', explanation: 'Server yang kita tahu bersama.' },
      ],
    },
    arrange: [
      { prompt: 'an / I / idea / have', answer: 'I have an idea.' },
      { prompt: 'the database / check / please', answer: 'Please check the database.' },
      { prompt: 'a / is / she / designer', answer: 'She is a designer.' },
      { prompt: 'is / the system / ready', answer: 'The system is ready.' },
      { prompt: 'need / a / we / laptop / new', answer: 'We need a new laptop.' },
      { prompt: 'an / it / takes / hour', answer: 'It takes an hour.' },
    ],
    produce: [
      { prompt: 'Ceritakan sebuah masalah di proyekmu: sebut dulu dengan a/an, lalu lanjutkan dengan the.', answer: 'Contoh: We have a problem with an API. The API returns a 500 error.' },
      { prompt: 'Perkenalkan pekerjaanmu dengan a/an.', answer: 'Contoh: I am a backend developer at an e-commerce company.' },
      { prompt: 'Minta rekan kerja mengecek sesuatu yang spesifik dengan "the".', answer: 'Contoh: Can you check the logs from last night?' },
      { prompt: 'Sebutkan 2 hal yang kamu butuhkan untuk bekerja dengan a/an.', answer: 'Contoh: I need a laptop and an internet connection.' },
      { prompt: 'Ceritakan ide untuk aplikasimu dengan "an idea".', answer: 'Contoh: I have an idea for the dashboard.' },
    ],
  },
  7: {
    fill: {
      instructions: 'Isi dengan in, on, at, to, atau for.',
      items: [
        { prompt: 'The stand-up is ___ 9 a.m.', answer: 'at' },
        { prompt: 'Our servers are ___ Singapore.', answer: 'in' },
        { prompt: 'The documentation is ___ Confluence.', answer: 'on', explanation: 'Platform → on.' },
        { prompt: 'Please send the invoice ___ the client.', answer: 'to' },
        { prompt: 'This script is ___ database backups.', answer: 'for' },
        { prompt: 'I have a day off ___ Friday.', answer: 'on' },
        { prompt: 'I usually code better ___ the morning.', answer: 'in' },
        { prompt: 'She is ___ work right now.', answer: 'at' },
      ],
    },
    arrange: [
      { prompt: 'on Monday / is / the meeting', answer: 'The meeting is on Monday.' },
      { prompt: 'in an office / I / work', answer: 'I work in an office.' },
      { prompt: 'to my manager / send / I / the report', answer: 'I send the report to my manager.' },
      { prompt: 'for testing / is / this tool', answer: 'This tool is for testing.' },
      { prompt: 'at 3 p.m. / the call / is', answer: 'The call is at 3 p.m.' },
      { prompt: 'on GitHub / the code / is', answer: 'The code is on GitHub.' },
    ],
    produce: [
      { prompt: 'Jelaskan jadwal kerjamu minggu ini (gunakan on dan at).', answer: 'Contoh: I have a client call on Tuesday at 10 a.m.' },
      { prompt: 'Jelaskan kegunaan satu tool yang kamu pakai (gunakan for).', answer: 'Contoh: I use Postman for API testing.' },
      { prompt: 'Ceritakan di mana kamu bekerja (gunakan in).', answer: 'Contoh: I work in Bandung, in a small office.' },
      { prompt: 'Ceritakan kepada siapa kamu mengirim laporan (gunakan to).', answer: 'Contoh: I send a weekly report to my team lead.' },
      { prompt: 'Ceritakan di mana kode atau dokumen timmu disimpan (gunakan on).', answer: 'Contoh: Our code is on GitLab and our notes are on Notion.' },
    ],
  },
  8: {
    fill: {
      instructions: 'Isi dengan and, but, because, atau so.',
      items: [
        { prompt: 'I know Laravel ___ Vue.', answer: 'and' },
        { prompt: 'The test passes locally, ___ it fails on CI.', answer: 'but' },
        { prompt: "I can't join the call ___ my internet is unstable.", answer: 'because' },
        { prompt: 'The deadline is tomorrow, ___ we need to focus.', answer: 'so' },
        { prompt: 'The app is fast, ___ it uses a lot of memory.', answer: 'but' },
        { prompt: "I'm learning English ___ I want to work abroad.", answer: 'because' },
        { prompt: 'The server is down, ___ I am checking the logs.', answer: 'so' },
        { prompt: 'I write the code ___ my teammate reviews it.', answer: 'and' },
      ],
    },
    arrange: [
      { prompt: 'and / with PHP / I work / MySQL', answer: 'I work with PHP and MySQL.' },
      { prompt: 'but / I need more time / I understand the problem', answer: 'I understand the problem, but I need more time.' },
      { prompt: 'because / I am tired / I worked late', answer: 'I am tired because I worked late.' },
      { prompt: 'so / the query is slow / we need an index', answer: 'The query is slow, so we need an index.' },
      { prompt: "but / it's important / the fix is small", answer: "The fix is small, but it's important." },
      { prompt: 'because / I stay late / the release is tonight', answer: 'I stay late because the release is tonight.' },
    ],
    produce: [
      { prompt: 'Buat update stand-up singkat (2–3 kalimat) dengan minimal dua kata sambung.', answer: "Contoh: I finished the report and sent it to the client. Now I'm fixing a bug, but I need help with the database." },
      { prompt: 'Jelaskan alasan kamu belajar bahasa Inggris dengan because.', answer: 'Contoh: I am learning English because I want to join an international team.' },
      { prompt: 'Jelaskan sebuah masalah dan tindakanmu dengan so.', answer: 'Contoh: The page is slow, so I am adding a cache.' },
      { prompt: 'Sampaikan kabar baik dan kabar kurang baik dalam 1 kalimat dengan but.', answer: 'Contoh: The feature works, but it still needs tests.' },
      { prompt: 'Ceritakan 2 hal yang biasa kamu kerjakan setiap hari dengan and.', answer: 'Contoh: Every day I write code and review pull requests.' },
    ],
  },
};

const fillActivity = (n: number, b: Banks): LessonActivity => ({
  id: `l${n}-ex1`,
  type: 'exercise',
  title: 'Isi bagian kosong',
  instructions: b.fill.instructions,
  pickCount: 4,
  items: b.fill.items,
});

const arrangeActivity = (n: number, b: Banks): LessonActivity => ({
  id: `l${n}-arrange`,
  type: 'exercise',
  title: 'Susun kalimat',
  instructions: 'Susun kata-kata berikut menjadi kalimat yang benar.',
  pickCount: 3,
  items: b.arrange,
});

const produceActivity = (n: number, b: Banks): LessonActivity => ({
  id: `l${n}-prod`,
  type: 'exercise',
  title: 'Latihan produksi kalimat',
  instructions: 'Tulis kalimatmu sendiri, lalu ucapkan dengan keras. Contoh jawaban hanya referensi.',
  open: true,
  pickCount: 2,
  items: b.produce,
});

/**
 * Mengganti latihan isi kosong, susun kalimat, dan produksi kalimat tiap materi dengan
 * bank soal di atas. Latihan lain (ubah bentuk, perbaiki kalimat, recall, evaluasi) tetap.
 */
export function withExerciseBanks(content: Record<string, LessonContent>): Record<string, LessonContent> {
  const out: Record<string, LessonContent> = {};
  for (const [lessonId, c] of Object.entries(content)) {
    const n = Number(lessonId.match(/-l(\d+)$/)?.[1]);
    const banks = BANKS[n];
    if (!banks) {
      out[lessonId] = c;
      continue;
    }
    const replaced = new Set([`l${n}-ex1`, `l${n}-prod`, ...(n === 1 ? ['l1-ex2'] : [])]);
    const others = (c.activities ?? []).filter((a) => !replaced.has(a.id));
    out[lessonId] = {
      ...c,
      activities: [fillActivity(n, banks), arrangeActivity(n, banks), ...others.filter((a) => a.type === 'exercise'), produceActivity(n, banks), ...others.filter((a) => a.type !== 'exercise')],
    };
  }
  return out;
}
