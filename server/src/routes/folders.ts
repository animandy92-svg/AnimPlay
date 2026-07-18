import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authenticateToken } from './auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const folders = db.prepare('SELECT * FROM folders WHERE host_id = ? ORDER BY name').all(hostId);
  res.json({ folders });
});

router.post('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const result = db.prepare('INSERT INTO folders (host_id, name) VALUES (?, ?)').run(hostId, name.trim());
  res.json({ folder: { id: result.lastInsertRowid, name: name.trim() } });
});

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const folderId = req.params.id;

  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND host_id = ?').get(folderId, hostId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  db.prepare('DELETE FROM quiz_folders WHERE folder_id = ?').run(folderId);
  db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
  res.json({ success: true });
});

export default router;
