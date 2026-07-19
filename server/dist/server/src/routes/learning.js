"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/assignments', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const tab = req.query.tab || 'todo';
    const now = new Date();
    const memberships = await models_1.GroupMember.find({ hostId }).lean();
    const groupIds = memberships.map((m) => m.groupId);
    const assignments = await models_1.Assignment.find({ groupId: { $in: groupIds } }).lean();
    const result = [];
    for (const a of assignments) {
        const quiz = await models_1.Quiz.findOne({ id: a.quizId }).lean();
        const group = await models_1.Group.findOne({ id: a.groupId }).lean();
        const completion = await models_1.AssignmentCompletion.findOne({ assignmentId: a.id, hostId }).lean();
        const isCompleted = !!completion;
        if (tab === 'completed' && !isCompleted)
            continue;
        if (tab === 'todo' && (isCompleted || (a.dueDate && a.dueDate < now)))
            continue;
        if (tab === 'expired' && (isCompleted || !(a.dueDate && a.dueDate < now)))
            continue;
        result.push({
            ...a,
            quiz_title: quiz?.title,
            group_name: group?.name,
            is_completed: isCompleted,
        });
    }
    res.json({ assignments: result });
});
router.post('/assignments/:id/complete', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const assignmentId = Number(req.params.id);
    const { score = 0 } = req.body;
    const assignment = await models_1.Assignment.findOne({ id: assignmentId });
    if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
    }
    const membership = await models_1.GroupMember.findOne({ groupId: assignment.groupId, hostId });
    if (!membership) {
        return res.status(404).json({ error: 'Assignment not found' });
    }
    const existing = await models_1.AssignmentCompletion.findOne({ assignmentId, hostId });
    if (existing) {
        await models_1.AssignmentCompletion.updateOne({ assignmentId, hostId }, { $set: { completedAt: new Date(), score } });
    }
    else {
        const id = await (0, models_1.nextId)('assignment_completions');
        await models_1.AssignmentCompletion.create({
            id,
            assignmentId,
            hostId,
            completedAt: new Date(),
            score,
        });
    }
    res.json({ success: true });
});
router.post('/groups/:groupId/assignments', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const groupId = Number(req.params.groupId);
    const { quizId, title, dueDate } = req.body;
    const group = await models_1.Group.findOne({ id: groupId, ownerId: hostId });
    if (!group) {
        return res.status(403).json({ error: 'Only group owners can assign quizzes' });
    }
    const quiz = await models_1.Quiz.findOne({ id: Number(quizId), hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const id = await (0, models_1.nextId)('assignments');
    const assignment = await models_1.Assignment.create({
        id,
        groupId,
        quizId: Number(quizId),
        title: title || quiz.title,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: hostId,
    });
    res.json({ assignment: { id } });
});
exports.default = router;
//# sourceMappingURL=learning.js.map