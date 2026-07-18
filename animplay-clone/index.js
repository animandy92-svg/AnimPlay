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

  socket.on('leave-game', () => {
    removePlayerFromGame(socket);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    removePlayerFromGame(socket);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`AnimPlay server is running on port ${PORT}`);
});
