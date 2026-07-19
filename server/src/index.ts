import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { initializeDb, saveDatabase } from './db';
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

app.use('/api', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    res.on('finish', () => {
      if (res.statusCode < 400) saveDatabase();
    });
  }
  next();
});

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

initializeDb().then(() => {
  setupGameSocket(io);

  setInterval(saveDatabase, 30000);

  process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
  process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });

  httpServer.listen(PORT, () => {
    console.log(`AnimPlay server running on http://localhost:${PORT}`);
  });
});
