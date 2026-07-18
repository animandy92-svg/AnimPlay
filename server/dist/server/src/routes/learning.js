"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/assignments', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const tab = req.query.tab || 'todo';
    const now = new Date().toISOString();
    let query = `
    SELECT a.*, q.title as quiz_title, g.name as group_name,
           ac.completed_at IS NOT NULL as is_completed
    FROM assignments a
    JOIN quizzes q ON q.id = a.quiz_id
    JOIN groups g ON g.id = a.group_id
    JOIN group_members gm ON gm.group_id = g.id AND gm.host_id = ?
    LEFT JOIN assignment_completions ac ON ac.assignment_id = a.id AND ac.host_id = ?
    WHERE 1=1
  `;
    if (tab === 'completed') {
        query += ' AND ac.completed_at IS NOT NULL';
    }
    else if (tab === 'expired') {
        query += ' AND ac.completed_at IS NULL AND a.due_date IS NOT NULL AND a.due_date < ?';
    }
    else {
        query += ' AND ac.completed_at IS NULL AND (a.due_date IS NULL OR a.due_date >= ?)';
    }
    query += ' ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC';
    const params = tab === 'expired'
        ? [hostId, hostId, now]
        : tab === 'todo'
            ? [hostId, hostId, now]
            : [hostId, hostId];
    const assignments = db.prepare(query).all(...params);
    res.json({ assignments });
});
router.post('/assignments/:id/complete', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const assignmentId = req.params.id;
    const { score = 0 } = req.body;
    const assignment = db.prepare(`
    SELECT a.* FROM assignments a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = ? AND gm.host_id = ?
  `).get(assignmentId, hostId);
    if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
    }
    db.prepare(`
    INSERT INTO assignment_completions (assignment_id, host_id, score)
    VALUES (?, ?, ?)
    ON CONFLICT(assignment_id, host_id) DO UPDATE SET completed_at = CURRENT_TIMESTAMP, score = ?
  `).run(assignmentId, hostId, score, score);
    res.json({ success: true });
});
router.post('/groups/:groupId/assignments', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const groupId = req.params.groupId;
    const { quizId, title, dueDate } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ? AND owner_id = ?').get(groupId, hostId);
    if (!group) {
        return res.status(403).json({ error: 'Only group owners can assign quizzes' });
    }
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const result = db.prepare('INSERT INTO assignments (group_id, quiz_id, title, due_date, created_by) VALUES (?, ?, ?, ?, ?)').run(groupId, quizId, title || quiz.title, dueDate || null, hostId);
    res.json({ assignment: { id: result.lastInsertRowid } });
});
exports.default = router;
//# sourceMappingURL=learning.js.map