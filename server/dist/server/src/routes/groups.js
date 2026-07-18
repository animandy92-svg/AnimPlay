"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
function generateInviteCode() {
    return (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
}
router.get('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const tab = req.query.tab || 'joined';
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
router.post('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const { name, description } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
    }
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
        const existing = db.prepare('SELECT id FROM groups WHERE invite_code = ?').get(inviteCode);
        if (!existing)
            break;
        inviteCode = generateInviteCode();
        attempts++;
    }
    const result = db.prepare('INSERT INTO groups (owner_id, name, description, invite_code) VALUES (?, ?, ?, ?)').run(hostId, name.trim(), description || '', inviteCode);
    const groupId = result.lastInsertRowid;
    db.prepare('INSERT INTO group_members (group_id, host_id, role) VALUES (?, ?, ?)').run(groupId, hostId, 'owner');
    res.json({ group: { id: groupId, name, description, invite_code: inviteCode } });
});
router.post('/join', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const { inviteCode } = req.body;
    if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code is required' });
    }
    const group = db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(inviteCode.toUpperCase());
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
router.delete('/:id', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const groupId = req.params.id;
    const group = db.prepare('SELECT * FROM groups WHERE id = ? AND owner_id = ?').get(groupId, hostId);
    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=groups.js.map