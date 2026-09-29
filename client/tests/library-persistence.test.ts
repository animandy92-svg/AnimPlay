import { beforeEach, expect, test, vi } from 'vitest';
import { QUIZ_LIBRARY } from '../src/data/library';
const fixture = vi.hoisted(() => ({ records: new Map<string, any>(), writes: 0, user: { uid: 'library-test-host', displayName: 'Test host' } }));
vi.mock('../src/services/firebase', () => ({ auth: { currentUser: fixture.user }, db: {}, requireUser: async () => fixture.user, isHostAccount: async () => true, waitForAuth: async () => fixture.user }));
vi.mock('firebase/firestore', () => {
  const snap = (ref: string) => ({ id: ref.split('/').pop(), exists: () => fixture.records.has(ref), data: () => fixture.records.get(ref) });
  return {
    doc: (_: any, ...parts: string[]) => parts.join('/'), collection: (_: any, ...parts: string[]) => parts.join('/'),
    getDoc: async (ref: string) => snap(ref),
    getDocs: async (path: string) => ({ docs: [...fixture.records.keys()].filter(key => key.startsWith(path+'/') && !key.slice(path.length+1).includes('/')).map(snap) }),
    setDoc: async (ref: string, value: any) => { fixture.records.set(ref, value); },
    updateDoc: async (ref: string, value: any) => { fixture.records.set(ref, { ...fixture.records.get(ref), ...value }); fixture.writes++; },
    deleteDoc: async (ref: string) => fixture.records.delete(ref),
    runTransaction: async (_: any, callback: any) => callback({ get: async (ref: string) => snap(ref), set: (ref: string, value: any) => { fixture.records.set(ref, value); fixture.writes++; } }),
    query: vi.fn(), where: vi.fn(), writeBatch: vi.fn(),
  };
});
beforeEach(() => { fixture.records.clear(); fixture.writes = 0; vi.resetModules(); });
test('installs 30 quizzes once across concurrent reads, preserving existing work', async () => {
  fixture.records.set('users/library-test-host/quizzes/123', { title: 'My existing quiz', questions: [], status: 'draft' });
  const { api } = await import('../src/services/api');
  const [a,b] = await Promise.all([api.quizzes.list(),api.quizzes.list()]);
  expect(a.quizzes).toHaveLength(31); expect(b.quizzes).toHaveLength(31);
  expect(fixture.writes).toBe(31);
  expect(a.quizzes.some((q: any) => q.title === 'My existing quiz')).toBe(true);
});
test('trash, favorites, restore and permanent removal survive a fresh session', async () => {
  const { api } = await import('../src/services/api');
  await api.quizzes.list();
  await api.quizzes.update(910001, { is_favorite: 1 });
  expect((await api.quizzes.list('favorites')).quizzes).toHaveLength(1);
  await api.quizzes.delete(910001);
  expect((await api.quizzes.list('trash')).quizzes).toHaveLength(1);
  await api.quizzes.restore(910001);
  expect((await api.quizzes.list()).quizzes).toHaveLength(30);
  await api.quizzes.permanentDelete(910001);
  vi.resetModules();
  const fresh = await import('../src/services/api');
  expect((await fresh.api.quizzes.list()).quizzes).toHaveLength(29);
});
test('saving a visual quiz is one write and retains media, credits and IDs through hosting', async () => {
  const { api } = await import('../src/services/api');
  const original = (await api.quizzes.get(910003)).quiz;
  const before = fixture.writes;
  await api.quizzes.save(original.id, 'Edited title', original.description, original.questions);
  expect(fixture.writes-before).toBe(1);
  const saved = (await api.quizzes.get(original.id)).quiz;
  expect(saved.questions[0].media).toEqual(original.questions[0].media);
  expect(saved.questions[0].source).toEqual(original.questions[0].source);
  expect(saved.questions[0].id).toBe(original.questions[0].id);
  const game = await api.games.start(original.id);
  expect(fixture.records.get(`games/${game.gamePin}`).quiz.questions[0].media.kind).toBe('diagram');
});
test('cloning preserves the full visual quiz and does not mutate the collection', async () => {
  const { api } = await import('../src/services/api');
  const clone = await api.quizzes.clone(910002);
  const saved = (await api.quizzes.get(clone.quiz.id)).quiz;
  expect(saved.questions).toHaveLength(17);
  expect(saved.questions[0].media.kind).toBe('image');
  expect(saved.questions[0].id).not.toBe(QUIZ_LIBRARY[1].questions[0].id);
});
