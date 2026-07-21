import { Server as SocketServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { Game, Quiz, Question, Answer, GameResult, Team, TeamMember, PowerUp, PlayerPowerUp, ChatMessage, nextId } from '../models';
import type { GameRoom, Player, LeaderboardEntry, QuestionWithOptions, QuizDetail, Team as ITeam, PowerUp as IPowerUp, ChatMessage as IChatMessage } from '../../../shared/types';

const badWordsList = ['badword1', 'badword2', 'trollname'];

const TEAM_COLORS = ['#E21B3C', '#26890C', '#4B8BFF', '#FFA500', '#9C27B0', '#00BCD4'];

const POWER_UP_DEFS: IPowerUp[] = [
  { id: 1, name: 'double_points', description: 'Double points for next correct answer', icon: '2x', cost: 500 },
  { id: 2, name: 'remove_one', description: 'Remove one wrong answer', icon: '-1', cost: 300 },
  { id: 3, name: 'time_freeze', description: 'Pause timer for 3 seconds', icon: '⏸', cost: 400 },
]; // Extend this list

function isSafeNickname(name: string) {
  const cleanName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  return !badWordsList.some(word => cleanName.includes(word));
}

type ServerPlayer = Player & {
  disconnectTimeout?: ReturnType<typeof setTimeout>;
};

type ServerGameRoom = Omit<GameRoom, 'players'> & {
  players: Map<string, ServerPlayer>;
};

const gameRooms = new Map<string, ServerGameRoom>();
const socketToGame = new Map<string, string>();

export function getGameByPin(pin: string): ServerGameRoom | undefined {
  return gameRooms.get(pin);
}

async function createRoom(gamePin: string): Promise<ServerGameRoom | undefined> {
  const game = await Game.findOne({ gamePin, status: 'lobby' }).lean();
  if (!game) return undefined;

  const questions = await Question.find({ quizId: game.quizId }).sort({ sortOrder: 1 }).lean();
  for (const q of questions) {
    (q as any).answers = await Answer.find({ questionId: q.id }).sort({ sortIndex: 1 }).lean();
  }

  const quizData = await Quiz.findOne({ id: game.quizId }).lean();
  const quiz: QuizDetail = {
    id: game.quizId,
    hostId: game.hostId,
    title: quizData?.title || '',
    description: quizData?.description || '',
    coverImage: quizData?.coverImage || null,
    isPublic: quizData?.isPublic ?? true,
    created_at: quizData?.created_at ? quizData.created_at.toISOString() : '',
    updated_at: quizData?.updated_at ? quizData.updated_at.toISOString() : '',
    questions: questions as unknown as QuestionWithOptions[],
  };

  const room: ServerGameRoom = {
    gameId: game.id,
    gamePin,
    quizId: game.quizId,
    hostId: game.hostId,
    hostSocketId: '',
    status: 'lobby',
    currentQuestionIndex: 0,
    players: new Map<string, ServerPlayer>(),
    teams: [],
    teamMembers: [],
    powerUps: [],
    chatMessages: [],
    quiz,
    startedAt: new Date(),
  };

  gameRooms.set(gamePin, room);
  return room;
}

export function setupGameSocket(io: SocketServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-game', async (data: { gamePin: string; nickname: string; teamId?: number; character?: string }) => {
      const { gamePin, nickname, teamId, character } = data;
      const MAX_PLAYERS = 100;

      if (!isSafeNickname(nickname)) {
        return socket.emit('join-error', { message: 'Please choose an appropriate nickname!' });
      }

      const game = await Game.findOne({ gamePin, status: 'lobby' }).lean();
      if (!game) {
        socket.emit('error', { message: 'Game not found or already started' });
        return;
      }

      let room = gameRooms.get(gamePin);

      if (!room) {
        room = await createRoom(gamePin);
        if (!room) {
          socket.emit('error', { message: 'Game not found or already started' });
          return;
        }
      }

      if (room.players.size >= MAX_PLAYERS) {
        return socket.emit('join-error', { message: 'This lobby is full!' });
      }

      const sessionId = randomUUID();
      const playerId = `player_${socket.id}_${Date.now()}`;
      const player: ServerPlayer = {
        id: playerId,
        sessionId,
        nickname,
        socketId: socket.id,
        score: 0,
        streak: 0,
        correctCount: 0,
        hasAnswered: false,
        answers: [],
        teamId: teamId,
        character: character,
        powerUps: [],
      };

      room.players.set(playerId, player);
      socketToGame.set(socket.id, gamePin);

      if (teamId) {
        const existing = room.teamMembers.find(tm => tm.playerId === playerId);
        if (!existing) {
          const team = room.teams.find(t => t.id === teamId);
          if (team) {
            room.teamMembers.push({ id: Date.now(), teamId, gameId: room.gameId, playerId, nickname });
          }
        }
      }

      socket.join(gamePin);

      socket.emit('answer-confirmed', { accepted: true, playerId, sessionId });
      socket.emit('player-list', {
        players: Array.from(room.players.values()).map(p => p.nickname),
      });
      io.to(gamePin).emit('player-joined', {
        playerId,
        nickname,
        playerCount: room.players.size,
        teamId: player.teamId,
        character: player.character,
      });

      console.log(`Player "${nickname}" joined game ${gamePin}. Total: ${room.players.size}`);
    });

    socket.on('host-register', async (data: { gamePin: string; hostId: number }) => {
      let room = gameRooms.get(data.gamePin);

      if (!room) {
        room = await createRoom(data.gamePin);
        if (!room) return;
      }

      if (room.hostId === data.hostId) {
        room.hostSocketId = socket.id;
        socketToGame.set(socket.id, data.gamePin);
        socket.join(data.gamePin);
        console.log(`Host registered for game ${data.gamePin}`);

        socket.emit('update-player-list', Array.from(room.players.values()).map(player => ({
          playerId: player.id,
          nickname: player.nickname,
          teamId: player.teamId,
          character: player.character,
        })));
        socket.emit('team-updated', { teams: room.teams });
      }
    });

    socket.on('kick-player', (data: { gamePin: string; playerId: string }) => {
      const { gamePin, playerId } = data;
      const room = gameRooms.get(gamePin);
      if (!room || room.hostSocketId !== socket.id) return;

      const targetPlayer = room.players.get(playerId);
      if (!targetPlayer) return;

      const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
      if (targetSocket) {
        targetSocket.leave(gamePin);
        targetSocket.emit('kicked-from-game', { message: 'You have been removed by the host.' });
      }

      room.players.delete(playerId);
      if (targetPlayer.socketId) {
        socketToGame.delete(targetPlayer.socketId);
      }

      io.to(gamePin).emit('player-left', {
        playerId: targetPlayer.id,
        nickname: targetPlayer.nickname,
        playerCount: room.players.size,
      });

      if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('update-player-list', Array.from(room.players.values()).map(player => ({
          playerId: player.id,
          nickname: player.nickname,
          teamId: player.teamId,
          character: player.character,
        })));
      }

      if (room.status === 'active') {
        checkIfAllAnswered(room, io);
      }
    });

    socket.on('create-team', (data: { gamePin: string; name: string; color: string }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room) return;

      const teamId = Date.now();
      const newTeam: ITeam = {
        id: teamId,
        gameId: room.gameId,
        name: data.name,
        color: data.color,
        score: 0,
      };
      room.teams.push(newTeam);

      io.to(data.gamePin).emit('team-created', { teamId, name: data.name, color: data.color });
      io.to(data.gamePin).emit('team-updated', { teams: room.teams });
    });

    socket.on('join-team', (data: { gamePin: string; teamId: number }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      const team = room.teams.find(t => t.id === data.teamId);
      if (!team) return;

      player.teamId = data.teamId;
      room.teamMembers = room.teamMembers.filter(tm => tm.playerId !== player.id);
      room.teamMembers.push({
        id: Date.now(),
        teamId: data.teamId,
        gameId: room.gameId,
        playerId: player.id,
        nickname: player.nickname,
      });

      io.to(data.gamePin).emit('team-updated', { teams: room.teams });
      io.to(data.gamePin).emit('update-player-list', Array.from(room.players.values()).map(p => ({
        playerId: p.id,
        nickname: p.nickname,
        teamId: p.teamId,
        character: p.character,
      })));
    });

    socket.on('buy-powerup', (data: { gamePin: string; powerUpId: number }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      const def = POWER_UP_DEFS.find(p => p.id === data.powerUpId);
      if (!def) return;

      if (player.score < def.cost) {
        socket.emit('error', { message: 'Not enough points for this power-up' });
        return;
      }

      player.score -= def.cost;
      player.powerUps.push({
        id: Date.now(),
        gameId: room.gameId,
        playerId: player.id,
        powerUpId: data.powerUpId,
        used: false,
      });

      socket.emit('powerup-purchased', { playerId: player.id, powerUpId: data.powerUpId, remainingPoints: player.score });
    });

    socket.on('use-powerup', (data: { gamePin: string; powerUpId: number }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room || room.status !== 'active') return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      const pu = player.powerUps.find(p => p.powerUpId === data.powerUpId && !p.used);
      if (!pu) return;

      pu.used = true;
      const def = POWER_UP_DEFS.find(p => p.id === data.powerUpId);
      const effect = def?.name || 'unknown';

      io.to(data.gamePin).emit('powerup-used', { playerId: player.id, powerUpId: data.powerUpId, effect });
    });

    socket.on('chat-message', (data: { gamePin: string; message: string }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      const clean = data.message.trim().slice(0, 200);
      if (!clean) return;

      const msg: IChatMessage = {
        id: Date.now(),
        gameId: room.gameId,
        playerId: player.id,
        nickname: player.nickname,
        message: clean,
        type: 'chat',
        createdAt: new Date().toISOString(),
      };
      room.chatMessages.push(msg);

      io.to(data.gamePin).emit('chat-received', {
        playerId: player.id,
        nickname: player.nickname,
        message: clean,
        type: 'chat',
      });
    });

    socket.on('send-reaction', (data: { gamePin: string; reaction: string }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      io.to(data.gamePin).emit('reaction-received', { playerId: player.id, reaction: data.reaction });
    });

    socket.on('host-judge', (data: { gamePin: string; questionId: number; playerId: string; points: number }) => {
      const room = gameRooms.get(data.gamePin);
      if (!room || room.hostSocketId !== socket.id) return;

      const player = room.players.get(data.playerId);
      if (!player) return;

      player.score += data.points;
      if (data.points > 0) player.correctCount++;

      io.to(data.gamePin).emit('answer-confirmed', { accepted: true, playerId: data.playerId });
    });

    socket.on('reconnect-player', (data: { sessionId: string; nickname: string; gamePin?: string; character?: string }) => {
      const { sessionId, nickname, gamePin: requestedGamePin, character } = data;
      const currentGamePin = socketToGame.get(socket.id);
      let room: ServerGameRoom | undefined;

      if (requestedGamePin) {
        room = gameRooms.get(requestedGamePin);
      } else if (currentGamePin) {
        room = gameRooms.get(currentGamePin);
      } else {
        room = Array.from(gameRooms.values()).find(r =>
          Array.from(r.players.values()).some(p => p.sessionId === sessionId)
        );
      }

      if (!room) {
        socket.emit('error', { message: 'Unable to reconnect. Please join again.' });
        return;
      }

      const existingPlayer = Array.from(room.players.values()).find(p => p.sessionId === sessionId);
      if (!existingPlayer) {
        socket.emit('error', { message: 'Unable to reconnect. Please join again.' });
        return;
      }

      if (existingPlayer.disconnectTimeout) {
        clearTimeout(existingPlayer.disconnectTimeout);
        delete existingPlayer.disconnectTimeout;
      }

      existingPlayer.socketId = socket.id;
      existingPlayer.nickname = nickname;
      if (character) existingPlayer.character = character;
      socketToGame.set(socket.id, room.gamePin);
      socket.join(room.gamePin);

      socket.emit('answer-confirmed', { accepted: true, playerId: existingPlayer.id, sessionId });
      socket.emit('player-list', {
        players: Array.from(room.players.values()).map(p => p.nickname),
      });
      socket.emit('player-reconnected', { playerId: existingPlayer.id, playerCount: room.players.size });

      if (room.status === 'active') {
        const question = room.quiz.questions[room.currentQuestionIndex];
        if (question && room.questionStartTime) {
          const timerMs = question.timerSeconds * 1000;
          const elapsed = Date.now() - room.questionStartTime;
          const timeLeft = Math.max(0, Math.ceil((timerMs - elapsed) / 1000));

          if (timeLeft > 0) {
            socket.emit('player-question-start', {
              questionId: question.id,
              questionText: question.questionText,
              answers: question.answers.map(a => ({ text: a.text, color: a.color })),
              answerCount: question.answers.length,
              timer: question.timerSeconds,
              startsAt: room.questionStartTime,
              questionIndex: room.currentQuestionIndex,
              totalQuestions: room.quiz.questions.length,
              questionType: question.questionType,
            });
          }
        }
      }

      if (room.status === 'finished') {
        socket.emit('game-ended', { finalRankings: getLeaderboard(room) });
      }

      console.log(`Player ${nickname} reconnected to game ${room.gamePin}`);
    });

    socket.on('host-start-game', async (data: { gameId: number }) => {
      const gamePin = socketToGame.get(socket.id);
      if (!gamePin) return;

      const room = gameRooms.get(gamePin);
      if (!room || room.hostSocketId !== socket.id) return;

      room.status = 'active';
      room.currentQuestionIndex = 0;
      room.startedAt = new Date();

      for (const player of room.players.values()) {
        player.powerUps = [];
        player.score = 0;
        player.streak = 0;
        player.correctCount = 0;
        player.hasAnswered = false;
        player.answers = [];
      }

      await Game.updateOne({ id: room.gameId }, { $set: { status: 'active', startedAt: new Date() } });

      io.to(gamePin).emit('game-started', {
        totalQuestions: room.quiz.questions.length,
      });

      const question = room.quiz.questions[room.currentQuestionIndex];
      if (!question) return;

      io.to(room.hostSocketId).emit('host-question-start', {
        questionId: question.id,
        questionText: question.questionText,
        answers: question.answers.map(a => ({ text: a.text, color: a.color })),
        timer: question.timerSeconds,
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        questionType: question.questionType,
      });

      for (const player of room.players.values()) {
        if (player.socketId) {
          io.to(player.socketId).emit('player-question-start', {
            questionId: question.id,
            questionText: question.questionText,
            answers: question.answers.map(a => ({ text: a.text, color: a.color })),
            answerCount: question.answers.length,
            timer: question.timerSeconds,
            startsAt: room.questionStartTime,
            questionIndex: room.currentQuestionIndex,
            totalQuestions: room.quiz.questions.length,
            questionType: question.questionType,
          });
        }
      }

      startTimer(room, io, question.timerSeconds);

      console.log(`Game ${gamePin} started. Timer set for ${question.timerSeconds}s.`);
    });

    socket.on('answer-submitted', (data: {
      gameId: number;
      questionId: number;
      answerIndex: number;
      responseTimeMs: number;
    }) => {
      const gamePin = socketToGame.get(socket.id);
      if (!gamePin) return;

      const room = gameRooms.get(gamePin);
      if (!room || room.status !== 'active') return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player || player.hasAnswered) return;

      const currentQuestion = room.quiz.questions[room.currentQuestionIndex];
      if (!currentQuestion || currentQuestion.id !== data.questionId) return;

      if (currentQuestion.questionType === 'open_ended') {
        player.hasAnswered = true;
        player.answers.push({
          questionId: currentQuestion.id,
          answerIndex: data.answerIndex,
          responseTimeMs: data.responseTimeMs,
          isCorrect: false,
          pointsEarned: 0,
        });
        socket.emit('answer-confirmed', { accepted: true });
        io.to(room.hostSocketId).emit('answer-received', {
          answeredCount: Array.from(room.players.values()).filter(p => p.hasAnswered).length,
          totalCount: room.players.size,
        });
        checkIfAllAnswered(room, io);
        return;
      }

      const isCorrect = data.answerIndex === currentQuestion.correctIndex;
      let pointsEarned = 0;
      let timeTaken = 0;

      if (isCorrect && room.questionStartTime) {
        timeTaken = Date.now() - room.questionStartTime;
        const timerMs = currentQuestion.timerSeconds * 1000;
        const multiplier = currentQuestion.pointsMultiplier || 1;
        pointsEarned = Math.floor(currentQuestion.points * (1 - timeTaken / (2 * timerMs)) * multiplier);
        pointsEarned = Math.max(pointsEarned, 500);
        player.streak++;
        pointsEarned += Math.min(player.streak * 50, 500);
      } else {
        player.streak = 0;
      }

      player.score += pointsEarned;
      player.hasAnswered = true;
      player.answers.push({
        questionId: currentQuestion.id,
        answerIndex: data.answerIndex,
        responseTimeMs: timeTaken,
        isCorrect,
        pointsEarned,
      });
      if (isCorrect) player.correctCount++;

      socket.emit('answer-confirmed', { accepted: true });

      const answeredCount = Array.from(room.players.values()).filter(p => p.hasAnswered).length;
      io.to(room.hostSocketId).emit('answer-received', {
        answeredCount,
        totalCount: room.players.size,
      });

      console.log(`[Game ${gamePin}] ${player.nickname}: ${isCorrect ? 'CORRECT' : 'WRONG'} (+${pointsEarned}pts) | ${answeredCount}/${room.players.size} answered`);

      const allAnswered = Array.from(room.players.values()).every(p => p.hasAnswered);
      if (allAnswered) {
        clearQuestionTimers(room);
        io.to(gamePin).emit('time-up', { reason: 'all-answered' });
        setTimeout(() => showQuestionResults(room, io), 500);
      }
    });

    socket.on('host-next-question', (data: { gameId: number }) => {
      const gamePin = socketToGame.get(socket.id);
      if (!gamePin) return;

      const room = gameRooms.get(gamePin);
      if (!room || room.hostSocketId !== socket.id) return;

      room.currentQuestionIndex++;

      if (room.currentQuestionIndex >= room.quiz.questions.length) {
        endGame(room, io);
        return;
      }

      sendQuestion(room, io);
    });

    socket.on('host-end-game', (data: { gameId: number }) => {
      const gamePin = socketToGame.get(socket.id);
      if (!gamePin) return;

      const room = gameRooms.get(gamePin);
      if (!room || room.hostSocketId !== socket.id) return;

      endGame(room, io);
    });

    socket.on('disconnect', () => {
      const gamePin = socketToGame.get(socket.id);
      if (!gamePin) return;

      const room = gameRooms.get(gamePin);
      if (!room) return;

      if (room.hostSocketId === socket.id) {
        console.log(`Host disconnected from game ${gamePin}`);
        io.to(gamePin).emit('host-disconnected');
        clearQuestionTimers(room);
        gameRooms.delete(gamePin);
      } else {
        const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
        if (player) {
          if (player.disconnectTimeout) {
            clearTimeout(player.disconnectTimeout);
          }

          player.socketId = '';
          player.disconnectTimeout = setTimeout(() => {
            const cleanupRoom = gameRooms.get(gamePin);
            if (!cleanupRoom) return;

            cleanupRoom.players.delete(player.id);
            io.to(gamePin).emit('player-left', {
              playerId: player.id,
              nickname: player.nickname,
              playerCount: cleanupRoom.players.size,
            });

            if (cleanupRoom.hostSocketId) {
              io.to(cleanupRoom.hostSocketId).emit('update-player-list', Array.from(cleanupRoom.players.values()).map(player => ({
                playerId: player.id,
                nickname: player.nickname,
                teamId: player.teamId,
                character: player.character,
              })));
            }

            console.log(`Player "${player.nickname}" timed out and was removed from game ${gamePin}. Total: ${cleanupRoom.players.size}`);

            if (cleanupRoom.status === 'active') {
              checkIfAllAnswered(cleanupRoom, io);
            }
          }, 15000);
        }
      }

      socketToGame.delete(socket.id);
    });
  });
}

function startTimer(room: ServerGameRoom, io: SocketServer, timeLimit: number) {
  let timeLeft = timeLimit;

  room.questionStartTime = Date.now();

  if (room.questionTimerInterval) {
    clearInterval(room.questionTimerInterval);
  }

  room.questionTimerInterval = setInterval(() => {
    timeLeft--;

    io.to(room.gamePin).emit('timer-tick', { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(room.questionTimerInterval);
      room.questionTimerInterval = undefined;
      io.to(room.gamePin).emit('time-up', { reason: 'timer-expired' });
      showQuestionResults(room, io);
    }
  }, 1000);
}

function sendQuestion(room: ServerGameRoom, io: SocketServer) {
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question) return;

  clearQuestionTimers(room);

  for (const player of room.players.values()) {
    player.hasAnswered = false;
  }

  const startsAt = Date.now() + 1000;
  room.questionStartTime = startsAt;

  io.to(room.hostSocketId).emit('host-question-start', {
    questionId: question.id,
    questionText: question.questionText,
    answers: question.answers.map(a => ({ text: a.text, color: a.color })),
    timer: question.timerSeconds,
    startsAt,
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    questionType: question.questionType,
  });

  for (const player of room.players.values()) {
    if (player.socketId) {
      io.to(player.socketId).emit('player-question-start', {
        questionId: question.id,
        questionText: question.questionText,
        answers: question.answers.map(a => ({ text: a.text, color: a.color })),
        answerCount: question.answers.length,
        timer: question.timerSeconds,
        startsAt,
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        questionType: question.questionType,
      });
    }
  }

  setTimeout(() => {
    startTimer(room, io, question.timerSeconds);
  }, 1000);
}

function clearQuestionTimers(room: ServerGameRoom) {
  if (room.questionTimerInterval) {
    clearInterval(room.questionTimerInterval);
    room.questionTimerInterval = undefined;
  }
}

function checkIfAllAnswered(room: ServerGameRoom, io: SocketServer) {
  if (room.players.size === 0) return;

  const allAnswered = Array.from(room.players.values()).every(p => p.hasAnswered);
  if (!allAnswered) return;

  clearQuestionTimers(room);

  io.to(room.gamePin).emit('time-up', { reason: 'all-answered' });

  setTimeout(() => {
    showQuestionResults(room, io);
  }, 1500);
}

function showQuestionResults(room: ServerGameRoom, io: SocketServer) {
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question) return;

  let stats = [0, 0, 0, 0];
  if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
    for (const player of room.players.values()) {
      const answer = player.answers.find(a => a.questionId === question.id);
      if (answer) {
        stats[answer.answerIndex]++;
      }
    }
  }

  const leaderboard = getLeaderboard(room);

  io.to(room.gamePin).emit('question-ended', {
    correctIndex: question.correctIndex,
    stats: stats.map((count, answerIndex) => ({ answerIndex, count })),
    leaderboard,
    correctAnswer: question.questionType === 'open_ended' ? 'Host judgment' : question.answers[question.correctIndex]?.text,
  });
}

async function endGame(room: ServerGameRoom, io: SocketServer) {
  clearQuestionTimers(room);
  room.status = 'finished';

  await Game.updateOne({ id: room.gameId }, { $set: { status: 'finished', endedAt: new Date() } });

  const leaderboard = getLeaderboard(room);

  for (const entry of leaderboard) {
    const resultId = await nextId('game_results');
    await GameResult.create({
      id: resultId,
      gameId: room.gameId,
      nickname: entry.nickname,
      score: entry.score,
      correct: entry.correct,
      total: room.quiz.questions.length,
      streak: entry.streak,
      rank: entry.rank,
    });
  }

  io.to(room.gamePin).emit('game-ended', { finalRankings: leaderboard });

  setTimeout(() => {
    gameRooms.delete(room.gamePin);
  }, 60000);
}

function getLeaderboard(room: ServerGameRoom): LeaderboardEntry[] {
  const players = Array.from(room.players.values());
  players.sort((a, b) => b.score - a.score);

  return players.map((player, index) => {
    const team = room.teams.find(t => t.id === player.teamId);
    return {
      rank: index + 1,
      nickname: player.nickname,
      score: player.score,
      correct: player.correctCount,
      streak: player.streak,
      teamId: player.teamId,
      teamName: team?.name,
      character: player.character,
    };
  });
}
