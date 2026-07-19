import { Server as SocketServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { Game, Quiz, Question, Answer, GameResult, nextId } from '../models';
import type { GameRoom, Player, LeaderboardEntry, QuestionWithOptions, QuizDetail } from '../../../shared/types';

const badWordsList = ['badword1', 'badword2', 'trollname']; // Extend this list

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

export function setupGameSocket(io: SocketServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-game', async (data: { gamePin: string; nickname: string }) => {
      const { gamePin, nickname } = data;
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
        const questions = await Question.find({ quizId: game.quizId }).sort({ sortOrder: 1 }).lean() as QuestionWithOptions[];
        for (const q of questions) {
          (q as any).answers = await Answer.find({ questionId: q.id }).sort({ sortIndex: 1 }).lean();
        }

        const quizData = await Quiz.findOne({ id: game.quizId }).lean();
        const quiz: QuizDetail = {
          id: game.quizId,
          host_id: game.hostId,
          title: quizData?.title || '',
          description: quizData?.description || '',
          cover_image: quizData?.coverImage || null,
          is_public: quizData?.isPublic ?? true,
          created_at: quizData?.createdAt ? quizData.createdAt.toISOString() : '',
          updated_at: quizData?.updatedAt ? quizData.updatedAt.toISOString() : '',
          questions,
        };

        room = {
          gameId: game.id,
          gamePin,
          quizId: game.quizId,
          hostId: game.hostId,
          hostSocketId: '',
          status: 'lobby',
          currentQuestionIndex: 0,
          players: new Map<string, ServerPlayer>(),
          quiz,
          startedAt: new Date(),
        };
        gameRooms.set(gamePin, room);
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
      };

      room.players.set(playerId, player);
      socketToGame.set(socket.id, gamePin);

      socket.join(gamePin);

      socket.emit('answer-confirmed', { accepted: true, playerId, sessionId });
      socket.emit('player-list', {
        players: Array.from(room.players.values()).map(p => p.nickname),
      });
      socket.to(gamePin).emit('player-joined', {
        playerId,
        nickname,
        playerCount: room.players.size,
      });

      console.log(`Player "${nickname}" joined game ${gamePin}. Total: ${room.players.size}`);
    });

    socket.on('host-register', (data: { gamePin: string; hostId: number }) => {
      const room = gameRooms.get(data.gamePin);
      if (room && room.hostId === data.hostId) {
        room.hostSocketId = socket.id;
        socketToGame.set(socket.id, data.gamePin);
        socket.join(data.gamePin);
        console.log(`Host registered for game ${data.gamePin}`);
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
        })));
      }

      if (room.status === 'active') {
        checkIfAllAnswered(room, io);
      }
    });

    socket.on('reconnect-player', (data: { sessionId: string; nickname: string; gamePin?: string }) => {
      const { sessionId, nickname, gamePin: requestedGamePin } = data;
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
          const timerMs = question.timer_seconds * 1000;
          const elapsed = Date.now() - room.questionStartTime;
          const timeLeft = Math.max(0, Math.ceil((timerMs - elapsed) / 1000));

          if (timeLeft > 0) {
            socket.emit('player-question-start', {
              questionId: question.id,
              answerCount: question.answers.length,
              timer: question.timer_seconds,
              startsAt: room.questionStartTime,
              questionIndex: room.currentQuestionIndex,
              totalQuestions: room.quiz.questions.length,
            });
          }
        }
      }

      if (room.status === 'finished') {
        socket.emit('game-ended', { finalRankings: getLeaderboard(room) });
      }

      console.log(`Player ${nickname} reconnected to game ${room.gamePin}`);
    });

    socket.on('host-start-game', (data: { gameId: number }) => {
      const gamePin = socketToGame.get(socket.id);
      if (!gamePin) return;

      const room = gameRooms.get(gamePin);
      if (!room || room.hostSocketId !== socket.id) return;

      room.status = 'active';
      room.currentQuestionIndex = 0;
      room.startedAt = new Date();

      await Game.updateOne({ id: room.gameId }, { $set: { status: 'active', startedAt: new Date() } });

      io.to(gamePin).emit('game-started', {
        totalQuestions: room.quiz.questions.length,
      });

      const question = room.quiz.questions[room.currentQuestionIndex];
      if (!question) return;

      io.to(room.hostSocketId).emit('host-question-start', {
        questionId: question.id,
        questionText: question.question_text,
        answers: question.answers.map(a => ({ text: a.text, color: a.color })),
        timer: question.timer_seconds,
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
      });

      for (const player of room.players.values()) {
        if (player.socketId) {
          io.to(player.socketId).emit('player-question-start', {
            questionId: question.id,
            answerCount: question.answers.length,
            timer: question.timer_seconds,
            questionIndex: room.currentQuestionIndex,
            totalQuestions: room.quiz.questions.length,
          });
        }
      }

      startTimer(room, io, question.timer_seconds);

      console.log(`Game ${gamePin} started. Timer set for ${question.timer_seconds}s.`);
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

      const isCorrect = data.answerIndex === currentQuestion.correct_index;
      let pointsEarned = 0;

      if (isCorrect) {
        const timeTaken = Date.now() - room.questionStartTime;
        const timerMs = currentQuestion.timer_seconds * 1000;
        const multiplier = (currentQuestion as any).points_multiplier || 1;
        pointsEarned = Math.floor(currentQuestion.points * (1 - timeTaken / (2 * timerMs)) * multiplier);
        pointsEarned = Math.max(pointsEarned, 500);
        player.streak++;
        pointsEarned += Math.min(player.streak * 50, 500);
      } else {
        player.streak = 0;
      }

      player.score += pointsEarned;
      player.hasAnswered = true;
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
              io.to(cleanupRoom.hostSocketId).emit('update-player-list', Array.from(cleanupRoom.players.values()));
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
    questionText: question.question_text,
    answers: question.answers.map(a => ({ text: a.text, color: a.color })),
    timer: question.timer_seconds,
    startsAt,
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
  });

  for (const player of room.players.values()) {
    if (player.socketId) {
      io.to(player.socketId).emit('player-question-start', {
        questionId: question.id,
        answerCount: question.answers.length,
        timer: question.timer_seconds,
        startsAt,
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
      });
    }
  }

  setTimeout(() => {
    startTimer(room, io, question.timer_seconds);
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

  const stats = [0, 0, 0, 0];
  for (const player of room.players.values()) {
    const answer = player.answers.find(a => a.questionId === question.id);
    if (answer) {
      stats[answer.answerIndex]++;
    }
  }

  const leaderboard = getLeaderboard(room);

  io.to(room.gamePin).emit('question-ended', {
    correctIndex: question.correct_index,
    stats: stats.map((count, answerIndex) => ({ answerIndex, count })),
    leaderboard,
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

  return players.map((player, index) => ({
    rank: index + 1,
    nickname: player.nickname,
    score: player.score,
    correct: player.correctCount,
    streak: player.streak,
  }));
}
