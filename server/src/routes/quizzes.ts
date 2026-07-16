import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from './auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizzes = db.prepare(`
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    WHERE q.host_id = ?
    GROUP BY q.id
    ORDER BY q.updated_at DESC
  `).all(hostId);
  res.json({ quizzes });
});

router.post('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare('INSERT INTO quizzes (host_id, title, description) VALUES (?, ?, ?)').run(hostId, title, description || '');
  res.json({ quiz: { id: result.lastInsertRowid, title, description } });
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizId = req.params.id;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId) as any;
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(quizId) as any[];

  for (const q of questions) {
    q.answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY sort_index').all(q.id);
  }

  res.json({ quiz: { ...quiz, questions } });
});

router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizId = req.params.id;
  const { title, description } = req.body;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare('UPDATE quizzes SET title = COALESCE(?, title), description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title, description, quizId);

  res.json({ success: true });
});

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizId = req.params.id;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);
  res.json({ success: true });
});

router.post('/:id/questions', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizId = req.params.id;
  const { question_text, timer_seconds, points, correct_index, answers } = req.body;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  if (!question_text || !answers || answers.length < 2) {
    return res.status(400).json({ error: 'Question text and at least 2 answers are required' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM questions WHERE quiz_id = ?').get(quizId) as any;
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO questions (quiz_id, question_text, timer_seconds, points, sort_order, correct_index) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(quizId, question_text, timer_seconds || 20, points || 1000, sortOrder, correct_index ?? 0);

  const questionId = result.lastInsertRowid;
  const colors = ['red', 'blue', 'yellow', 'green'];

  const insertAnswer = db.prepare('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)');
  for (let i = 0; i < answers.length; i++) {
    insertAnswer.run(questionId, i, answers[i].text || answers[i], answers[i].color || colors[i]);
  }

  res.json({ question: { id: questionId } });
});

router.put('/:id/questions/:qid', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizId = req.params.id;
  const questionId = req.params.qid;
  const { question_text, timer_seconds, points, correct_index, answers } = req.body;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare(
    'UPDATE questions SET question_text = COALESCE(?, question_text), timer_seconds = COALESCE(?, timer_seconds), points = COALESCE(?, points), correct_index = COALESCE(?, correct_index) WHERE id = ? AND quiz_id = ?'
  ).run(question_text, timer_seconds, points, correct_index, questionId, quizId);

  if (answers && answers.length > 0) {
    db.prepare('DELETE FROM answers WHERE question_id = ?').run(questionId);
    const colors = ['red', 'blue', 'yellow', 'green'];
    const insertAnswer = db.prepare('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < answers.length; i++) {
      insertAnswer.run(questionId, i, answers[i].text || answers[i], answers[i].color || colors[i]);
    }
  }

  res.json({ success: true });
});

router.delete('/:id/questions/:qid', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const quizId = req.params.id;
  const questionId = req.params.qid;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare('DELETE FROM questions WHERE id = ? AND quiz_id = ?').run(questionId, quizId);
  res.json({ success: true });
});

export default router;
