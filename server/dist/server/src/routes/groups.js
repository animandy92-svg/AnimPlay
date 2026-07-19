"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const models_1 = require("../models");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
function generateInviteCode() {
    return (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
}
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const tab = req.query.tab || 'joined';
    if (tab === 'owned') {
        const groups = await models_1.Group.find({ ownerId: hostId }).sort({ createdAt: -1 }).lean();
        const result = [];
        for (const g of groups) {
            const memberCount = await models_1.GroupMember.countDocuments({ groupId: g.id });
            result.push({ ...g, member_count: memberCount });
        }
        return res.json({ groups: result });
    }
    const memberships = await models_1.GroupMember.find({ hostId, groupId: { $exists: true } }).lean();
    const groupIds = memberships.map((m) => m.groupId);
    const groups = await models_1.Group.find({ id: { $in: groupIds }, ownerId: { $ne: hostId } }).lean();
    const result = [];
    for (const g of groups) {
        const member = memberships.find((m) => m.groupId === g.id);
        const memberCount = await models_1.GroupMember.countDocuments({ groupId: g.id });
        result.push({ ...g, role: member?.role, member_count: memberCount });
    }
    res.json({ groups: result });
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const { name, description } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
    }
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
        const existing = await models_1.Group.findOne({ inviteCode });
        if (!existing)
            break;
        inviteCode = generateInviteCode();
        attempts++;
    }
    const id = await (0, models_1.nextId)('groups');
    const group = await models_1.Group.create({
        id,
        ownerId: hostId,
        name: name.trim(),
        description: description || '',
        inviteCode,
    });
    const memberId = await (0, models_1.nextId)('group_members');
    await models_1.GroupMember.create({ id: memberId, groupId: id, hostId, role: 'owner' });
    res.json({ group: { id, name: name.trim(), description, invite_code: inviteCode } });
});
router.post('/join', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const { inviteCode } = req.body;
    if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code is required' });
    }
    const group = await models_1.Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) {
        return res.status(404).json({ error: 'Invalid invite code' });
    }
    const existing = await models_1.GroupMember.findOne({ groupId: group.id, hostId });
    if (existing) {
        return res.status(400).json({ error: 'Already a member of this group' });
    }
    const memberId = await (0, models_1.nextId)('group_members');
    await models_1.GroupMember.create({ id: memberId, groupId: group.id, hostId, role: 'member' });
    res.json({ group });
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const groupId = Number(req.params.id);
    const group = await models_1.Group.findOne({ id: groupId, ownerId: hostId });
    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }
    await models_1.Group.deleteOne({ id: groupId });
    await models_1.GroupMember.deleteMany({ groupId });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=groups.js.map