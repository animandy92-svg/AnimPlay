import { Router, Request, Response } from 'express';
import { Quiz, Question, Answer, nextId } from '../models';
import { authenticateToken } from './auth';

const router = Router();
const COLORS = ['red', 'blue', 'yellow', 'green'];

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const tab = (req.query.tab as string) || 'recent';
  const folderId = req.query.folderId ? Number(req.query.folderId) : undefined;

  const filter: any = { hostId };
  if (tab === 'trash') {
    filter.deletedAt = { $ne: null };
  } else {
    filter.deletedAt = null;
    if (tab === 'drafts') filter.status = 'draft';
    else if (tab === 'favorites') filter.isFavorite = true;
    else if (tab === 'shared') {
      return res.json({ quizzes: [] });
    }
  }

  if (folderId) filter.folderId = folderId;

  let sort: any = { updatedAt: -1 };
  const quizzes = await Quiz.find(filter).sort(sort).lean();

  const result = [];
  for (const q of quizzes) {
    const questionCount = await Question.countDocuments({ quizId: q.id });
    result.push({ ...q, question_count: questionCount });
  }

  res.json({ quizzes: result });
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const { title, description, status, is_public } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const id = await nextId('quizzes');
  const quiz = await Quiz.create({
    id,
    hostId,
    title,
    description: description || '',
    status: status || 'draft',
    isPublic: !!is_public,
    category: 'general',
    playCount: 0,
    isFavorite: false,
    folderId: null,
    deletedAt: null,
  });

  res.json({ quiz: { id: quiz.id, title, description } });
});

router.post('/:id/clone', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const sourceId = Number(req.params.id);

  const source = await Quiz.findOne({ id: sourceId, isPublic: true });
  if (!source) {
    return res.status(404).json({ error: 'Public quiz not found' });
  }

  const newQuizId = await nextId('quizzes');
  const newQuiz = await Quiz.create({
    id: newQuizId,
    hostId,
    title: `${source.title} (copy)`,
    description: source.description,
    isPublic: false,
    category: source.category || 'general',
    status: 'published',
    isFavorite: false,
    folderId: null,
    deletedAt: null,
  });

  const questions = await Question.find({ quizId: sourceId }).sort({ sortOrder: 1 }).lean();
  for (const q of questions) {
    const questionId = await nextId('questions');
    const newQ = await Question.create({
      id: questionId,
      quizId: newQuizId,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      timerSeconds: q.timerSeconds,
      points: q.points,
      pointsMultiplier: q.pointsMultiplier,
      sortOrder: q.sortOrder,
      correctIndex: q.correctIndex,
    });

    const answers = await Answer.find({ questionId: q.id }).sort({ sortIndex: 1 }).lean();
    for (const a of answers) {
      const answerId = await nextId('answers');
      await Answer.create({
        id: answerId,
        questionId,
        sortIndex: a.sortIndex,
        text: a.text,
        color: a.color,
      });
    }
  }

  await Quiz.updateOne({ id: sourceId }, { $inc: { playCount: 1 } });
  res.json({ quiz: { id: newQuizId, title: `${source.title} (copy)` } });
});

router.post('/:id/restore', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  await Quiz.updateOne({ id: quizId }, { $set: { deletedAt: null, updatedAt: new Date() } });
  res.json({ success: true });
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const questions = await Question.find({ quizId }).sort({ sortOrder: 1 }).lean();
  for (const q of questions) {
    (q as any).answers = await Answer.find({ questionId: q.id }).sort({ sortIndex: 1 }).lean();
  }

  res.json({ quiz: { ...quiz.toObject(), questions } });
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);
  const { title, description, status, is_public, is_favorite, folderId } = req.body;

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const update: any = { updatedAt: new Date() };
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (status !== undefined) update.status = status;
  if (is_public !== undefined) update.isPublic = !!is_public;
  if (is_favorite !== undefined) update.isFavorite = !!is_favorite;
  if (folderId !== undefined) update.folderId = folderId ? Number(folderId) : null;

  await Quiz.updateOne({ id: quizId }, { $set: update });
  res.json({ success: true });
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);
  const permanent = req.query.permanent === 'true';

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  if (permanent) {
    const qs = await Question.find({ quizId }).lean();
    for (const q of qs) {
      await Answer.deleteMany({ questionId: q.id });
    }
    await Question.deleteMany({ quizId });
    await Quiz.deleteOne({ id: quizId });
  } else {
    await Quiz.updateOne({ id: quizId }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
  }

  res.json({ success: true });
});

router.post('/:id/questions', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);
  const { question_text, timer_seconds, points, correct_index, answers } = req.body;

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  if (!question_text || !answers || answers.length < 2) {
    return res.status(400).json({ error: 'Question text and at least 2 answers are required' });
  }

  const last = await Question.findOne({ quizId }).sort({ sortOrder: -1 }).lean();
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const questionId = await nextId('questions');
  await Question.create({
    id: questionId,
    quizId,
    questionText: question_text,
    imageUrl: null,
    timerSeconds: timer_seconds || 20,
    points: points || 1000,
    pointsMultiplier: 1.0,
    sortOrder,
    correctIndex: correct_index ?? 0,
  });

  for (let i = 0; i < answers.length; i++) {
    const answerId = await nextId('answers');
    await Answer.create({
      id: answerId,
      questionId,
      sortIndex: i,
      text: answers[i].text || answers[i],
      color: answers[i].color || COLORS[i] || 'red',
    });
  }

  await Quiz.updateOne({ id: quizId }, { $set: { updatedAt: new Date() } });
  res.json({ question: { id: questionId } });
});

router.put('/:id/questions/:qid', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);
  const questionId = Number(req.params.qid);
  const { question_text, timer_seconds, points, correct_index, answers } = req.body;

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const update: any = {};
  if (question_text !== undefined) update.questionText = question_text;
  if (timer_seconds !== undefined) update.timerSeconds = timer_seconds;
  if (points !== undefined) update.points = points;
  if (correct_index !== undefined) update.correctIndex = correct_index;

  if (Object.keys(update).length > 0) {
    await Question.updateOne({ id: questionId, quizId }, { $set: update });
  }

  if (answers && answers.length > 0) {
    await Answer.deleteMany({ questionId });
    for (let i = 0; i < answers.length; i++) {
      const answerId = await nextId('answers');
      await Answer.create({
        id: answerId,
        questionId,
        sortIndex: i,
        text: answers[i].text || answers[i],
        color: answers[i].color || COLORS[i] || 'red',
      });
    }
  }

  await Quiz.updateOne({ id: quizId }, { $set: { updatedAt: new Date() } });
  res.json({ success: true });
});

router.delete('/:id/questions/:qid', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const quizId = Number(req.params.id);
  const questionId = Number(req.params.qid);

  const quiz = await Quiz.findOne({ id: quizId, hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  await Question.deleteOne({ id: questionId, quizId });
  await Answer.deleteMany({ questionId });
  await Quiz.updateOne({ id: quizId }, { $set: { updatedAt: new Date() } });
  res.json({ success: true });
});

export default router;
