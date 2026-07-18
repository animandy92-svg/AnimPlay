const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Create the HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow any frontend to connect
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req, res) => {
  res.json({ message: 'AnimPlay clone server is online' });
});

// Listen for connections
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`AnimPlay server is running on port ${PORT}`);
});
