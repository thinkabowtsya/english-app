import { createDetailHandler } from '@/lib/server/study-list-api';
import { COLLOCATION_LIST } from '@/lib/server/study-lists';

/** Detail satu collocation: arti, kenapa pasangan ini dipakai, contoh, kesalahan umum, dan collocation terkait. */
export const POST = createDetailHandler(COLLOCATION_LIST);
