import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Group, GroupMember, nextId } from '../models';
import { authenticateToken } from './auth';

const router = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const tab = (req.query.tab as string) || 'joined';

  if (tab === 'owned') {
    const groups = await Group.find({ ownerId: hostId }).sort({ createdAt: -1 }).lean();
    const result = [];
    for (const g of groups) {
      const memberCount = await GroupMember.countDocuments({ groupId: g.id });
      result.push({ ...g, member_count: memberCount });
    }
    return res.json({ groups: result });
  }

  const memberships = await GroupMember.find({ hostId, groupId: { $exists: true } }).lean();
  const groupIds = memberships.map((m) => m.groupId);
  const groups = await Group.find({ id: { $in: groupIds }, ownerId: { $ne: hostId } }).lean();

  const result = [];
  for (const g of groups) {
    const member = memberships.find((m) => m.groupId === g.id);
    const memberCount = await GroupMember.countDocuments({ groupId: g.id });
    result.push({ ...g, role: member?.role, member_count: memberCount });
  }

  res.json({ groups: result });
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const { name, description } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await Group.findOne({ inviteCode });
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const id = await nextId('groups');
  const group = await Group.create({
    id,
    ownerId: hostId,
    name: name.trim(),
    description: description || '',
    inviteCode,
  });

  const memberId = await nextId('group_members');
  await GroupMember.create({ id: memberId, groupId: id, hostId, role: 'owner' });

  res.json({ group: { id, name: name.trim(), description, invite_code: inviteCode } });
});

router.post('/join', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) {
    return res.status(404).json({ error: 'Invalid invite code' });
  }

  const existing = await GroupMember.findOne({ groupId: group.id, hostId });
  if (existing) {
    return res.status(400).json({ error: 'Already a member of this group' });
  }

  const memberId = await nextId('group_members');
  await GroupMember.create({ id: memberId, groupId: group.id, hostId, role: 'member' });
  res.json({ group });
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const hostId = (req as any).hostId;
  const groupId = Number(req.params.id);

  const group = await Group.findOne({ id: groupId, ownerId: hostId });
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  await Group.deleteOne({ id: groupId });
  await GroupMember.deleteMany({ groupId });
  res.json({ success: true });
});

export default router;
