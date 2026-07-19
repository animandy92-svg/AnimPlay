import { Router, Request, Response } from 'express';
import { Game, GameResult, Quiz } from '../models';
import { authenticateToken } from './auth';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;

  const games = await Game.find({ hostId, status: 'finished' }).sort({ endedAt: -1 }).lean();

  const reports = [];
  for (const g of games) {
    const quiz = await Quiz.findOne({ id: g.quizId }).lean();
    const playerCount = await GameResult.countDocuments({ gameId: g.id });
    const top = await GameResult.findOne({ gameId: g.id }).sort({ score: -1 }).lean();
    reports.push({
      id: g.id,
      game_pin: g.gamePin,
      started_at: g.startedAt,
      ended_at: g.endedAt,
      created_at: g.createdAt,
      quiz_title: quiz?.title,
      player_count: playerCount,
      top_score: top?.score ?? 0,
    });
  }

  res.json({ reports });
});

router.get('/:gameId', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const gameId = Number(req.params.gameId);

  const game = await Game.findOne({ id: gameId, hostId, status: 'finished' }).lean();
  if (!game) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const quiz = await Quiz.findOne({ id: game.quizId }).lean();
  const results = await GameResult.find({ gameId }).sort({ rank: 1 }).lean();

  res.json({
    game: { ...game, quiz_title: quiz?.title },
    results,
  });
});

export default router;
