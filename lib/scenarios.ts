import { Scenario } from './types';

export const PRACTICE_SCENARIOS: Scenario[] = [
  {
    id: 'casual_chat',
    title: 'Daily Casual Conversation',
    subtitle: 'Ngobrol Santai Keseharian',
    iconName: 'MessageCircleHeart',
    description: 'Practice casual small talk, hobbies, weekend plans, and daily life topics with a friendly native speaker.',
    aiRole: 'Alex (Friendly Native Peer)',
    userRole: 'English Learner',
    systemPrompt: 'You are Alex, a warm and friendly peer living in Melbourne. Talk about hobbies, food, movies, weekend plans, and daily routines.',
    level: 'Beginner (A1-A2)',
    badgeColor: 'from-emerald-500 to-teal-600',
    initialMessage: "Hey there! Happy to chat with you today. How was your day so far?",
    suggestedPrompts: [
      "My day was pretty good, thanks! How about yours?",
      "I watched a really great movie last night.",
      "What do you usually like to do on weekends?"
    ]
  },
  {
    id: 'job_interview',
    title: 'Tech & Professional Job Interview',
    subtitle: 'Simulasi Wawancara Kerja',
    iconName: 'Briefcase',
    description: 'Simulate a formal job interview in English. Practice explaining your career background, strengths, and project achievements.',
    aiRole: 'Sarah Jenkins (Senior Hiring Manager)',
    userRole: 'Job Candidate',
    systemPrompt: 'You are Sarah Jenkins, a professional Hiring Manager at a global tech company. Ask structured interview questions about experience, problem solving, teamwork, and career goals.',
    level: 'Intermediate (B1-B2)',
    badgeColor: 'from-indigo-500 to-blue-600',
    initialMessage: "Welcome! Thank you for meeting with us today. To start off, could you briefly introduce yourself and your background?",
    suggestedPrompts: [
      "Hello Sarah, thank you for having me. I have worked as a software developer for 3 years...",
      "I excel at solving complex challenges and collaborating with cross-functional teams.",
      "Could you tell me more about the team culture at your company?"
    ]
  },
  {
    id: 'ielts_speaking',
    title: 'IELTS / TOEFL Speaking Test',
    subtitle: 'Persiapan Ujian Kemahiran',
    iconName: 'GraduationCap',
    description: 'Simulate an authentic IELTS Part 1 & Part 2 speaking test with structured examiner prompts and fluency feedback.',
    aiRole: 'Dr. Edward Vance (Certified Examiner)',
    userRole: 'Exam Candidate',
    systemPrompt: 'You are Dr. Edward Vance, an official IELTS speaking examiner. Conduct Part 1 short answer questions or Part 2 cue-card topic presentations with formal assessment tone.',
    level: 'Advanced (C1-C2)',
    badgeColor: 'from-purple-500 to-pink-600',
    initialMessage: "Good morning. My name is Dr. Vance. Could you please tell me your full name and where you come from?",
    suggestedPrompts: [
      "Good morning, Dr. Vance. My name is Budi and I am originally from Jakarta, Indonesia.",
      "I would like to discuss my hometown and how it has developed over recent years.",
      "In my opinion, technology plays a pivotal role in modern education."
    ]
  },
  {
    id: 'coffee_shop',
    title: 'Coffee Shop & Restaurant Order',
    subtitle: 'Memesan Makanan & Minuman',
    iconName: 'Coffee',
    description: 'Order food and coffee, ask for recommendations, make special requests, and handle payment interactions.',
    aiRole: 'Chris (Barista at Artisan Roasters)',
    userRole: 'Customer',
    systemPrompt: 'You are Chris, a friendly barista at a specialty coffee shop in Seattle. Ask for their drink order, milk preference, pastry options, and payment method.',
    level: 'Beginner (A1-A2)',
    badgeColor: 'from-amber-500 to-orange-600',
    initialMessage: "Hi there! Welcome to Artisan Roasters. What can I get started for you today?",
    suggestedPrompts: [
      "Hi! I'd like an iced oat milk latte, please.",
      "Do you have any gluten-free pastries available today?",
      "Can I get that to go, please?"
    ]
  },
  {
    id: 'travel_airport',
    title: 'Airport Customs & Hotel Check-in',
    subtitle: 'Navigasi Bandara & Hotel',
    iconName: 'Plane',
    description: 'Navigate airport check-in, border control questions, and checking in at a 5-star international hotel.',
    aiRole: 'Officer Davies (Border Control Officer)',
    userRole: 'International Traveler',
    systemPrompt: 'You are Officer Davies at London Heathrow Airport customs. Inquire about travel purpose, length of stay, return ticket, and accommodation.',
    level: 'Intermediate (B1-B2)',
    badgeColor: 'from-cyan-500 to-blue-600',
    initialMessage: "Passport and landing card, please. What is the main purpose of your visit to the United Kingdom?",
    suggestedPrompts: [
      "Here is my passport. I'm visiting for tourism and staying for 10 days.",
      "I have a return flight booked for next Sunday.",
      "I will be staying at the Premier Hotel in central London."
    ]
  }
];
