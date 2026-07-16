import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from './auth';
import { generateGamePin } from '../utils/pin';

const router = Router();

router.post('/start', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const { quizId } = req.body;

  if (!quizId) {
    return res.status(400).json({ error: 'quizId is required' });
  }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId) as any;
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?').get(quizId) as any;
  if (questionCount.count === 0) {
    return res.status(400).json({ error: 'Quiz has no questions' });
  }

  let gamePin = generateGamePin();
  let attempts = 0;
  while (attempts < 10) {
    const existing = db.prepare('SELECT id FROM games WHERE game_pin = ? AND status != ?').get(gamePin, 'finished');
    if (!existing) break;
    gamePin = generateGamePin();
    attempts++;
  }

  const result = db.prepare(
    'INSERT INTO games (game_pin, quiz_id, host_id, status) VALUES (?, ?, ?, ?)'
  ).run(gamePin, quizId, hostId, 'lobby');

  res.json({ gameId: result.lastInsertRowid, gamePin });
});

router.get('/:pin', (req: Request, res: Response) => {
  const db = getDb();
  const pin = req.params.pin;

  const game = db.prepare(`
    SELECT g.*, q.title as quiz_title
    FROM games g
    JOIN quizzes q ON q.id = g.quiz_id
    WHERE g.game_pin = ?
  `).get(pin) as any;

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({ game });
});

router.get('/:pin/results', (req: Request, res: Response) => {
  const db = getDb();
  const pin = req.params.pin;

  const game = db.prepare('SELECT id FROM games WHERE game_pin = ?').get(pin) as any;
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const results = db.prepare(
    'SELECT * FROM game_results WHERE game_id = ? ORDER BY rank'
  ).all(game.id);

  res.json({ results });
});

export default router;
