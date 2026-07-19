const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// This Map will store all live games in the server's memory
const activeGames = new Map();

const dummyQuiz = [
  {
    text: 'What is the capital of Japan?',
    timeLimit: 20,
    answers: [
      { text: 'Kyoto', isCorrect: false },
      { text: 'Osaka', isCorrect: false },
      { text: 'Tokyo', isCorrect: true },
      { text: 'Seoul', isCorrect: false },
    ],
  },
];

// Helper function to generate a 6-digit PIN
function generateGamePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.get('/', (req, res) => {
  res.json({ message: 'AnimPlay clone server is online' });
});

const getPlayersForGame = (pin) => {
  const game = activeGames.get(pin);
  return game ? game.players : [];
};

const startTimer = (pin, game, timeLimit) => {
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
  }

  const endsAt = Date.now() + timeLimit * 1000;
  io.to(pin).emit('timer-start', {
    timeLimit,
    endsAt,
  });

  game.questionTimer = setTimeout(() => {
    io.to(pin).emit('timer-ended');
    io.to(game.hostSocketId).emit('timer-ended');
    console.log(`Timer ended for game ${pin}`);
  }, timeLimit * 1000);
};

const removePlayerFromGame = (socket) => {
  const { gamePin, isHost } = socket;
  if (!gamePin || !activeGames.has(gamePin)) {
    return;
  }

  const game = activeGames.get(gamePin);

  if (isHost) {
    io.to(gamePin).emit('game-ended', 'Host disconnected. The game has closed.');
    io.in(gamePin).socketsLeave(gamePin);
    activeGames.delete(gamePin);
    return;
  }

  game.players = game.players.filter((player) => player.socketId !== socket.id);
  socket.leave(gamePin);

  if (game.players.length === 0 && socket.id !== game.hostSocketId) {
    // keep the game open for the host until they disconnect
  }

  io.to(game.hostSocketId).emit('update-player-list', game.players);
  io.to(gamePin).emit('player-list-updated', game.players);
};

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // 1. HOST CREATES A GAME
  socket.on('create-game', () => {
    const pin = generateGamePin();

    activeGames.set(pin, {
      hostSocketId: socket.id,
      players: [],
      gameState: 'LOBBY',
      currentQuestionIndex: 0,
    });

    socket.gamePin = pin;
    socket.isHost = true;
    socket.join(pin);

    socket.emit('game-created', pin);
    console.log(`Game created with PIN: ${pin}`);
  });

  // 2. PLAYER JOINS A GAME
  socket.on('player-join', (data) => {
    const { pin, nickname } = data;
    const game = activeGames.get(pin);

    if (!pin || !nickname) {
      socket.emit('join-error', 'PIN and nickname are required.');
      return;
    }

    if (!game || game.gameState !== 'LOBBY') {
      socket.emit('join-error', 'Game not found or has already started!');
      return;
    }

    socket.gamePin = pin;
    socket.isHost = false;
    socket.join(pin);

    game.players.push({
      socketId: socket.id,
      nickname,
      score: 0,
      hasAnswered: false,
    });

    io.to(game.hostSocketId).emit('update-player-list', game.players);
    io.to(pin).emit('player-list-updated', game.players);
    socket.emit('join-success', { pin, players: game.players });

    console.log(`${nickname} joined game ${pin}`);
  });

    // 3. HOST STARTS THE GAME
    socket.on('start-game', (pin) => {
      const game = activeGames.get(pin);

      // Verify the game exists and the requester is actually the host
      if (game && game.hostSocketId === socket.id) {
        game.gameState = 'QUESTION';
        game.currentQuestionIndex = 0;

        const currentQuestion = dummyQuiz[game.currentQuestionIndex];

        // Send the FULL question data to the Host's screen
        io.to(game.hostSocketId).emit('host-question-start', currentQuestion);

        // Send ONLY the number of answers to the Player's screen (the remote control)
        socket.to(pin).emit('player-question-start', {
          answerCount: currentQuestion.answers.length,
        });

        // NEW: Start the server-side countdown!
        startTimer(pin, game, currentQuestion.timeLimit);

        console.log(`Game ${pin} has started! Timer set for ${currentQuestion.timeLimit}s.`);
      }
    });

    socket.on('submit-answer', (data) => {
      const { pin, answerIndex } = data;
      const game = activeGames.get(pin);

      if (!game) {
        socket.emit('answer-error', 'Game not found.');
        return;
      }

      const player = game.players.find((p) => p.socketId === socket.id);
      if (!player) {
        socket.emit('answer-error', 'Player not found in this game.');
        return;
      }

      // In this dummy flow, we just accept the answer and notify the host.
      io.to(game.hostSocketId).emit('player-answered', {
        nickname: player.nickname,
        answerIndex,
      });

      socket.emit('answer-confirmed', {
        accepted: true,
        answerIndex,
      });

      console.log(`${player.nickname} answered ${answerIndex} in game ${pin}`);
    });

