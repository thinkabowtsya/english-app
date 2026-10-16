import { describe, expect, it } from 'vitest';
import { rowMessagesToSession, sessionTitle, sessionToRow } from './tutor-history';
import type { TutorMessage } from './tutor-store';

const msg = (role: TutorMessage['role'], content: string, createdAt: number): TutorMessage => ({
  id: `t_${createdAt}`,
  role,
  content,
  createdAt,
});

describe('tutor history mapping', () => {
  it('memakai pertanyaan pertama sebagai judul dan memendekkannya', () => {
    expect(sessionTitle([msg('user', '  Apa  bedanya\nmake dan do? ', 1)])).toBe('Apa bedanya make dan do?');
    const long = sessionTitle([msg('user', 'x'.repeat(300), 1)]);
    expect(long).toHaveLength(120);
    expect(long.endsWith('…')).toBe(true);
  });

  it('membuat baris tabel dengan rentang waktu dan jumlah pesan', () => {
    const row = sessionToRow(
      {
        sessionId: '11111111-1111-4111-8111-111111111111',
        messages: [msg('user', 'Q', 1_000), msg('assistant', 'A', 5_000)],
      },
      'beginner',
    );
    expect(row).toMatchObject({
      title: 'Q',
      difficulty: 'beginner',
      message_count: 2,
      started_at: new Date(1_000).toISOString(),
      ended_at: new Date(5_000).toISOString(),
    });
    expect(row.messages).toEqual([
      { role: 'user', content: 'Q', createdAt: 1_000 },
      { role: 'assistant', content: 'A', createdAt: 5_000 },
    ]);
  });

  it('mengembalikan sesi dari JSON dan membuang entri rusak', () => {
    const s = rowMessagesToSession('abc', [
      { role: 'user', content: 'Q', createdAt: 1 },
      { role: 'system', content: 'x' },
      null,
      { role: 'assistant', content: 'A' },
    ]);
    expect(s.sessionId).toBe('abc');
    expect(s.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'Q'],
      ['assistant', 'A'],
    ]);
  });
});
