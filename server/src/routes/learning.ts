import { Router, Request, Response } from 'express';
import {
  Assignment,
  AssignmentCompletion,
  Group,
  GroupMember,
  Quiz,
  nextId,
} from '../models';
import { authenticateToken } from './auth';

const router = Router();

router.get('/assignments', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const tab = (req.query.tab as string) || 'todo';
  const now = new Date();

  const memberships = await GroupMember.find({ hostId }).lean();
  const groupIds = memberships.map((m) => m.groupId);

  const assignments = await Assignment.find({ groupId: { $in: groupIds } }).lean();

  const result = [];
  for (const a of assignments) {
    const quiz = await Quiz.findOne({ id: a.quizId }).lean();
    const group = await Group.findOne({ id: a.groupId }).lean();
    const completion = await AssignmentCompletion.findOne({ assignmentId: a.id, hostId }).lean();
    const isCompleted = !!completion;

    if (tab === 'completed' && !isCompleted) continue;
    if (tab === 'todo' && (isCompleted || (a.dueDate && a.dueDate < now))) continue;
    if (tab === 'expired' && (isCompleted || !(a.dueDate && a.dueDate < now))) continue;

    result.push({
      ...a,
      quiz_title: quiz?.title,
      group_name: group?.name,
      is_completed: isCompleted,
    });
  }

  res.json({ assignments: result });
});

router.post('/assignments/:id/complete', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const assignmentId = Number(req.params.id);
  const { score = 0 } = req.body;

  const assignment = await Assignment.findOne({ id: assignmentId });
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const membership = await GroupMember.findOne({ groupId: assignment.groupId, hostId });
  if (!membership) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const existing = await AssignmentCompletion.findOne({ assignmentId, hostId });
  if (existing) {
    await AssignmentCompletion.updateOne(
      { assignmentId, hostId },
      { $set: { completedAt: new Date(), score } }
    );
  } else {
    const id = await nextId('assignment_completions');
    await AssignmentCompletion.create({
      id,
      assignmentId,
      hostId,
      completedAt: new Date(),
      score,
    });
  }

  res.json({ success: true });
});

router.post('/groups/:groupId/assignments', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const groupId = Number(req.params.groupId);
  const { quizId, title, dueDate } = req.body;

  const group = await Group.findOne({ id: groupId, ownerId: hostId });
  if (!group) {
    return res.status(403).json({ error: 'Only group owners can assign quizzes' });
  }

  const quiz = await Quiz.findOne({ id: Number(quizId), hostId });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const id = await nextId('assignments');
  const assignment = await Assignment.create({
    id,
    groupId,
    quizId: Number(quizId),
    title: title || quiz.title,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdBy: hostId,
  });

  res.json({ assignment: { id } });
});

export default router;
