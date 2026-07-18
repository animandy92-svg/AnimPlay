import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from './auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;

  const reports = db.prepare(`
    SELECT g.id, g.game_pin, g.started_at, g.ended_at, g.created_at,
           q.title as quiz_title,
           (SELECT COUNT(*) FROM game_results gr WHERE gr.game_id = g.id) as player_count,
           (SELECT MAX(score) FROM game_results gr WHERE gr.game_id = g.id) as top_score
    FROM games g
    JOIN quizzes q ON q.id = g.quiz_id
    WHERE g.host_id = ? AND g.status = 'finished'
    ORDER BY g.ended_at DESC
  `).all(hostId);

  res.json({ reports });
});

router.get('/:gameId', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const gameId = req.params.gameId;

  const game = db.prepare(`
    SELECT g.*, q.title as quiz_title
    FROM games g
    JOIN quizzes q ON q.id = g.quiz_id
    WHERE g.id = ? AND g.host_id = ? AND g.status = 'finished'
  `).get(gameId, hostId) as any;

  if (!game) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const results = db.prepare(
    'SELECT * FROM game_results WHERE game_id = ? ORDER BY rank'
  ).all(gameId);

  res.json({ game, results });
});

export default router;
