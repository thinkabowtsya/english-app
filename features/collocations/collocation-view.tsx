'use client';

import { COLLOCATION_GROUPS, COLLOCATIONS } from '@/data/collocations/items';
import { StudyListView, type StudyGroup, type StudyItem } from '@/features/study-list/study-list-view';

const GROUPS: StudyGroup[] = COLLOCATION_GROUPS.map((g) => ({
  id: g.id,
  label: g.label,
  info: `contoh: ${g.example}`,
}));

const ITEMS: StudyItem[] = COLLOCATIONS.map((c) => ({
  key: c.text,
  group: c.group,
  tag: c.level,
  sub: c.meaningId,
}));

export function CollocationView() {
  return (
    <StudyListView
      title="Collocation"
      description="Pasangan kata yang lazim dipakai penutur asli. Buka untuk melihat arti, contoh, kesalahan umum, dan collocation terkait, lalu simpan setelah dipelajari."
      groups={GROUPS}
      items={ITEMS}
      apiBase="/api/collocations"
      groupStorageKey="collocation-group"
      table="collocation_progress"
      unit="collocation"
      similarLabel="Collocation terkait"
      groupGridClassName="grid-cols-2 sm:grid-cols-3"
    />
  );
}
