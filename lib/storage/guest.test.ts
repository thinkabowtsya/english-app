import { beforeEach, describe, expect, it, vi } from 'vitest';

// Tamu tidak boleh pernah menyentuh Supabase: klien palsu ini gagal bila dipanggil.
const supabaseCalls = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => {
    supabaseCalls.count++;
    throw new Error('Supabase tidak boleh dipanggil untuk tamu');
  },
}));

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

let storage: MemoryStorage;

async function freshModules() {
  vi.resetModules();
  const actions = await import('./actions');
  const store = await import('./store');
  return { actions, store };
}

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: storage, addEventListener: () => {} });
  supabaseCalls.count = 0;
});

describe('mode tamu', () => {
  it('akun tamu baru dimulai dari nol', async () => {
    const { actions, store } = await freshModules();
    actions.loadLocalData();
    const data = store.getData();
    expect(data?.sessions).toEqual([]);
    expect(store.getCloudState().userId).toBeNull();
  });

  it('perubahan disimpan ke localStorage, bukan Supabase, dan bertahan setelah reload', async () => {
    let { actions, store } = await freshModules();
    actions.loadLocalData();
    expect(
      actions.addReview({
        kind: 'phrase',
        label: 'I am on it',
        note: null,
        reason: 'test',
        lessonId: null,
        source: 'manual',
        nextReviewAt: null,
      }),
    ).toBe(true);
    actions.markLessonOpened('level-1-m1-l1', 'level-1-m1');
    expect(await actions.updateSettings({ dailyGoalMinutes: 45 })).toBe(true);
    // tunggu promise penyimpanan async
    await new Promise((r) => setTimeout(r, 0));

    expect(supabaseCalls.count).toBe(0);
    expect(store.getCloudState().syncError).toBeNull();
    expect(storage.getItem('english-app:guest-data')).not.toBeNull();

    // "Reload": modul baru, localStorage yang sama.
    ({ actions, store } = await freshModules());
    actions.loadLocalData();
    const data = store.getData()!;
    expect(data.reviews.map((r) => r.label)).toEqual(['I am on it']);
    expect(data.lessons['level-1-m1-l1']).toBeDefined();
    expect(data.settings.dailyGoalMinutes).toBe(45);
  });

  it('sesi timer tamu tersimpan lokal tanpa antrean cloud', async () => {
    const { actions, store } = await freshModules();
    actions.loadLocalData();
    const t0 = Date.now();
    actions.startTimer(5, null, t0);
    actions.stopActiveTimer(t0 + 2 * 60_000);
    await new Promise((r) => setTimeout(r, 0));
    expect(store.getData()!.sessions).toHaveLength(1);
    expect(store.getCloudState().pendingSessions).toBe(0);
    expect(supabaseCalls.count).toBe(0);
    const saved = JSON.parse(storage.getItem('english-app:guest-data')!);
    expect(saved.sessions).toHaveLength(1);
  });

  it('reset progres tamu hanya menghapus data lokal', async () => {
    const { actions, store } = await freshModules();
    actions.loadLocalData();
    actions.startTimer(5, null, 1_000_000);
    actions.stopActiveTimer(1_000_000 + 60_000);
    const res = await actions.resetProgress(store.getData()!);
    expect(res).toEqual({ ok: true });
    expect(store.getData()!.sessions).toEqual([]);
    expect(supabaseCalls.count).toBe(0);
  });
});
