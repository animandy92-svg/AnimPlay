"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const CATEGORIES = ['general', 'trivia', 'science', 'sports', 'language', 'food', 'animals'];
router.get('/categories', (_req, res) => {
    res.json({ categories: CATEGORIES });
});
router.get('/quizzes', (req, res) => {
    const db = (0, db_1.getDb)();
    const { search = '', category = '', sort = 'popular' } = req.query;
    let query = `
    SELECT q.*, h.username as creator_name, COUNT(qu.id) as question_count
    FROM quizzes q
    JOIN hosts h ON h.id = q.host_id
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    WHERE q.is_public = 1 AND q.status = 'published' AND q.deleted_at IS NULL
  `;
    const params = [];
    if (search) {
        query += ' AND (q.title LIKE ? OR q.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
        query += ' AND q.category = ?';
        params.push(category);
    }
    query += ' GROUP BY q.id';
    query += sort === 'newest' ? ' ORDER BY q.created_at DESC' : ' ORDER BY q.play_count DESC';
    const quizzes = db.prepare(query).all(...params);
    res.json({ quizzes });
});
router.post('/:quizId/play', (req, res) => {
    const db = (0, db_1.getDb)();
    const quizId = req.params.quizId;
    const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ? AND is_public = 1').get(quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    db.prepare('UPDATE quizzes SET play_count = play_count + 1 WHERE id = ?').run(quizId);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=discover.js.map