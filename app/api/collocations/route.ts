import { createProgressHandlers } from '@/lib/server/study-list-api';
import { COLLOCATION_LIST } from '@/lib/server/study-lists';

/** Status "sudah dipelajari" untuk menu Collocation (tabel collocation_progress). */
export const { GET, PATCH } = createProgressHandlers(COLLOCATION_LIST);
