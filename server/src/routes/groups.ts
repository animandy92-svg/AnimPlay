import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { getDb } from '../db';
import { authenticateToken } from './auth';

const router = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const tab = (req.query.tab as string) || 'joined';

  if (tab === 'owned') {
    const groups = db.prepare(`
      SELECT g.*, (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count
      FROM groups g
      WHERE g.owner_id = ?
      ORDER BY g.created_at DESC
    `).all(hostId);
    return res.json({ groups });
  }

  const groups = db.prepare(`
    SELECT g.*, gm.role,
           (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.host_id = ? AND g.owner_id != ?
    ORDER BY gm.joined_at DESC
  `).all(hostId, hostId);

  res.json({ groups });
});

router.post('/', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const { name, description } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = db.prepare('SELECT id FROM groups WHERE invite_code = ?').get(inviteCode);
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const result = db.prepare(
    'INSERT INTO groups (owner_id, name, description, invite_code) VALUES (?, ?, ?, ?)'
  ).run(hostId, name.trim(), description || '', inviteCode);

  const groupId = result.lastInsertRowid;
  db.prepare('INSERT INTO group_members (group_id, host_id, role) VALUES (?, ?, ?)').run(groupId, hostId, 'owner');

  res.json({ group: { id: groupId, name, description, invite_code: inviteCode } });
});

router.post('/join', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  const group = db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(inviteCode.toUpperCase()) as any;
  if (!group) {
    return res.status(404).json({ error: 'Invalid invite code' });
  }

  const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND host_id = ?').get(group.id, hostId);
  if (existing) {
    return res.status(400).json({ error: 'Already a member of this group' });
  }

  db.prepare('INSERT INTO group_members (group_id, host_id, role) VALUES (?, ?, ?)').run(group.id, hostId, 'member');
  res.json({ group });
});

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const db = getDb();
  const hostId = (req as any).hostId;
  const groupId = req.params.id;

  const group = db.prepare('SELECT * FROM groups WHERE id = ? AND owner_id = ?').get(groupId, hostId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
  res.json({ success: true });
});

export default router;
