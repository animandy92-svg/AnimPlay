import { Server as SocketServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { calculatePoints } from '../utils/scoring';
import type { GameRoom, Player, PlayerAnswer, LeaderboardEntry, QuestionWithOptions, QuizDetail } from '../../../shared/types';

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

    socket.on('join-game', (data: { gamePin: string; nickname: string }) => {
      const { gamePin, nickname } = data;

      const db = getDb();
      const game = db.prepare(`
        SELECT g.*, q.id as qid
        FROM games g
        JOIN quizzes q ON q.id = g.quiz_id
        WHERE g.game_pin = ? AND g.status = 'lobby'
      `).get(gamePin) as any;

      if (!game) {
        socket.emit('error', { message: 'Game not found or already started' });
        return;
      }

      let room = gameRooms.get(gamePin);

      if (!room) {
        const questions = db.prepare(`
          SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order
        `).all(game.quiz_id) as QuestionWithOptions[];

        for (const q of questions) {
          q.answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY sort_index').all(q.id) as any[];
        }

        const quiz: QuizDetail = {
          id: game.quiz_id,
          host_id: game.host_id,
          title: '',
          description: '',
          cover_image: null,
          is_public: true,
          created_at: '',
          updated_at: '',
          questions,
        };

        const quizData = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(game.quiz_id) as any;
        quiz.title = quizData.title;
        quiz.description = quizData.description;

        room = {
          gameId: game.id,
          gamePin,
          quizId: game.quiz_id,
          hostId: game.host_id,
          hostSocketId: '',
          status: 'lobby',
          currentQuestionIndex: 0,
          players: new Map<string, ServerPlayer>(),
          quiz,
          startedAt: new Date(),
        };
        gameRooms.set(gamePin, room);
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
      room.startedAt = new Date();

      const db = getDb();
      db.prepare('UPDATE games SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('active', room.gameId);

      io.to(gamePin).emit('game-started', {
        totalQuestions: room.quiz.questions.length,
      });

      sendQuestion(room, io);
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
      if (!player) return;

      const alreadyAnswered = player.answers.some(a => a.questionId === data.questionId);
      if (alreadyAnswered) {
        socket.emit('answer-confirmed', { accepted: false });
        return;
      }

      const currentQuestion = room.quiz.questions[room.currentQuestionIndex];
      if (!currentQuestion || currentQuestion.id !== data.questionId) return;

      const isCorrect = data.answerIndex === currentQuestion.correct_index;
      let pointsEarned = 0;
      let newStreak = player.streak;

      if (isCorrect) {
        newStreak = player.streak + 1;
        const scoring = calculatePoints(
          currentQuestion.timer_seconds,
          data.responseTimeMs,
          currentQuestion.points,
          player.streak
        );
        pointsEarned = scoring.points;
      } else {
        newStreak = 0;
      }

      const answer: PlayerAnswer = {
        questionId: data.questionId,
        answerIndex: data.answerIndex,
        responseTimeMs: data.responseTimeMs,
        isCorrect,
        pointsEarned,
      };

      player.answers.push(answer);
      player.score += pointsEarned;
      player.streak = newStreak;
      player.hasAnswered = true;
      if (isCorrect) player.correctCount++;

      socket.emit('answer-confirmed', { accepted: true });

      const answeredCount = Array.from(room.players.values()).filter(p => p.hasAnswered).length;
      io.to(room.hostSocketId).emit('answer-received', {
        answeredCount,
        totalCount: room.players.size,
      });

      console.log(`Player "${player.nickname}" answered Q${data.questionId}: ${isCorrect ? 'CORRECT' : 'WRONG'} (+${pointsEarned}pts)`);

      checkIfAllAnswered(room, io);
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

  const timerMs = question.timer_seconds * 1000;

  room.questionTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startsAt;
    const timeLeft = Math.max(0, Math.ceil((timerMs - elapsed) / 1000));
    io.to(room.gamePin).emit('timer-tick', { timeLeft });

    if (timeLeft <= 0) {
      clearQuestionTimers(room);
      io.to(room.gamePin).emit('time-up');
      showQuestionResults(room, io);
    }
  }, 1000);

  room.questionTimeout = setTimeout(() => {
    clearQuestionTimers(room);
    io.to(room.gamePin).emit('time-up');
    showQuestionResults(room, io);
  }, timerMs + 1500);
}

function clearQuestionTimers(room: ServerGameRoom) {
  if (room.questionTimerInterval) {
    clearInterval(room.questionTimerInterval);
    room.questionTimerInterval = undefined;
  }
  if (room.questionTimeout) {
    clearTimeout(room.questionTimeout);
    room.questionTimeout = undefined;
  }
}

function checkIfAllAnswered(room: ServerGameRoom, io: SocketServer) {
  if (room.players.size === 0) return;

  const allAnswered = Array.from(room.players.values()).every(p => p.hasAnswered);
  if (!allAnswered) return;

  clearQuestionTimers(room);

  io.to(room.gamePin).emit('time-up');

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

function endGame(room: ServerGameRoom, io: SocketServer) {
  clearQuestionTimers(room);
  room.status = 'finished';

  const db = getDb();
  db.prepare('UPDATE games SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('finished', room.gameId);

  const leaderboard = getLeaderboard(room);

  const insertResult = db.prepare(
    'INSERT INTO game_results (game_id, nickname, score, correct, total, streak, rank) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (const entry of leaderboard) {
    const player = Array.from(room.players.values()).find(p => p.nickname === entry.nickname);
    insertResult.run(
      room.gameId,
      entry.nickname,
      entry.score,
      entry.correct,
      room.quiz.questions.length,
      entry.streak,
      entry.rank
    );
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
