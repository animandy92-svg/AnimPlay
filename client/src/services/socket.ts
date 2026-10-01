import { signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { auth, db, waitForAuth } from './firebase';
import { rankPlayers, scoreAnswer, settingsFor, type GameRecord } from './gameLogic';

type Handler = (data?: any) => void;
export const gameStorage = sessionStorage;
export function gameError(error: any): string {
  if (error?.code === 'permission-denied') return 'This session is no longer available to you. Rejoin with the game PIN, or sign in as the host.';
  if (error?.code === 'unavailable' || !navigator.onLine) return 'Your connection was interrupted. Reconnect to the internet and try again.';
  if (error?.code?.startsWith('auth/')) return 'Sign-in could not connect. Please try again in a moment.';
  return error?.message || 'That action could not be completed. Please try again.';
}

// Each tab has its own seat; snapshots restore the entire UI after navigation or refresh.
export class FirebaseGameSocket {
  constructor(private database = db, private getIdentity?: () => Promise<{ uid: string }>) {}
  connected = false;
  private listeners = new Map<string, Set<Handler>>();
  private unsubs: Unsubscribe[] = [];
  private pin = '';
  private seat = '';
  private role: 'host' | 'player' | null = null;
  private game: GameRecord | null = null;
  private quiz: GameRecord | null = null;
  private players: GameRecord[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private heartbeat = 0;
  private closing = false;
  private connecting: Promise<void> | null = null;
  private commands = new Set<string>();
  private generation = 0;

  connect() { this.connected = true; this.dispatch('connect'); return this; }
  disconnect() { this.stop(); this.connected = false; this.game = null; this.players = []; this.role = null; this.dispatch('disconnect'); }
  on(event: string, handler: Handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    queueMicrotask(() => {
      if (!this.listeners.get(event)?.has(handler)) return;
      if (event === 'connect' && this.connected) handler();
      if (event === 'game-state' && this.game) handler(this.game);
      if (event === 'update-player-list') handler(this.players);
      if (event === 'player-state') handler(this.players.find(p => p.playerId === this.seat) || null);
    });
    return this;
  }
  off(event: string, handler?: Handler) { if (handler) this.listeners.get(event)?.delete(handler); else this.listeners.delete(event); return this; }
  emit(event: string, data: any = {}) { void this.request(event, data).catch(error => this.dispatch('error', { message: gameError(error) })); return this; }
  async request(event: string, data: any = {}): Promise<any> {
    if (!navigator.onLine) throw new Error('You are offline. Reconnect before continuing.');
    if (['host-register', 'reconnect-player'].includes(event)) {
      if (this.connecting) await this.connecting;
      this.connecting = this.restore(event === 'host-register' ? 'host' : 'player', data);
      try { return await this.connecting; } finally { this.connecting = null; }
    }
    if (this.commands.has(event)) return;
    this.commands.add(event);
    try {
      switch (event) {
        case 'join-game': return await this.join(data);
        case 'host-start-game': return await this.launch(-1);
        case 'host-next-question': return await this.launch(data.questionIndex);
        case 'host-end-question': return await this.closeQuestion();
        case 'host-end-game': return await this.end();
        case 'answer-submitted': return await this.answer(data);
        case 'host-judge': return await this.judge(data);
        case 'game-settings': return await this.lobbyChange(game => ({ settings: settingsFor(data) }));
        case 'create-team': return await this.lobbyChange(game => {
          const name = String(data.name).trim().slice(0, 24), teams = game.teams || [];
          if (!name) throw new Error('Enter a team name.');
          if (teams.length >= 8) throw new Error('You can create up to eight teams.');
          if (teams.some((t: GameRecord) => t.name.toLowerCase() === name.toLowerCase())) throw new Error('That team name is already in use.');
          return { teams: [...teams, { id: Date.now(), name, color: data.color || '#6d28d9' }] };
        });
        case 'join-team': return await this.joinTeam(data.teamId);
        case 'kick-player': return await this.remove(data.playerId);
        case 'leave-game': await this.remove(this.seat); this.disconnect(); return;
      }
    } finally { this.commands.delete(event); }
  }
  private dispatch(event: string, data?: any) { this.listeners.get(event)?.forEach(handler => handler(data)); }
  private stop() { this.generation++; this.unsubs.forEach(unsub => unsub()); this.unsubs = []; if (this.timer) clearInterval(this.timer); this.timer = null; }
  private async identity() { return this.getIdentity ? this.getIdentity() : auth.currentUser || await waitForAuth() || (await signInAnonymously(auth)).user; }
  private async restore(role: 'host' | 'player', data: GameRecord) {
    if (this.role === role && this.pin === data.gamePin && (role === 'host' || this.seat === data.sessionId) && this.unsubs.length) return;
    const user = await this.identity(), game = await getDoc(doc(this.database, 'games', data.gamePin));
    if (!game.exists()) throw new Error('This game is no longer available. Start or join another game.');
    if (role === 'host') {
      if (game.data().hostUid !== user.uid) throw new Error('Sign in with the account that started this game.');
      const secret = game.data().version === 2 ? await getDoc(doc(this.database, 'games', data.gamePin, 'private', 'quiz')) : null;
      this.quiz = secret?.exists() ? secret.data() : game.data().quiz;
      if (!this.quiz?.questions?.length) throw new Error('The quiz could not be loaded. Start a new game from your library.');
    } else {
      const player = await getDoc(doc(this.database, 'games', data.gamePin, 'players', data.sessionId));
      if (!player.exists() || player.data().authUid !== user.uid) throw new Error('Your saved seat is no longer available. Join again with the game PIN.');
      gameStorage.setItem('animplay_nickname', player.data().nickname); this.quiz = null;
    }
    this.pin = data.gamePin; this.seat = role === 'player' ? data.sessionId : ''; this.role = role; this.heartbeat = 0; this.subscribe();
  }
  private async join(data: GameRecord) {
    const nickname = String(data.nickname).trim().replace(/\s+/g, ' ');
    if (!/^\d{6}$/.test(data.gamePin)) throw new Error('Enter the six-digit game PIN.');
    if (!nickname || nickname.length > 20) throw new Error('Choose a nickname between 1 and 20 characters.');
    const user = await this.identity(), seat = crypto.randomUUID(), nameKey = encodeURIComponent(nickname.toLowerCase());
    const gameRef = doc(this.database, 'games', data.gamePin), nameRef = doc(this.database, 'games', data.gamePin, 'names', nameKey);
    const joinedSeat = await runTransaction(this.database, async tx => {
      const [game, name] = await Promise.all([tx.get(gameRef), tx.get(nameRef)]);
      if (!game.exists()) throw new Error('No game has that PIN. Check the six digits with your host.');
      if (name.exists() && name.data().authUid === user.uid) {
        const saved = await tx.get(doc(this.database, 'games', data.gamePin, 'players', name.data().playerId));
        if (saved.exists()) return name.data().playerId as string;
      }
      if (game.data().status !== 'lobby') throw new Error('This game has already started or ended. Ask the host for the next game PIN.');
      if (name.exists()) throw new Error('That nickname is taken. Add a name or number to make yours unique.');
      if ((game.data().playerCount || 0) >= 100) throw new Error('This game has reached its 100-player limit.');
      tx.set(doc(this.database, 'games', data.gamePin, 'players', seat), { playerId: seat, sessionId: seat, nameKey, authUid: user.uid, nickname, character: data.character || '✨', teamId: null, score: 0, streak: 0, correct: 0, answeredQuestion: null, answerIndex: null, responseText: '', responseTimeMs: 0, judgedQuestion: null, awardedPoints: 0, judgedCorrect: false, history: [], joinedAt: serverTimestamp() });
      tx.set(nameRef, { playerId: seat, authUid: user.uid });
      tx.update(gameRef, { playerCount: (game.data().playerCount || 0) + 1, lastJoinedPlayer: seat });
      return seat;
    });
    gameStorage.setItem('animplay_player_gamePin', data.gamePin); gameStorage.setItem('animplay_player_sessionId', joinedSeat); gameStorage.setItem('animplay_nickname', nickname);
    this.pin = data.gamePin; this.seat = joinedSeat; this.role = 'player'; this.quiz = null; this.subscribe();
  }
  private subscribe() {
    this.stop(); this.game = null; this.players = []; const generation = this.generation;
    const failed = (error: any) => { if (generation === this.generation) { this.dispatch('error', { message: gameError(error) }); this.stop(); } };
    this.unsubs.push(onSnapshot(doc(this.database, 'games', this.pin), snapshot => {
      if (generation !== this.generation) return;
      if (!snapshot.exists()) { this.dispatch('error', { message: 'This game is no longer available.' }); return; }
      this.game = { ...snapshot.data(), gamePin: snapshot.id }; this.dispatch('game-state', this.game);
    }, failed));
    this.unsubs.push(onSnapshot(collection(this.database, 'games', this.pin, 'players'), snapshot => {
      if (generation !== this.generation) return;
      this.players = snapshot.docs.map(item => ({ ...item.data(), playerId: item.id })); this.dispatch('update-player-list', this.players);
      const mine = this.players.find(p => p.playerId === this.seat); this.dispatch('player-state', mine || null);
      if (this.role === 'player' && !mine) this.dispatch('removed', { message: 'Your seat was removed by the host. You can join another game.' });
    }, failed));
    this.timer = setInterval(() => {
      if (this.role !== 'host' || !this.game || this.game.status === 'finished' || !navigator.onLine) return;
      if (Date.now() - this.heartbeat > 10000) {
        this.heartbeat = Date.now();
        void runTransaction(this.database, async tx => { const ref = doc(this.database, 'games', this.pin), snap = await tx.get(ref); if (snap.exists() && snap.data().status !== 'finished') tx.update(ref, { hostSeenAt: Date.now() }); }).catch(failed);
      }
      const game = this.game;
      if (game.phase === 'question' && (game.questionEndsAt !== null && Date.now() >= game.questionEndsAt || this.players.length > 0 && this.players.every(p => p.answeredQuestion === game.currentQuestion)) || game.phase === 'review' && this.players.every(p => p.answeredQuestion !== game.currentQuestion || p.judgedQuestion === game.currentQuestion)) {
        void this.closeQuestion().catch(error => this.dispatch('error', { message: gameError(error) }));
      }
    }, 500);
  }
  private hostOnly() { if (this.role !== 'host') throw new Error('Only the host can do that.'); }
  private async launch(expectedIndex: number) {
    this.hostOnly();
    const players = await getDocs(collection(this.database, 'games', this.pin, 'players'));
    if (!players.size) throw new Error('Wait for at least one player before starting.');
    await runTransaction(this.database, async tx => {
      const ref = doc(this.database, 'games', this.pin), snap = await tx.get(ref); if (!snap.exists()) throw new Error('Game not found.');
      const game = snap.data();
      if (game.currentQuestion !== expectedIndex || !['lobby', 'results'].includes(game.phase)) return;
      if (game.phase === 'lobby' && !game.playerCount) throw new Error('Wait for at least one player before starting.');
      const next = expectedIndex + 1;
      if (next >= game.quiz.questions.length) { tx.update(ref, { status: 'finished', phase: 'finished', endedAt: new Date().toISOString(), finalRankings: game.leaderboard || [] }); return; }
      const settings = settingsFor(game.settings), startsAt = Date.now() + 2000, duration = game.quiz.questions[next].timer_seconds * settings.timeMultiplier * 1000;
      tx.update(ref, { status: 'active', phase: 'question', currentQuestion: next, startedAt: game.startedAt || new Date().toISOString(), questionStartsAt: startsAt, questionEndsAt: settings.playStyle === 'relaxed' ? null : startsAt + duration, durationMs: duration, correctIndex: null, explanation: '', hostSeenAt: Date.now() });
    });
  }
  private async answer(data: GameRecord) {
    if (this.role !== 'player') throw new Error('Join a game before answering.');
    await runTransaction(this.database, async tx => {
      const gameRef = doc(this.database, 'games', this.pin), playerRef = doc(this.database, 'games', this.pin, 'players', this.seat);
      const [gs, ps] = await Promise.all([tx.get(gameRef), tx.get(playerRef)]);
      if (!gs.exists() || !ps.exists()) throw new Error('Your session ended. Return to the join page.');
      const game = gs.data(), player = ps.data(), question = game.quiz.questions[game.currentQuestion];
      if (player.answeredQuestion === game.currentQuestion) return;
      if (game.phase !== 'question' || question?.id !== data.questionId || Date.now() < game.questionStartsAt || game.questionEndsAt !== null && Date.now() > game.questionEndsAt) throw new Error('This round has closed. Your next question will appear shortly.');
      const responseText = String(data.responseText || '').trim().slice(0, 180);
      if (question.questionType === 'open_ended' ? !responseText : !Number.isInteger(data.answerIndex) || !question.answers[data.answerIndex]) throw new Error('Choose an answer before submitting.');
      tx.update(playerRef, { answeredQuestion: game.currentQuestion, answerIndex: data.answerIndex, responseText, responseTimeMs: Math.max(0, Date.now() - game.questionStartsAt), submittedAt: serverTimestamp() });
    });
  }
  private async closeQuestion() {
    this.hostOnly(); if (this.closing || !this.game || !['question', 'review'].includes(this.game.phase)) return;
    this.closing = true; const index = this.game.currentQuestion;
    try {
      const snaps = await getDocs(collection(this.database, 'games', this.pin, 'players'));
      await runTransaction(this.database, async tx => {
        const ref = doc(this.database, 'games', this.pin), gs = await tx.get(ref); if (!gs.exists()) return;
        const game = gs.data(); if (!['question', 'review'].includes(game.phase) || game.currentQuestion !== index) return;
        const all = await Promise.all(snaps.docs.map(p => tx.get(p.ref))), present = all.filter(p => p.exists());
        const question = this.quiz!.questions[index], open = question.questionType === 'open_ended';
        if (open && present.some(p => p.data()!.answeredQuestion === index && p.data()!.judgedQuestion !== index)) { if (game.phase !== 'review') tx.update(ref, { phase: 'review' }); return; }
        const settings = settingsFor(game.settings), distribution = (question.answers || []).map((a: GameRecord, answerIndex: number) => ({ answerIndex, text: a.text, count: 0 }));
        let answeredCount = 0, correctCount = 0, responseTotal = 0;
        const correctAnswer = open ? 'Host reviewed' : question.answers[question.correct_index]?.text || '';
        const nextPlayers = present.map(item => {
          const player = item.data()!;
          if (player.answeredQuestion === index && player.submittedAt?.toMillis) player.responseTimeMs = Math.max(0, player.submittedAt.toMillis() - game.questionStartsAt);
          const result = scoreAnswer(question, player, index, settings, game.durationMs);
          if (result.answered) { answeredCount++; responseTotal += player.responseTimeMs || 0; if (distribution[player.answerIndex]) distribution[player.answerIndex].count++; }
          if (result.correct) correctCount++;
          const history = [...(player.history || []), { questionIndex: index, questionId: question.id, questionText: question.question_text, answered: result.answered, correct: result.correct, points: result.points, responseTimeMs: result.answered ? player.responseTimeMs || 0 : null, answer: result.answered ? open ? player.responseText : question.answers[player.answerIndex]?.text || '' : '', correctAnswer, explanation: question.explanation || '' }];
          const next = { ...player, score: (player.score || 0) + result.points, correct: (player.correct || 0) + Number(result.correct), streak: result.streak, history };
          tx.update(item.ref, { score: next.score, correct: next.correct, streak: next.streak, history }); return next;
        });
        const report = { questionIndex: index, questionText: question.question_text, questionType: question.questionType, correctAnswer, explanation: question.explanation || '', answeredCount, correctCount, playerCount: present.length, averageResponseMs: answeredCount ? Math.round(responseTotal / answeredCount) : 0, distribution };
        tx.update(ref, { phase: 'results', correctIndex: open ? null : question.correct_index, explanation: question.explanation || '', leaderboard: rankPlayers(nextPlayers, game.teams), questionReports: [...(game.questionReports || []), report] });
      });
    } finally { this.closing = false; }
  }
  private async judge(data: GameRecord) {
    this.hostOnly(); await runTransaction(this.database, async tx => {
      const ref = doc(this.database, 'games', this.pin, 'players', data.playerId), [gs, ps] = await Promise.all([tx.get(doc(this.database, 'games', this.pin)), tx.get(ref)]);
      if (!gs.exists() || !ps.exists()) return;
      const game = gs.data(), player = ps.data();
      if (!['question', 'review'].includes(game.phase) || game.currentQuestion !== data.questionIndex || player.answeredQuestion !== data.questionIndex || player.judgedQuestion === data.questionIndex) return;
      const q = this.quiz!.questions[data.questionIndex]; if (q.questionType !== 'open_ended') return;
      tx.update(ref, { judgedQuestion: data.questionIndex, judgedCorrect: data.correct ?? data.points > 0, awardedPoints: Math.min(q.points, Math.max(0, Number(data.points) || 0)) });
    });
  }
  private async end() {
    this.hostOnly(); if (['question', 'review'].includes(this.game?.phase)) await this.closeQuestion();
    const players = await getDocs(collection(this.database, 'games', this.pin, 'players'));
    await runTransaction(this.database, async tx => {
      const ref = doc(this.database, 'games', this.pin), snap = await tx.get(ref); if (!snap.exists() || snap.data().status === 'finished') return;
      if (['question', 'review'].includes(snap.data().phase)) throw new Error('Review all submitted answers before ending the game.');
      tx.update(ref, { status: 'finished', phase: 'finished', endedAt: new Date().toISOString(), finalRankings: rankPlayers(players.docs.map(p => p.data()), snap.data().teams) });
    });
  }
  private async lobbyChange(change: (game: GameRecord) => GameRecord) {
    this.hostOnly(); await runTransaction(this.database, async tx => { const ref = doc(this.database, 'games', this.pin), snap = await tx.get(ref); if (snap.exists() && snap.data().status === 'lobby') tx.update(ref, change(snap.data())); });
  }
  private async joinTeam(teamId: number | null) {
    if (this.role !== 'player') return;
    await runTransaction(this.database, async tx => {
      const snap = await tx.get(doc(this.database, 'games', this.pin)); if (!snap.exists() || snap.data().status !== 'lobby') throw new Error('Teams are locked once the game starts.');
      if (teamId && !snap.data().teams.some((t: GameRecord) => t.id === teamId)) throw new Error('That team is no longer available.');
      tx.update(doc(this.database, 'games', this.pin, 'players', this.seat), { teamId });
    });
  }
  private async remove(playerId: string) {
    await runTransaction(this.database, async tx => {
      const ref = doc(this.database, 'games', this.pin), playerRef = doc(this.database, 'games', this.pin, 'players', playerId), [game, player] = await Promise.all([tx.get(ref), tx.get(playerRef)]);
      if (!game.exists() || !player.exists()) return;
      if (game.data().status !== 'lobby') throw new Error('Players can leave or be removed in the lobby.');
      tx.delete(playerRef); if (player.data().nameKey) tx.delete(doc(this.database, 'games', this.pin, 'names', player.data().nameKey));
      tx.update(ref, { playerCount: Math.max(0, (game.data().playerCount || 0) - 1), lastLeftPlayer: playerId });
    });
  }
}
let socket: FirebaseGameSocket | null = null;
export function getSocket() { return socket ||= new FirebaseGameSocket(); }
export function connectSocket() { return getSocket().connect(); }
export function disconnectSocket() { socket?.disconnect(); socket = null; }
