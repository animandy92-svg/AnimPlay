// @vitest-environment node
// Run with ANIMPLAY_EMULATOR_TESTS=1 against the demo-animplay Auth/Firestore emulators.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, collection, updateDoc, terminate } from 'firebase/firestore';

vi.mock('../src/services/firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
  const app = initializeApp({ projectId: 'demo-animplay', apiKey: 'demo-key' }, 'test-host');
  const auth = getAuth(app), db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { auth, db, firebaseApp: app, waitForAuth: async () => auth.currentUser, requireUser: async () => auth.currentUser, isHostAccount: async () => true };
});

const suite = process.env.ANIMPLAY_EMULATOR_TESTS === '1' ? describe : describe.skip;
suite('real host and player sessions with Firestore rules', () => {
  let api: any, Transport: any, hostDb: any, hostAuth: any;
  const apps: any[] = [], databases: any[] = [], transports: any[] = [];
  const clients: any[] = [];
  const question = (id = 1, type = 'multiple_choice') => ({ id, question_text: type === 'open_ended' ? 'Name a planet.' : 'Which planet is red?', questionType: type, timer_seconds: 20, points: 1000, correct_index: 0, explanation: 'Iron minerals give Mars its red colour.', answers: type === 'open_ended' ? [] : [{ text: 'Mars', color: 'red' }, { text: 'Venus', color: 'blue' }] });
  const transport = (database = hostDb, identity = () => Promise.resolve(hostAuth.currentUser)) => { const t = new Transport(database, identity); t.connect(); transports.push(t); return t; };
  const state = (t: any) => { const result: any = { game: null, player: null, errors: [] }; t.on('game-state', (g: any) => { result.game = g; }); t.on('player-state', (p: any) => { result.player = p; }); t.on('error', (e: any) => result.errors.push(e.message)); return result; };
  const eventually = async (read: () => any, expected: any) => vi.waitFor(async () => expect(await read()).toEqual(expected), { timeout: 15000, interval: 100 });
  async function room(questions = [question()]) {
    const saved = await api.quizzes.save(null, 'Session verification', 'Local emulator only', questions);
    const game = await api.games.start(saved.quiz.id), host = transport(), hs = state(host);
    await host.request('host-register', { gamePin: game.gamePin });
    await eventually(() => hs.game?.status, 'lobby');
    await host.request('game-settings', { playStyle: 'relaxed', showLeaderboard: true, timeMultiplier: 1 });
    return { ...game, host, hs };
  }
  async function join(game: any, nickname: string, clientIndex = 0) {
    const client = clients[clientIndex], player = transport(client.db, () => Promise.resolve(client.auth.currentUser)), ps = state(player);
    await player.request('join-game', { gamePin: game.gamePin, nickname });
    await eventually(() => Boolean(ps.player), true);
    return { player, ps, seat: ps.player.playerId, db: client.db };
  }
  async function start(game: any) {
    await game.host.request('host-start-game');
    await eventually(() => game.hs.game?.phase, 'question');
    // The test host advances its own countdown to keep the suite quick; rules still validate server time.
    await updateDoc(doc(hostDb, 'games', game.gamePin), { questionStartsAt: Date.now() - 500 });
    await eventually(() => game.hs.game?.questionStartsAt < Date.now(), true);
  }
  beforeAll(async () => {
    const storage = new Map();
    vi.stubGlobal('sessionStorage', { setItem: (k: string, v: string) => storage.set(k, v), getItem: (k: string) => storage.get(k) || null, removeItem: (k: string) => storage.delete(k) });
    vi.stubGlobal('navigator', { onLine: true });
    const firebase = await import('../src/services/firebase'); hostDb = firebase.db; hostAuth = firebase.auth;
    apps.push(firebase.firebaseApp); databases.push(hostDb);
    await signInAnonymously(hostAuth);
    ({ api } = await import('../src/services/api'));
    ({ FirebaseGameSocket: Transport } = await import('../src/services/socket'));
    for (let i = 0; i < 3; i++) {
      const app = initializeApp({ projectId: 'demo-animplay', apiKey: 'demo-key' }, `test-player-${i}`), auth = getAuth(app), db = getFirestore(app);
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080);
      await signInAnonymously(auth); clients.push({ app, auth, db }); apps.push(app); databases.push(db);
    }
  }, 30000);
  afterEach(() => { transports.splice(0).forEach(t => t.disconnect()); });
  afterAll(async () => { await Promise.all(databases.map(db => terminate(db))); await Promise.all(apps.map(app => deleteApp(app))); vi.unstubAllGlobals(); });

  it('hosts, joins, selects teams, saves answers, restores sessions and produces detailed reports', async () => {
    const game = await room(), alice = await join(game, 'Alice'), bob = await join(game, 'Bob', 1);
    await game.host.request('create-team', { name: 'Comets' });
    await eventually(() => game.hs.game?.teams?.length, 1);
    await alice.player.request('join-team', { teamId: game.hs.game.teams[0].id });
    await start(game);
    await alice.player.request('answer-submitted', { questionId: 1, answerIndex: 0 });
    await eventually(() => alice.ps.player?.answeredQuestion, 0);
    alice.player.disconnect(); const restored = transport(alice.db, () => Promise.resolve(clients[0].auth.currentUser)), restoredState = state(restored);
    await restored.request('reconnect-player', { gamePin: game.gamePin, sessionId: alice.seat });
    await eventually(() => restoredState.player?.answerIndex, 0);
    game.host.disconnect(); const freshHost = transport(), freshState = state(freshHost);
    await freshHost.request('host-register', { gamePin: game.gamePin });
    await eventually(() => freshState.game?.phase, 'question');
    await bob.player.request('answer-submitted', { questionId: 1, answerIndex: 1 });
    await eventually(() => freshState.game?.phase, 'results');
    await freshHost.request('host-end-question'); // duplicate finalization must be harmless
    expect((await getDoc(doc(hostDb, 'games', game.gamePin, 'players', alice.seat))).data()?.score).toBe(1000);
    await freshHost.request('host-next-question', { questionIndex: 0 });
    await eventually(() => freshState.game?.status, 'finished');
    const report = await api.reports.detail(game.gameId);
    expect(report.questions).toHaveLength(1); expect(report.questions[0]).toMatchObject({ correctCount: 1, answeredCount: 2, playerCount: 2 });
    expect(report.results.find((p: any) => p.nickname === 'Alice').history[0]).toMatchObject({ answer: 'Mars', correct: true, points: 1000 });
    expect(report.results.find((p: any) => p.nickname === 'Bob').history[0].correct).toBe(false);
    expect([...freshState.errors, ...restoredState.errors, ...bob.ps.errors]).toEqual([]);
  }, 30000);
  it('reserves nicknames atomically and frees a seat when a player leaves', async () => {
    const game = await room();
    const a = transport(clients[0].db, () => Promise.resolve(clients[0].auth.currentUser)), b = transport(clients[1].db, () => Promise.resolve(clients[1].auth.currentUser));
    const result = await Promise.allSettled([a.request('join-game', { gamePin: game.gamePin, nickname: 'Same name' }), b.request('join-game', { gamePin: game.gamePin, nickname: 'same NAME' })]);
    expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await getDocs(collection(hostDb, 'games', game.gamePin, 'players'))).size).toBe(1);
    const winner = result[0].status === 'fulfilled' ? a : b; await winner.request('leave-game');
    expect((await getDoc(doc(hostDb, 'games', game.gamePin))).data()?.playerCount).toBe(0);
    await join(game, 'Same name', 2);
  });
  it('keeps answer keys private and blocks score tampering and changed answers', async () => {
    const game = await room(), alice = await join(game, 'Rule check');
    const publicGame = (await getDoc(doc(alice.db, 'games', game.gamePin))).data();
    expect(publicGame?.quiz.questions[0]).not.toHaveProperty('correct_index');
    await expect(getDoc(doc(alice.db, 'games', game.gamePin, 'private', 'quiz'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(doc(alice.db, 'games', game.gamePin, 'players', alice.seat), { score: 99999 })).rejects.toMatchObject({ code: 'permission-denied' });
    await start(game); await alice.player.request('answer-submitted', { questionId: 1, answerIndex: 0 });
    await expect(updateDoc(doc(alice.db, 'games', game.gamePin, 'players', alice.seat), { answerIndex: 1 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('waits for typed answers to be judged and awards points once', async () => {
    const game = await room([question(2, 'open_ended')]), alice = await join(game, 'Typed answer');
    await start(game); await alice.player.request('answer-submitted', { questionId: 2, answerIndex: -1, responseText: 'Mars' });
    await eventually(() => game.hs.game?.phase, 'review');
    expect((await getDoc(doc(hostDb, 'games', game.gamePin, 'players', alice.seat))).data()?.score).toBe(0);
    await game.host.request('host-judge', { playerId: alice.seat, questionIndex: 0, points: 1000 });
    await game.host.request('host-judge', { playerId: alice.seat, questionIndex: 0, points: 1000 });
    await eventually(() => game.hs.game?.phase, 'results');
    expect((await getDoc(doc(hostDb, 'games', game.gamePin, 'players', alice.seat))).data()).toMatchObject({ score: 1000, correct: 1 });
  });
  it('rejects invalid PINs and late joins with actionable errors', async () => {
    const player = transport(clients[0].db, () => Promise.resolve(clients[0].auth.currentUser));
    await expect(player.request('join-game', { gamePin: '1', nickname: 'Player' })).rejects.toThrow('six-digit');
    await expect(player.request('join-game', { gamePin: '000000', nickname: 'Player' })).rejects.toThrow('No game');
    const game = await room(); await join(game, 'First'); await start(game);
    await expect(player.request('join-game', { gamePin: game.gamePin, nickname: 'Late' })).rejects.toThrow('already started');
  });
  it('advances one round at a time and does not reuse a previous answer after the deadline', async () => {
    const game = await room([question(1), question(2)]), alice = await join(game, 'Two rounds');
    await start(game);
    await alice.player.request('answer-submitted', { questionId: 1, answerIndex: 0 });
    await eventually(() => game.hs.game?.phase, 'results');
    await game.host.request('host-next-question', { questionIndex: 0 });
    await game.host.request('host-next-question', { questionIndex: 0 });
    await eventually(() => game.hs.game?.currentQuestion, 1);
    await updateDoc(doc(hostDb, 'games', game.gamePin), { questionStartsAt: Date.now() - 5000, questionEndsAt: Date.now() - 1 });
    await eventually(() => game.hs.game?.phase, 'results');
    const player = (await getDoc(doc(hostDb, 'games', game.gamePin, 'players', alice.seat))).data();
    expect(player?.score).toBe(1000);
    expect(player?.history).toHaveLength(2);
    expect(player?.history[1]).toMatchObject({ answered: false, correct: false, points: 0 });
    await game.host.request('host-next-question', { questionIndex: 1 });
    await eventually(() => game.hs.game?.status, 'finished');
  }, 30000);
  it('recovers the same seat by nickname after the game has started', async () => {
    const game = await room(), alice = await join(game, 'Returning player');
    await start(game);
    alice.player.disconnect();
    const recovered = await join(game, 'Returning player');
    expect(recovered.seat).toBe(alice.seat);
    expect((await getDoc(doc(hostDb, 'games', game.gamePin))).data()?.playerCount).toBe(1);
  });
});
