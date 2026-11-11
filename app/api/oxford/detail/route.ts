import { createDetailHandler } from '@/lib/server/study-list-api';
import { OXFORD_LIST } from '@/lib/server/study-lists';

/** Detail satu kata Oxford 3000: arti, contoh pemakaian, kata serupa, dan audio asli. */
export const POST = createDetailHandler(OXFORD_LIST);
