import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { initializeDb } from './db';
import authRoutes from './routes/auth';
import quizRoutes from './routes/quizzes';
import gameRoutes from './routes/games';
import { setupGameSocket } from './socket/gameSocket';

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/games', gameRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initializeDb();
setupGameSocket(io);

httpServer.listen(PORT, () => {
  console.log(`AnimPlay server running on http://localhost:${PORT}`);
});
