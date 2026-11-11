import { createProgressHandlers } from '@/lib/server/study-list-api';
import { OXFORD_LIST } from '@/lib/server/study-lists';

/** Status "sudah dipelajari" untuk menu Oxford 3000 (tabel oxford_words). */
export const { GET, PATCH } = createProgressHandlers(OXFORD_LIST);
