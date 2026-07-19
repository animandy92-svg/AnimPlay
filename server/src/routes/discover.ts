import { Router, Request, Response } from 'express';
import { Quiz, Question, Host } from '../models';

const router = Router();

const CATEGORIES = ['general', 'trivia', 'science', 'sports', 'language', 'food', 'animals'];

router.get('/categories', (_req: Request, res: Response) => {
  res.json({ categories: CATEGORIES });
});

router.get('/quizzes', async (req: Request, res: Response) => {
  const { search = '', category = '', sort = 'popular' } = req.query as Record<string, string>;

  const filter: any = {
    isPublic: true,
    status: 'published',
    deletedAt: null,
  };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (category && category !== 'all') {
    filter.category = category;
  }

  let sortOption: any = { playCount: -1 };
  if (sort === 'newest') sortOption = { createdAt: -1 };

  const quizzes = await Quiz.find(filter).sort(sortOption).lean();

  const result = [];
  for (const q of quizzes) {
    const host = await Host.findOne({ id: q.hostId }, { username: 1 }).lean();
    const questionCount = await Question.countDocuments({ quizId: q.id });
    result.push({ ...q, creator_name: host?.username || '', question_count: questionCount });
  }

  res.json({ quizzes: result });
});

router.post('/:quizId/play', async (req: Request, res: Response) => {
  const quizId = Number(req.params.quizId);
  const quiz = await Quiz.findOne({ id: quizId, isPublic: true });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  await Quiz.updateOne({ id: quizId }, { $inc: { playCount: 1 } });
  res.json({ success: true });
});

export default router;
