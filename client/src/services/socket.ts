import { signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, waitForAuth } from './firebase';

type Handler = (...args: any[]) => void;
type GameData = Record<string, any>;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class FirebaseGameSocket {
  connected = false;
  private listeners = new Map<string, Set<Handler>>();
  private unsubs: Unsubscribe[] = [];
  private gamePin = '';
  private sessionId = '';
  private role: 'host' | 'player' | null = null;
  private lastGame: GameData | null = null;
  private previousPlayers = new Map<string, GameData>();
  private previousMessageIds = new Set<string>();
  private timer: number | null = null;
  private finalizing = false;

  connect() {
    if (this.connected) return;
    this.connected = true;
    queueMicrotask(() => this.dispatch('connect'));
  }

  disconnect() {
    this.connected = false;
    this.stopSubscriptions();
    this.dispatch('disconnect');
  }

  on(event: string, handler: Handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    if (event === 'connect' && this.connected) queueMicrotask(() => handler());
    if (this.lastGame) {
      if (event === 'host-question-start' && this.role === 'host' && this.lastGame.phase === 'question') queueMicrotask(() => handler(this.questionPayload(this.lastGame!)));
      if (event === 'player-question-start' && this.role === 'player' && this.lastGame.phase === 'question') queueMicrotask(() => handler(this.questionPayload(this.lastGame!)));
      if (event === 'question-ended' && this.lastGame.phase === 'results') queueMicrotask(() => handler({ correctIndex: this.lastGame!.correctIndex, stats: this.lastGame!.stats || [], leaderboard: this.lastGame!.leaderboard || [] }));
      if (event === 'game-ended' && this.lastGame.status === 'finished') queueMicrotask(() => handler({ finalRankings: this.lastGame!.finalRankings || [] }));
      if (event === 'team-updated') queueMicrotask(() => handler({ teams: this.lastGame!.teams || [] }));
    }
    if (event === 'player-list' && this.previousPlayers.size) queueMicrotask(() => handler({ players: [...this.previousPlayers.values()].map(player => player.nickname) }));
    if (event === 'update-player-list' && this.previousPlayers.size) queueMicrotask(() => handler([...this.previousPlayers.values()].map(player => ({ playerId: player.playerId, nickname: player.nickname, teamId: player.teamId || undefined, character: player.character }))));
    return this;
  }

  off(event: string, handler?: Handler) {
    if (handler) this.listeners.get(event)?.delete(handler);
    else this.listeners.delete(event);
    return this;
  }

  emit(event: string, data: any = {}) {
    void this.handle(event, data).catch(error => {
      this.dispatch(event === 'join-game' ? 'join-error' : 'error', { message: error?.message || 'Something went wrong.' });
    });
    return this;
  }

  private dispatch(event: string, data?: any) {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }

  private stopSubscriptions() {
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  private async ensureIdentity() {
    let user = await waitForAuth();
    if (!user) user = (await signInAnonymously(auth)).user;
    return user;
  }

  private async handle(event: string, data: any) {
    switch (event) {
      case 'host-register': return this.registerHost(data.gamePin);
      case 'join-game': return this.joinGame(data);
      case 'reconnect-player': return this.reconnectPlayer(data);
      case 'host-start-game': return this.startGame();
      case 'host-next-question': return this.nextQuestion();
      case 'host-end-game': return this.endGame();
      case 'answer-submitted': return this.submitAnswer(data);
      case 'create-team': return this.createTeam(data);
      case 'join-team': return this.joinTeam(data.teamId);
      case 'kick-player': return this.kickPlayer(data.playerId);
      case 'host-judge': return this.judgeAnswer(data.playerId, data.points);
      case 'chat-message': return this.sendMessage(data.message, 'chat');
      case 'send-reaction': return this.sendMessage(data.reaction, 'reaction');
      case 'buy-powerup': return this.dispatch('error', { message: 'Power-ups unlock after you score 500 points.' });
      case 'use-powerup': return;
    }
  }

  private async registerHost(pin: string) {
    const user = await this.ensureIdentity();
    const game = await getDoc(doc(db, 'games', pin));
    if (!game.exists() || game.data().hostUid !== user.uid) throw new Error('This game is not available to this host.');
    this.gamePin = pin;
    this.role = 'host';
    this.subscribe();
  }

  private async joinGame(data: { gamePin: string; nickname: string; teamId?: number; character?: string }) {
    const user = await this.ensureIdentity();
    const gameRef = doc(db, 'games', data.gamePin);
    const game = await getDoc(gameRef);
    if (!game.exists() || game.data().status !== 'lobby') throw new Error('Game not found or already started.');
    const nickname = data.nickname.trim().slice(0, 20);
    if (!nickname) throw new Error('Choose a nickname.');
    const currentPlayers = await getDocs(collection(db, 'games', data.gamePin, 'players'));
    if (currentPlayers.size >= 100) throw new Error('This lobby is full.');
    if (currentPlayers.docs.some(item => item.data().nickname.toLowerCase() === nickname.toLowerCase())) throw new Error('That nickname is already taken.');

    this.gamePin = data.gamePin;
    this.sessionId = makeId();
    this.role = 'player';
    await setDoc(doc(db, 'games', this.gamePin, 'players', this.sessionId), {
      playerId: this.sessionId,
      sessionId: this.sessionId,
      authUid: user.uid,
      nickname,
      character: data.character || '✨',
      teamId: data.teamId || null,
      score: 0,
      streak: 0,
      correct: 0,
      hasAnswered: false,
      answeredQuestion: null,
      joinedAt: new Date().toISOString(),
    });
    this.subscribe();
    this.dispatch('answer-confirmed', { accepted: true, playerId: this.sessionId, sessionId: this.sessionId });
  }

  private async reconnectPlayer(data: { sessionId: string; nickname: string; gamePin?: string }) {
    const pin = data.gamePin || localStorage.getItem('animplay_player_gamePin') || '';
    const user = await this.ensureIdentity();
    const playerRef = doc(db, 'games', pin, 'players', data.sessionId);
    const [game, player] = await Promise.all([getDoc(doc(db, 'games', pin)), getDoc(playerRef)]);
    if (!game.exists() || !player.exists() || player.data().authUid !== user.uid) throw new Error('Unable to reconnect. Please join again.');
    this.gamePin = pin;
    this.sessionId = data.sessionId;
    this.role = 'player';
    await updateDoc(playerRef, { nickname: data.nickname.trim().slice(0, 20), lastSeenAt: new Date().toISOString() });
    this.subscribe();
    this.dispatch('answer-confirmed', { accepted: true, playerId: this.sessionId, sessionId: this.sessionId });
    this.dispatch('player-reconnected', { playerId: this.sessionId });
  }

  private subscribe() {
    this.stopSubscriptions();
    this.previousPlayers.clear();
    this.previousMessageIds.clear();
    const gameRef = doc(db, 'games', this.gamePin);
    this.unsubs.push(onSnapshot(gameRef, snapshot => {
      if (!snapshot.exists()) {
        this.dispatch('host-disconnected');
        return;
      }
      const next = snapshot.data();
      const previous = this.lastGame;
      this.lastGame = next;
      this.dispatch('team-updated', { teams: next.teams || [] });
      this.handleGameChange(previous, next);
    }));

    this.unsubs.push(onSnapshot(collection(db, 'games', this.gamePin, 'players'), snapshot => {
      const players = new Map(snapshot.docs.map(item => [item.id, item.data()]));
      const list = [...players.values()].map(player => ({ playerId: player.playerId, nickname: player.nickname, teamId: player.teamId || undefined, character: player.character }));
      this.dispatch('update-player-list', list);
      this.dispatch('player-list', { players: list.map(player => player.nickname) });
      snapshot.docChanges().forEach(change => {
        const player = change.doc.data();
        if (change.type === 'added' && !this.previousPlayers.has(change.doc.id)) this.dispatch('player-joined', { ...player, playerCount: players.size });
        if (change.type === 'removed') this.dispatch('player-left', { ...player, playerCount: players.size });
      });
      this.previousPlayers = players;
      if (this.role === 'host' && this.lastGame?.phase === 'question') {
        const answeredCount = [...players.values()].filter(player => player.answeredQuestion === this.lastGame?.currentQuestion).length;
        this.dispatch('answer-received', { answeredCount, totalCount: players.size });
        const currentQuestion = this.lastGame.quiz.questions[this.lastGame.currentQuestion];
        if (currentQuestion?.questionType === 'open_ended') {
          this.dispatch('pending-answers', {
            answers: [...players.values()].filter(player => player.answeredQuestion === this.lastGame?.currentQuestion && player.judgedQuestion !== this.lastGame?.currentQuestion).map(player => ({ playerId: player.playerId, nickname: player.nickname, answerIndex: player.answerIndex || 0, responseText: player.responseText || '' })),
          });
        } else if (players.size > 0 && answeredCount === players.size) {
          void this.finalizeQuestion();
        }
      }
    }));

    this.unsubs.push(onSnapshot(collection(db, 'games', this.gamePin, 'messages'), snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added' || this.previousMessageIds.has(change.doc.id)) return;
        const message = change.doc.data();
        if (message.type === 'reaction') this.dispatch('reaction-received', { playerId: message.playerId, reaction: message.message });
        else this.dispatch('chat-received', message);
        this.previousMessageIds.add(change.doc.id);
      });
    }));
  }

  private handleGameChange(previous: GameData | null, next: GameData) {
    if (next.status === 'active' && previous?.status !== 'active') this.dispatch('game-started', { totalQuestions: next.quiz.questions.length });
    if (next.phase === 'question' && (previous?.phase !== 'question' || previous?.currentQuestion !== next.currentQuestion)) {
      const payload = this.questionPayload(next);
      this.dispatch(this.role === 'host' ? 'host-question-start' : 'player-question-start', payload);
      if (this.role === 'host') this.startTimer(next);
    }
    if (next.phase === 'results' && previous?.phase !== 'results') {
      this.dispatch('question-ended', { correctIndex: next.correctIndex, stats: next.stats || [], leaderboard: next.leaderboard || [] });
    }
    if (next.status === 'finished' && previous?.status !== 'finished') this.dispatch('game-ended', { finalRankings: next.finalRankings || [] });
  }

  private questionPayload(game: GameData) {
    const question = game.quiz.questions[game.currentQuestion];
    return {
      questionId: question.id,
      questionText: question.question_text,
      answers: question.answers || [],
      answerCount: question.answers?.length || 0,
      timer: question.timer_seconds,
      startsAt: game.questionStartsAt,
      questionIndex: game.currentQuestion,
      totalQuestions: game.quiz.questions.length,
      questionType: question.questionType || 'multiple_choice',
    };
  }

  private startTimer(game: GameData) {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      const timeLeft = Math.max(0, Math.ceil((game.questionEndsAt - Date.now()) / 1000));
      this.dispatch('timer-tick', { timeLeft });
      if (timeLeft <= 0) {
        if (this.timer) window.clearInterval(this.timer);
        this.timer = null;
        void this.finalizeQuestion();
      }
    }, 250);
  }

  private async startGame() {
    if (this.role !== 'host' || !this.lastGame) return;
    await this.launchQuestion(0, true);
  }

  private async launchQuestion(index: number, first = false) {
    if (!this.lastGame) return;
    const question = this.lastGame.quiz.questions[index];
    if (!question) return this.endGame();
    const players = await getDocs(collection(db, 'games', this.gamePin, 'players'));
    const batch = writeBatch(db);
    players.docs.forEach(player => batch.update(player.ref, { hasAnswered: false, answeredQuestion: null, answerIndex: null, responseText: '', responseTimeMs: null, judgedQuestion: null }));
    const startsAt = Date.now() + 1200;
    batch.update(doc(db, 'games', this.gamePin), {
      status: 'active', phase: 'question', currentQuestion: index,
      startedAt: first ? new Date().toISOString() : this.lastGame.startedAt,
      questionStartsAt: startsAt, questionEndsAt: startsAt + question.timer_seconds * 1000,
      correctIndex: null, stats: [], leaderboard: [],
    });
    await batch.commit();
  }

  private async submitAnswer(data: { questionId: number; answerIndex: number; responseTimeMs: number; responseText?: string }) {
    if (this.role !== 'player' || !this.lastGame || this.lastGame.phase !== 'question') return;
    const question = this.lastGame.quiz.questions[this.lastGame.currentQuestion];
    if (!question || question.id !== data.questionId || Date.now() > this.lastGame.questionEndsAt + 500) return;
    const ref = doc(db, 'games', this.gamePin, 'players', this.sessionId);
    const player = await getDoc(ref);
    if (!player.exists() || player.data().answeredQuestion === this.lastGame.currentQuestion) return;
    await updateDoc(ref, {
      hasAnswered: true,
      answeredQuestion: this.lastGame.currentQuestion,
      answerIndex: data.answerIndex,
      responseText: String(data.responseText || '').trim().slice(0, 180),
      responseTimeMs: Math.max(0, Number(data.responseTimeMs) || 0),
    });
    this.dispatch('answer-confirmed', { accepted: true, playerId: this.sessionId });
  }

  private leaderboard(players: GameData[]) {
    const teams = new Map((this.lastGame?.teams || []).map((team: GameData) => [team.id, team.name]));
    return players.sort((a, b) => b.score - a.score).map((player, index) => ({
      rank: index + 1, playerId: player.playerId, nickname: player.nickname, character: player.character,
      score: player.score || 0, correct: player.correct || 0, streak: player.streak || 0,
      teamId: player.teamId || undefined, teamName: teams.get(player.teamId) || undefined,
    }));
  }

  private async finalizeQuestion() {
    if (this.role !== 'host' || !this.lastGame || this.lastGame.phase !== 'question' || this.finalizing) return;
    this.finalizing = true;
    try {
      const gameSnap = await getDoc(doc(db, 'games', this.gamePin));
      if (!gameSnap.exists() || gameSnap.data().phase !== 'question') return;
      const game = gameSnap.data();
      const question = game.quiz.questions[game.currentQuestion];
      const playerSnaps = await getDocs(collection(db, 'games', this.gamePin, 'players'));
      const stats = (question.answers || []).map((_: any, answerIndex: number) => ({ answerIndex, count: 0 }));
      const batch = writeBatch(db);
      const nextPlayers = playerSnaps.docs.map(item => {
        const player = item.data();
        const answered = player.answeredQuestion === game.currentQuestion;
        if (answered && stats[player.answerIndex]) stats[player.answerIndex].count += 1;
        const correct = answered && question.questionType !== 'open_ended' && player.answerIndex === question.correct_index;
        const nextStreak = correct ? (player.streak || 0) + 1 : 0;
        const speed = Math.max(0.5, 1 - (player.responseTimeMs || 0) / (question.timer_seconds * 2000));
        const earned = correct ? Math.round((question.points || 1000) * speed + Math.min(nextStreak * 50, 500)) : 0;
        const next = { ...player, score: (player.score || 0) + earned, correct: (player.correct || 0) + (correct ? 1 : 0), streak: nextStreak, pointsEarned: earned };
        batch.update(item.ref, { score: next.score, correct: next.correct, streak: next.streak, pointsEarned: earned });
        return next;
      });
      const leaderboard = this.leaderboard(nextPlayers);
      batch.update(doc(db, 'games', this.gamePin), { phase: 'results', correctIndex: question.correct_index || 0, stats, leaderboard });
      await batch.commit();
    } finally {
      this.finalizing = false;
    }
  }

  private async nextQuestion() {
    if (this.role !== 'host' || !this.lastGame) return;
    const nextIndex = this.lastGame.currentQuestion + 1;
    if (nextIndex >= this.lastGame.quiz.questions.length) return this.endGame();
    await this.launchQuestion(nextIndex);
  }

  private async endGame() {
    if (this.role !== 'host') return;
    const players = await getDocs(collection(db, 'games', this.gamePin, 'players'));
    const finalRankings = this.leaderboard(players.docs.map(item => item.data()));
    await updateDoc(doc(db, 'games', this.gamePin), { status: 'finished', phase: 'finished', endedAt: new Date().toISOString(), finalRankings });
  }

  private async createTeam(data: { name: string; color: string }) {
    if (this.role !== 'host' || !this.lastGame) return;
    const team = { id: Date.now(), gameId: this.lastGame.id, name: data.name.trim().slice(0, 24), color: data.color, score: 0 };
    await updateDoc(doc(db, 'games', this.gamePin), { teams: [...(this.lastGame.teams || []), team] });
    this.dispatch('team-created', { teamId: team.id, name: team.name, color: team.color });
  }

  private async joinTeam(teamId: number) {
    if (this.role !== 'player') return;
    await updateDoc(doc(db, 'games', this.gamePin, 'players', this.sessionId), { teamId });
  }

  private async kickPlayer(playerId: string) {
    if (this.role !== 'host') return;
    await deleteDoc(doc(db, 'games', this.gamePin, 'players', playerId));
  }

  private async judgeAnswer(playerId: string, points: number) {
    if (this.role !== 'host') return;
    const ref = doc(db, 'games', this.gamePin, 'players', playerId);
    const player = await getDoc(ref);
    if (!player.exists()) return;
    await updateDoc(ref, { score: (player.data().score || 0) + points, correct: (player.data().correct || 0) + (points > 0 ? 1 : 0), judgedQuestion: this.lastGame?.currentQuestion ?? null });
    this.dispatch('answer-confirmed', { accepted: true, playerId });
  }

  private async sendMessage(message: string, type: 'chat' | 'reaction') {
    if (!this.gamePin) return;
    const user = await this.ensureIdentity();
    let nickname = 'Host';
    let playerId = user.uid;
    if (this.role === 'player') {
      const player = await getDoc(doc(db, 'games', this.gamePin, 'players', this.sessionId));
      if (!player.exists()) return;
      nickname = player.data().nickname;
      playerId = this.sessionId;
    }
    const clean = String(message).trim().slice(0, type === 'chat' ? 200 : 8);
    if (!clean) return;
    const id = makeId();
    await setDoc(doc(db, 'games', this.gamePin, 'messages', id), { id, authUid: user.uid, playerId, nickname, message: clean, type, createdAt: new Date().toISOString() });
  }
}

let socket: FirebaseGameSocket | null = null;

export function getSocket(): FirebaseGameSocket {
  if (!socket) socket = new FirebaseGameSocket();
  return socket;
}

export function connectSocket(): FirebaseGameSocket {
  const instance = getSocket();
  instance.connect();
  return instance;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
