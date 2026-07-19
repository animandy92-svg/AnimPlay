import { Router, Request, Response } from 'express';
import { Folder, Quiz, nextId } from '../models';
import { authenticateToken } from './auth';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const folders = await Folder.find({ hostId }).sort({ name: 1 }).lean();
  res.json({ folders });
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const id = await nextId('folders');
  await Folder.create({ id, hostId, name: name.trim() });
  res.json({ folder: { id, name: name.trim() } });
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const folderId = Number(req.params.id);

  const folder = await Folder.findOne({ id: folderId, hostId });
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  await Folder.deleteOne({ id: folderId });
  await Quiz.updateMany({ folderId }, { $set: { folderId: null } });
  res.json({ success: true });
});

export default router;
