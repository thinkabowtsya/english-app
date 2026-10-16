import { describe, expect, it } from 'vitest';
import { safeNextPath } from './env';

describe('safeNextPath (cegah open redirect setelah login)', () => {
  it('menerima path internal', () => {
    expect(safeNextPath('/materi/level-1-m1-l1')).toBe('/materi/level-1-m1-l1');
    expect(safeNextPath('/progres?x=1')).toBe('/progres?x=1');
  });

  it('menolak URL eksternal dan bentuk berbahaya', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeNextPath(bad)).toBe('/');
    }
  });

  it('tidak mengarahkan kembali ke /login', () => {
    expect(safeNextPath('/login?next=/')).toBe('/');
  });
});
