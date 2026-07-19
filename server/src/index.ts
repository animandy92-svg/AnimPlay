import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { connectDb, disconnectDb } from './db';
import authRoutes from './routes/auth';
import quizRoutes from './routes/quizzes';
import gameRoutes from './routes/games';
import discoverRoutes from './routes/discover';
import reportRoutes from './routes/reports';
import groupRoutes from './routes/groups';
import learningRoutes from './routes/learning';
import folderRoutes from './routes/folders';
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
app.use('/api/discover', discoverRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/folders', folderRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

connectDb().then(() => {
  setupGameSocket(io);

  process.on('SIGINT', () => { disconnectDb().then(() => process.exit(0)); });
  process.on('SIGTERM', () => { disconnectDb().then(() => process.exit(0)); });

  httpServer.listen(PORT, () => {
    console.log(`AnimPlay server running on http://localhost:${PORT}`);
  });
});
