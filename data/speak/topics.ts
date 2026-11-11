/**
 * Topik latihan berbicara (menu Speak): situasi penting sehari-hari dan kerja IT.
 * Tiap topik: frasa kunci untuk dilatih ucap, lalu role-play dengan AI yang punya misi (goals).
 * Konten ditulis untuk aplikasi ini (konteks programmer PHP/Laravel/ERP), bahasa Inggris natural.
 */

export type SpeakCategory = 'daily' | 'work' | 'social';
export type SpeakLevel = 'A1' | 'A2' | 'B1';

export interface SpeakPhrase {
  en: string;
  id: string;
}

export interface SpeakGoal {
  id: string;
  /** Instruksi misi untuk pengguna (bahasa Indonesia). */
  label: string;
  /** Deskripsi untuk AI penilai (bahasa Inggris). */
  check: string;
}

export interface SpeakTopic {
  id: string;
  category: SpeakCategory;
  level: SpeakLevel;
  icon: string;
  title: string;
  titleEn: string;
  description: string;
  /** Situasi role-play (untuk pengguna & AI). */
  scene: string;
  aiRole: string;
  opener: string;
  phrases: SpeakPhrase[];
  goals: SpeakGoal[];
}

export const SPEAK_CATEGORIES: { id: SpeakCategory; label: string; description: string }[] = [
  { id: 'daily', label: 'Sehari-hari', description: 'Situasi dasar yang paling sering dipakai.' },
  { id: 'work', label: 'Kerja & IT', description: 'Bicara di kantor, dengan tim, dan klien.' },
  { id: 'social', label: 'Sosial & Perjalanan', description: 'Ngobrol santai, janji, layanan, dan bepergian.' },
];

export const SPEAK_TOPICS: SpeakTopic[] = [
  // ------------------------------------------------------------- Sehari-hari
  {
    id: 'introduce-yourself',
    category: 'daily',
    level: 'A1',
    icon: '👋',
    title: 'Memperkenalkan diri',
    titleEn: 'Introducing yourself',
    description: 'Nama, asal, pekerjaan, dan sedikit tentang dirimu.',
    scene: 'You meet a new colleague, Emma, on your first day at a new office.',
    aiRole: 'Emma, a friendly new colleague',
    opener: "Hi! I don't think we've met. I'm Emma. What's your name?",
    phrases: [
      { en: 'Nice to meet you.', id: 'Senang bertemu denganmu.' },
      { en: "I'm from Bandung, but I live in Jakarta now.", id: 'Saya dari Bandung, tapi sekarang tinggal di Jakarta.' },
      { en: 'I work as a web developer.', id: 'Saya bekerja sebagai web developer.' },
      { en: "I've been a developer for three years.", id: 'Saya sudah jadi developer selama tiga tahun.' },
      { en: 'In my free time, I like reading and cycling.', id: 'Di waktu luang, saya suka membaca dan bersepeda.' },
      { en: 'What about you?', id: 'Bagaimana denganmu?' },
    ],
    goals: [
      { id: 'name', label: 'Sebutkan namamu', check: 'The user says their name.' },
      { id: 'origin', label: 'Ceritakan asalmu', check: 'The user says where they are from or where they live.' },
      { id: 'job', label: 'Jelaskan pekerjaanmu', check: 'The user describes their job or role.' },
      { id: 'ask-back', label: 'Tanyakan balik tentang Emma', check: 'The user asks Emma a question about herself.' },
    ],
  },
  {
    id: 'daily-routine',
    category: 'daily',
    level: 'A1',
    icon: '⏰',
    title: 'Rutinitas harian',
    titleEn: 'Your daily routine',
    description: 'Jam bangun, perjalanan ke kantor, dan kegiatan sehari-hari.',
    scene: 'A friend asks about your typical working day.',
    aiRole: 'Daniel, a curious friend',
    opener: 'So, what does a normal day look like for you?',
    phrases: [
      { en: 'I usually get up at six.', id: 'Saya biasanya bangun jam enam.' },
      { en: 'I go to the office by motorbike.', id: 'Saya ke kantor naik motor.' },
      { en: 'I start work at eight thirty.', id: 'Saya mulai kerja jam setengah sembilan.' },
      { en: 'In the morning, I check my emails and tickets.', id: 'Di pagi hari, saya mengecek email dan tiket.' },
      { en: 'I have lunch with my team.', id: 'Saya makan siang dengan tim saya.' },
      { en: 'After work, I sometimes go to the gym.', id: 'Setelah kerja, saya kadang ke gym.' },
    ],
    goals: [
      { id: 'morning', label: 'Ceritakan pagimu (bangun, berangkat)', check: 'The user describes their morning: waking up or going to work.' },
      { id: 'work', label: 'Ceritakan kegiatan di kantor', check: 'The user describes at least one thing they do at work.' },
      { id: 'frequency', label: 'Pakai always/usually/sometimes', check: 'The user uses a frequency adverb such as always, usually, often, sometimes, or never.' },
      { id: 'evening', label: 'Ceritakan setelah pulang kerja', check: 'The user says what they do after work or in the evening.' },
    ],
  },
  {
    id: 'hobbies-weekend',
    category: 'daily',
    level: 'A2',
    icon: '🎮',
    title: 'Hobi & akhir pekan',
    titleEn: 'Hobbies and weekends',
    description: 'Apa yang kamu suka lakukan dan alasannya.',
    scene: 'A coworker asks about your weekend on Monday morning.',
    aiRole: 'Sophie, a coworker',
    opener: 'Morning! How was your weekend? Did you do anything fun?',
    phrases: [
      { en: 'It was relaxing, thanks.', id: 'Santai, terima kasih.' },
      { en: 'I went hiking with some friends.', id: 'Saya mendaki dengan beberapa teman.' },
      { en: "I'm really into photography.", id: 'Saya sangat suka fotografi.' },
      { en: 'I like it because it helps me relax.', id: 'Saya suka karena itu membantu saya rileks.' },
      { en: 'How about you? What did you do?', id: 'Kalau kamu? Apa yang kamu lakukan?' },
      { en: 'That sounds fun!', id: 'Kedengarannya seru!' },
    ],
    goals: [
      { id: 'weekend', label: 'Ceritakan akhir pekanmu', check: 'The user describes what they did on the weekend.' },
      { id: 'hobby', label: 'Sebutkan hobimu', check: 'The user names a hobby or activity they enjoy.' },
      { id: 'reason', label: 'Beri alasan (because…)', check: 'The user gives a reason, for example with "because".' },
      { id: 'ask-back', label: 'Tanyakan balik akhir pekan Sophie', check: "The user asks about Sophie's weekend or hobbies." },
    ],
  },
  {
    id: 'ordering-food',
    category: 'daily',
    level: 'A2',
    icon: '☕',
    title: 'Memesan makanan & minuman',
    titleEn: 'Ordering food and drinks',
    description: 'Memesan, bertanya menu, dan membayar di kafe.',
    scene: 'You are at a café near your office during lunch time.',
    aiRole: 'a barista at a café',
    opener: 'Hi there! What can I get for you today?',
    phrases: [
      { en: "I'd like an iced latte, please.", id: 'Saya mau es latte.' },
      { en: 'Can I get a chicken sandwich as well?', id: 'Boleh saya pesan sandwich ayam juga?' },
      { en: 'Is it spicy?', id: 'Apakah ini pedas?' },
      { en: 'Less sugar, please.', id: 'Gulanya sedikit saja.' },
      { en: "It's for here, not to go.", id: 'Makan di sini, bukan dibawa pulang.' },
      { en: 'Can I pay by card?', id: 'Bisa bayar pakai kartu?' },
    ],
    goals: [
      { id: 'drink', label: 'Pesan minuman', check: 'The user orders a drink.' },
      { id: 'food', label: 'Pesan makanan', check: 'The user orders some food.' },
      { id: 'question', label: 'Tanyakan sesuatu tentang menu', check: 'The user asks a question about the menu, size, taste, or ingredients.' },
      { id: 'pay', label: 'Tanyakan cara/total pembayaran', check: 'The user asks about the price or how to pay.' },
    ],
  },
  {
    id: 'shopping-prices',
    category: 'daily',
    level: 'A2',
    icon: '🛍️',
    title: 'Belanja & menanyakan harga',
    titleEn: 'Shopping and prices',
    description: 'Mencari barang, ukuran, harga, dan menukar barang.',
    scene: 'You are in an electronics shop looking for a new keyboard.',
    aiRole: 'a shop assistant',
    opener: 'Hello! Are you looking for anything in particular?',
    phrases: [
      { en: "I'm looking for a mechanical keyboard.", id: 'Saya sedang mencari keyboard mekanik.' },
      { en: 'How much is this one?', id: 'Yang ini berapa harganya?' },
      { en: 'Do you have a cheaper one?', id: 'Ada yang lebih murah?' },
      { en: 'Can I try it?', id: 'Boleh saya coba?' },
      { en: 'Does it come with a warranty?', id: 'Apakah ada garansinya?' },
      { en: "I'll take it.", id: 'Saya ambil yang ini.' },
    ],
    goals: [
      { id: 'looking', label: 'Jelaskan barang yang kamu cari', check: 'The user explains what product they are looking for.' },
      { id: 'price', label: 'Tanyakan harga', check: 'The user asks about the price.' },
      { id: 'compare', label: 'Tanyakan pilihan lain atau garansi', check: 'The user asks about another option, a cheaper one, or the warranty.' },
      { id: 'decide', label: 'Putuskan beli atau tidak', check: 'The user decides to buy it or politely says no.' },
    ],
  },
  {
    id: 'asking-directions',
    category: 'daily',
    level: 'A2',
    icon: '🧭',
    title: 'Menanyakan arah',
    titleEn: 'Asking for directions',
    description: 'Menanyakan lokasi dan memahami petunjuk jalan.',
    scene: 'You are in a big office building and cannot find the meeting room.',
    aiRole: 'a receptionist at the front desk',
    opener: 'Good morning! How can I help you?',
    phrases: [
      { en: 'Excuse me, where is the meeting room?', id: 'Permisi, ruang meeting di mana?' },
      { en: 'Is it on this floor?', id: 'Apakah di lantai ini?' },
      { en: 'Go straight and turn left.', id: 'Jalan lurus lalu belok kiri.' },
      { en: "It's next to the elevator.", id: 'Letaknya di sebelah lift.' },
      { en: 'Sorry, could you say that again?', id: 'Maaf, bisa diulangi?' },
      { en: 'Thank you so much for your help.', id: 'Terima kasih banyak atas bantuannya.' },
    ],
    goals: [
      { id: 'ask', label: 'Tanyakan lokasi ruangan', check: 'The user asks where a place or room is.' },
      { id: 'detail', label: 'Tanyakan detail (lantai, dekat apa)', check: 'The user asks a follow-up detail such as the floor or a landmark.' },
      { id: 'confirm', label: 'Ulangi/konfirmasi petunjuknya', check: 'The user repeats or confirms the directions, or asks to repeat them.' },
      { id: 'thanks', label: 'Ucapkan terima kasih', check: 'The user thanks the receptionist.' },
    ],
  },

  // -------------------------------------------------------------- Kerja & IT
  {
    id: 'daily-standup',
    category: 'work',
    level: 'A2',
    icon: '🧑‍💻',
    title: 'Daily stand-up',
    titleEn: 'Daily stand-up meeting',
    description: 'Apa yang sudah, akan dikerjakan, dan hambatannya.',
    scene: "It's the morning stand-up meeting with your team.",
    aiRole: 'Mark, your team lead running the stand-up',
    opener: "Good morning, everyone. Let's start. Can you give us your update?",
    phrases: [
      { en: 'Yesterday, I finished the login page.', id: 'Kemarin, saya menyelesaikan halaman login.' },
      { en: "Today, I'm going to work on the payment API.", id: 'Hari ini, saya akan mengerjakan API pembayaran.' },
      { en: "I'm still working on the report bug.", id: 'Saya masih mengerjakan bug laporan.' },
      { en: "I'm blocked by the database access.", id: 'Saya terhambat karena akses database.' },
      { en: 'I need some help from the backend team.', id: 'Saya butuh bantuan dari tim backend.' },
      { en: "That's all from me.", id: 'Itu saja dari saya.' },
    ],
    goals: [
      { id: 'done', label: 'Sebutkan yang sudah selesai', check: 'The user says what they finished or did yesterday.' },
      { id: 'plan', label: 'Sebutkan rencana hari ini', check: 'The user says what they will work on today.' },
      { id: 'blocker', label: 'Sebutkan hambatan (atau tidak ada)', check: 'The user mentions a blocker or problem, or clearly says there is none.' },
      { id: 'close', label: 'Tutup update-mu', check: 'The user closes the update, e.g. "That\'s all from me".' },
    ],
  },
  {
    id: 'explaining-bug',
    category: 'work',
    level: 'B1',
    icon: '🐞',
    title: 'Menjelaskan bug',
    titleEn: 'Explaining a bug',
    description: 'Masalah → penyebab → tindakan → hasil.',
    scene: 'A project manager asks you about a bug that customers reported in the invoice module.',
    aiRole: 'Lisa, a project manager (not technical)',
    opener: 'Hi, customers say some invoices show the wrong total. What happened?',
    phrases: [
      { en: 'The problem is in the tax calculation.', id: 'Masalahnya ada di perhitungan pajak.' },
      { en: 'It only happens when there is a discount.', id: 'Ini hanya terjadi kalau ada diskon.' },
      { en: 'The cause is a rounding error.', id: 'Penyebabnya adalah kesalahan pembulatan.' },
      { en: "I've already fixed it on staging.", id: 'Saya sudah memperbaikinya di staging.' },
      { en: 'We can deploy the fix this afternoon.', id: 'Kita bisa deploy perbaikannya sore ini.' },
      { en: 'I will also check the old invoices.', id: 'Saya juga akan mengecek invoice lama.' },
    ],
    goals: [
      { id: 'problem', label: 'Jelaskan masalahnya', check: 'The user explains what the problem is.' },
      { id: 'cause', label: 'Jelaskan penyebabnya', check: 'The user explains the cause of the problem.' },
      { id: 'action', label: 'Jelaskan tindakan/perbaikan', check: 'The user explains what they did or will do to fix it.' },
      { id: 'when', label: 'Beri perkiraan waktu selesai', check: 'The user gives a time or estimate for the fix.' },
    ],
  },
  {
    id: 'asking-for-help',
    category: 'work',
    level: 'B1',
    icon: '🙋',
    title: 'Minta bantuan & klarifikasi',
    titleEn: 'Asking for help and clarification',
    description: 'Bertanya dengan sopan dan memastikan kamu paham.',
    scene: 'You do not understand part of a new task, so you ask a senior developer for help.',
    aiRole: 'Ryan, a senior developer',
    opener: "Hey, what's up? You look a bit stuck.",
    phrases: [
      { en: 'Do you have a minute?', id: 'Ada waktu sebentar?' },
      { en: "I'm not sure how this part works.", id: 'Saya kurang yakin cara kerja bagian ini.' },
      { en: 'Could you explain it again, please?', id: 'Bisa tolong jelaskan lagi?' },
      { en: 'Do you mean the old API or the new one?', id: 'Maksudnya API lama atau yang baru?' },
      { en: 'So, if I understand correctly, I need to…', id: 'Jadi, kalau saya paham dengan benar, saya perlu…' },
      { en: 'Thanks, that really helps.', id: 'Terima kasih, itu sangat membantu.' },
    ],
    goals: [
      { id: 'polite', label: 'Buka dengan sopan', check: 'The user opens politely, e.g. asking if Ryan has a minute.' },
      { id: 'problem', label: 'Jelaskan bagian yang kamu tidak paham', check: 'The user explains what they do not understand.' },
      { id: 'clarify', label: 'Ajukan pertanyaan klarifikasi', check: 'The user asks a clarifying question.' },
      { id: 'summary', label: 'Ringkas pemahamanmu', check: 'The user summarizes what they understood, e.g. "So, I need to...".' },
    ],
  },
  {
    id: 'client-requirements',
    category: 'work',
    level: 'B1',
    icon: '🤝',
    title: 'Membahas kebutuhan klien',
    titleEn: 'Discussing client requirements',
    description: 'Menanyakan kebutuhan, batasan, dan deadline fitur.',
    scene: 'A client wants a new report in their ERP system. You collect the requirements.',
    aiRole: 'Mr. Tan, a client from a distribution company',
    opener: 'Thanks for joining. We need a new sales report in the system. Can you help us?',
    phrases: [
      { en: 'Sure. Who will use this report?', id: 'Tentu. Siapa yang akan memakai laporan ini?' },
      { en: 'What information do you need in it?', id: 'Informasi apa yang Anda butuhkan di dalamnya?' },
      { en: 'Do you need to export it to Excel?', id: 'Apakah perlu diekspor ke Excel?' },
      { en: 'When do you need it?', id: 'Kapan Anda membutuhkannya?' },
      { en: 'Let me summarize your requirements.', id: 'Saya rangkum kebutuhan Anda.' },
      { en: "I'll send you a short proposal tomorrow.", id: 'Saya akan kirim proposal singkat besok.' },
    ],
    goals: [
      { id: 'users', label: 'Tanyakan siapa penggunanya', check: 'The user asks who will use the report or feature.' },
      { id: 'data', label: 'Tanyakan data/isi yang dibutuhkan', check: 'The user asks what data or information is needed.' },
      { id: 'deadline', label: 'Tanyakan deadline', check: 'The user asks when it is needed.' },
      { id: 'next', label: 'Ringkas & sebutkan langkah berikutnya', check: 'The user summarizes the requirements or says the next step.' },
    ],
  },
  {
    id: 'job-interview',
    category: 'work',
    level: 'B1',
    icon: '💼',
    title: 'Wawancara kerja',
    titleEn: 'Job interview',
    description: 'Pengalaman, kelebihan, proyek, dan pertanyaan balik.',
    scene: 'You have an online interview for a backend developer position.',
    aiRole: 'Grace, a hiring manager at a tech company',
    opener: 'Hello, and thanks for coming. Could you tell me a little about yourself?',
    phrases: [
      { en: "I'm a backend developer with three years of experience.", id: 'Saya backend developer dengan pengalaman tiga tahun.' },
      { en: 'I mainly work with PHP, Laravel, and MySQL.', id: 'Saya terutama bekerja dengan PHP, Laravel, dan MySQL.' },
      { en: 'One project I am proud of is an inventory system.', id: 'Salah satu proyek yang saya banggakan adalah sistem inventory.' },
      { en: 'My strength is solving problems step by step.', id: 'Kelebihan saya adalah memecahkan masalah langkah demi langkah.' },
      { en: "I'm working on improving my English.", id: 'Saya sedang meningkatkan bahasa Inggris saya.' },
      { en: 'Could you tell me more about the team?', id: 'Bisa ceritakan lebih banyak tentang timnya?' },
    ],
    goals: [
      { id: 'intro', label: 'Perkenalkan diri & pengalaman', check: 'The user introduces themselves and their experience.' },
      { id: 'skills', label: 'Sebutkan keahlian teknis', check: 'The user mentions technical skills or tools.' },
      { id: 'project', label: 'Ceritakan satu proyek', check: 'The user describes a project they worked on.' },
      { id: 'question', label: 'Ajukan pertanyaan ke pewawancara', check: 'The user asks the interviewer a question.' },
    ],
  },
  {
    id: 'scheduling-meeting',
    category: 'work',
    level: 'A2',
    icon: '📅',
    title: 'Mengatur jadwal meeting',
    titleEn: 'Scheduling a meeting',
    description: 'Mengusulkan, menolak, dan menyepakati waktu.',
    scene: 'You need to find a time for a demo with a colleague from another team.',
    aiRole: 'Nina, a QA engineer from another team',
    opener: 'Hi! You wanted to set up a demo, right? When works for you?',
    phrases: [
      { en: 'Are you free on Thursday afternoon?', id: 'Apakah kamu luang Kamis sore?' },
      { en: 'How about ten o\'clock?', id: 'Bagaimana kalau jam sepuluh?' },
      { en: "Sorry, I'm busy then.", id: 'Maaf, saya sibuk saat itu.' },
      { en: 'That works for me.', id: 'Itu cocok untuk saya.' },
      { en: "I'll send you a calendar invite.", id: 'Saya akan kirim undangan kalender.' },
      { en: 'See you then!', id: 'Sampai ketemu nanti!' },
    ],
    goals: [
      { id: 'purpose', label: 'Jelaskan tujuan meeting', check: 'The user says what the meeting or demo is about.' },
      { id: 'propose', label: 'Usulkan waktu', check: 'The user suggests a day or time.' },
      { id: 'agree', label: 'Sepakati waktu', check: 'The user agrees on a final time.' },
      { id: 'invite', label: 'Sebutkan tindak lanjut (undangan)', check: 'The user says they will send an invite or confirms the next step.' },
    ],
  },

  // --------------------------------------------------- Sosial & Perjalanan
  {
    id: 'small-talk',
    category: 'social',
    level: 'A2',
    icon: '💬',
    title: 'Small talk',
    titleEn: 'Small talk',
    description: 'Basa-basi ringan: cuaca, kabar, dan rencana.',
    scene: 'You wait for the elevator with someone from another department.',
    aiRole: 'Tom, a friendly person from the finance department',
    opener: "Busy day today, huh? It's so hot outside.",
    phrases: [
      { en: 'Yeah, it really is.', id: 'Ya, benar sekali.' },
      { en: 'How is your week going?', id: 'Bagaimana minggumu sejauh ini?' },
      { en: 'Pretty busy, but good.', id: 'Cukup sibuk, tapi baik.' },
      { en: 'Any plans for the weekend?', id: 'Ada rencana akhir pekan?' },
      { en: 'Which team are you on?', id: 'Kamu di tim apa?' },
      { en: 'Nice talking to you!', id: 'Senang ngobrol denganmu!' },
    ],
    goals: [
      { id: 'respond', label: 'Tanggapi pembukaannya', check: "The user responds naturally to Tom's opening comment." },
      { id: 'question', label: 'Ajukan pertanyaan basa-basi', check: 'The user asks Tom a small-talk question.' },
      { id: 'share', label: 'Ceritakan sedikit tentang dirimu', check: 'The user shares something about their week, work, or plans.' },
      { id: 'close', label: 'Tutup obrolan dengan sopan', check: 'The user ends the conversation politely.' },
    ],
  },
  {
    id: 'customer-service-call',
    category: 'social',
    level: 'B1',
    icon: '📞',
    title: 'Komplain ke layanan pelanggan',
    titleEn: 'Calling customer service',
    description: 'Menjelaskan masalah dan meminta solusi dengan sopan.',
    scene: 'Your home internet has been very slow for three days. You call your provider.',
    aiRole: 'Kevin, a customer service agent of an internet provider',
    opener: 'Thank you for calling. My name is Kevin. How can I help you today?',
    phrases: [
      { en: "I'm calling about my internet connection.", id: 'Saya menelepon soal koneksi internet saya.' },
      { en: "It's been very slow for three days.", id: 'Sudah tiga hari sangat lambat.' },
      { en: "I've already restarted the router.", id: 'Saya sudah me-restart router.' },
      { en: 'My customer number is…', id: 'Nomor pelanggan saya adalah…' },
      { en: 'When can someone fix it?', id: 'Kapan bisa diperbaiki?' },
      { en: 'Could you send me a confirmation, please?', id: 'Bisa kirimkan konfirmasinya?' },
    ],
    goals: [
      { id: 'problem', label: 'Jelaskan masalahnya', check: 'The user explains the problem clearly.' },
      { id: 'tried', label: 'Sebutkan yang sudah kamu coba', check: 'The user says what they already tried.' },
      { id: 'solution', label: 'Minta solusi & waktunya', check: 'The user asks for a solution or when it will be fixed.' },
      { id: 'confirm', label: 'Minta konfirmasi', check: 'The user asks for confirmation, a ticket number, or a follow-up.' },
    ],
  },
  {
    id: 'hotel-check-in',
    category: 'social',
    level: 'A2',
    icon: '🏨',
    title: 'Check-in hotel',
    titleEn: 'Checking in at a hotel',
    description: 'Reservasi, fasilitas, dan permintaan khusus.',
    scene: 'You arrive at a hotel in Singapore for a work trip.',
    aiRole: 'a hotel receptionist',
    opener: 'Good evening, welcome! Do you have a reservation with us?',
    phrases: [
      { en: 'Yes, I have a reservation under the name…', id: 'Ya, saya punya reservasi atas nama…' },
      { en: "I'm staying for three nights.", id: 'Saya menginap tiga malam.' },
      { en: 'Is breakfast included?', id: 'Apakah sudah termasuk sarapan?' },
      { en: "What's the Wi-Fi password?", id: 'Apa kata sandi Wi-Fi-nya?' },
      { en: 'Could I have a quiet room, please?', id: 'Boleh saya minta kamar yang tenang?' },
      { en: 'What time is check-out?', id: 'Check-out jam berapa?' },
    ],
    goals: [
      { id: 'reservation', label: 'Sebutkan reservasimu', check: 'The user confirms they have a reservation or gives a name.' },
      { id: 'stay', label: 'Sebutkan lama menginap', check: 'The user says how long they are staying.' },
      { id: 'facility', label: 'Tanyakan fasilitas', check: 'The user asks about breakfast, Wi-Fi, or another facility.' },
      { id: 'request', label: 'Buat satu permintaan', check: 'The user makes a request, e.g. a quiet room or late check-out.' },
    ],
  },
];

export function findSpeakTopic(id: string): SpeakTopic | undefined {
  return SPEAK_TOPICS.find((t) => t.id === id);
}
