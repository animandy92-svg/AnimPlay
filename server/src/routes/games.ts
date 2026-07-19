import { Router, Request, Response } from 'express';
import { Game, Quiz, Question, GameResult, nextId } from '../models';
import { authenticateToken } from './auth';
import { generateGamePin } from '../utils/pin';

const router = Router();

router.post('/start', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const { quizId } = req.body;

  if (!quizId) {
    return res.status(400).json({ error: 'quizId is required' });
  }

  const quiz = await Quiz.findOne({ id: Number(quizId), hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const questionCount = await Question.countDocuments({ quizId: Number(quizId) });
  if (questionCount === 0) {
    return res.status(400).json({ error: 'Quiz has no questions' });
  }

  let gamePin = generateGamePin();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await Game.findOne({ gamePin, status: { $ne: 'finished' } });
    if (!existing) break;
    gamePin = generateGamePin();
    attempts++;
  }

  const id = await nextId('games');
  const game = await Game.create({
    id,
    gamePin,
    quizId: Number(quizId),
    hostId,
    status: 'lobby',
    currentQuestion: 0,
    startedAt: null,
    endedAt: null,
  });

  res.json({ gameId: id, gamePin });
});

router.get('/:pin', async (req: Request, res: Response) => {
  const pin = req.params.pin;

  const game = await Game.findOne({ gamePin: pin }).lean();
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const quiz = await Quiz.findOne({ id: game.quizId }).lean();
  res.json({ game: { ...game, quiz_title: quiz?.title } });
});

router.get('/:pin/results', async (req: Request, res: Response) => {
  const pin = req.params.pin;

  const game = await Game.findOne({ gamePin: pin }).lean();
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const results = await GameResult.find({ gameId: game.id }).sort({ rank: 1 }).lean();
  res.json({ results });
});

export default router;
