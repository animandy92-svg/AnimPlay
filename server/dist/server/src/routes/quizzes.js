"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const tab = req.query.tab || 'recent';
    const folderId = req.query.folderId;
    let query = `
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    WHERE q.host_id = ?
  `;
    const params = [hostId];
    if (tab === 'trash') {
        query += ' AND q.deleted_at IS NOT NULL';
    }
    else {
        query += ' AND q.deleted_at IS NULL';
        if (tab === 'drafts')
            query += " AND q.status = 'draft'";
        else if (tab === 'favorites')
            query += ' AND q.is_favorite = 1';
        else if (tab === 'shared') {
            return res.json({ quizzes: [] });
        }
    }
    if (folderId) {
        query += ' AND q.id IN (SELECT quiz_id FROM quiz_folders WHERE folder_id = ?)';
        params.push(folderId);
    }
    query += ' GROUP BY q.id ORDER BY q.updated_at DESC';
    const quizzes = db.prepare(query).all(...params);
    res.json({ quizzes });
});
router.post('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const { title, description, status, is_public } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    const result = db.prepare('INSERT INTO quizzes (host_id, title, description, status, is_public) VALUES (?, ?, ?, ?, ?)').run(hostId, title, description || '', status || 'draft', is_public ? 1 : 0);
    res.json({ quiz: { id: result.lastInsertRowid, title, description } });
});
router.post('/:id/clone', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const sourceId = req.params.id;
    const source = db.prepare('SELECT * FROM quizzes WHERE id = ? AND is_public = 1').get(sourceId);
    if (!source) {
        return res.status(404).json({ error: 'Public quiz not found' });
    }
    const result = db.prepare('INSERT INTO quizzes (host_id, title, description, is_public, category, status) VALUES (?, ?, ?, 0, ?, ?)').run(hostId, `${source.title} (copy)`, source.description, source.category || 'general', 'published');
    const newQuizId = result.lastInsertRowid;
    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(sourceId);
    for (const q of questions) {
        const qResult = db.prepare('INSERT INTO questions (quiz_id, question_text, timer_seconds, points, sort_order, correct_index) VALUES (?, ?, ?, ?, ?, ?)').run(newQuizId, q.question_text, q.timer_seconds, q.points, q.sort_order, q.correct_index);
        const answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY sort_index').all(q.id);
        const insertA = db.prepare('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)');
        for (const a of answers) {
            insertA.run(qResult.lastInsertRowid, a.sort_index, a.text, a.color);
        }
    }
    db.prepare('UPDATE quizzes SET play_count = play_count + 1 WHERE id = ?').run(sourceId);
    res.json({ quiz: { id: newQuizId, title: `${source.title} (copy)` } });
});
router.post('/:id/restore', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz)
        return res.status(404).json({ error: 'Quiz not found' });
    db.prepare('UPDATE quizzes SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quizId);
    res.json({ success: true });
});
router.get('/:id', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(quizId);
    for (const q of questions) {
        q.answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY sort_index').all(q.id);
    }
    res.json({ quiz: { ...quiz, questions } });
});
router.put('/:id', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const { title, description, status, is_public, is_favorite, folderId } = req.body;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    db.prepare(`
    UPDATE quizzes SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      is_public = COALESCE(?, is_public),
      is_favorite = COALESCE(?, is_favorite),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, status, is_public !== undefined ? (is_public ? 1 : 0) : null, is_favorite !== undefined ? (is_favorite ? 1 : 0) : null, quizId);
    if (folderId !== undefined) {
        db.prepare('DELETE FROM quiz_folders WHERE quiz_id = ?').run(quizId);
        if (folderId) {
            db.prepare('INSERT INTO quiz_folders (quiz_id, folder_id) VALUES (?, ?)').run(quizId, folderId);
        }
    }
    res.json({ success: true });
});
router.delete('/:id', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const permanent = req.query.permanent === 'true';
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    if (permanent) {
        db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);
    }
    else {
        db.prepare('UPDATE quizzes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(quizId);
    }
    res.json({ success: true });
});
router.post('/:id/questions', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const { question_text, timer_seconds, points, correct_index, answers } = req.body;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    if (!question_text || !answers || answers.length < 2) {
        return res.status(400).json({ error: 'Question text and at least 2 answers are required' });
    }
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM questions WHERE quiz_id = ?').get(quizId);
    const sortOrder = (maxOrder?.max_order ?? -1) + 1;
    const result = db.prepare('INSERT INTO questions (quiz_id, question_text, timer_seconds, points, sort_order, correct_index) VALUES (?, ?, ?, ?, ?, ?)').run(quizId, question_text, timer_seconds || 20, points || 1000, sortOrder, correct_index ?? 0);
    const questionId = result.lastInsertRowid;
    const colors = ['red', 'blue', 'yellow', 'green'];
    const insertAnswer = db.prepare('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < answers.length; i++) {
        insertAnswer.run(questionId, i, answers[i].text || answers[i], answers[i].color || colors[i]);
    }
    db.prepare('UPDATE quizzes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quizId);
    res.json({ question: { id: questionId } });
});
router.put('/:id/questions/:qid', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const questionId = req.params.qid;
    const { question_text, timer_seconds, points, correct_index, answers } = req.body;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    db.prepare('UPDATE questions SET question_text = COALESCE(?, question_text), timer_seconds = COALESCE(?, timer_seconds), points = COALESCE(?, points), correct_index = COALESCE(?, correct_index) WHERE id = ? AND quiz_id = ?').run(question_text, timer_seconds, points, correct_index, questionId, quizId);
    if (answers && answers.length > 0) {
        db.prepare('DELETE FROM answers WHERE question_id = ?').run(questionId);
        const colors = ['red', 'blue', 'yellow', 'green'];
        const insertAnswer = db.prepare('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)');
        for (let i = 0; i < answers.length; i++) {
            insertAnswer.run(questionId, i, answers[i].text || answers[i], answers[i].color || colors[i]);
        }
    }
    db.prepare('UPDATE quizzes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quizId);
    res.json({ success: true });
});
router.delete('/:id/questions/:qid', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const quizId = req.params.id;
    const questionId = req.params.qid;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    db.prepare('DELETE FROM questions WHERE id = ? AND quiz_id = ?').run(questionId, quizId);
    db.prepare('UPDATE quizzes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quizId);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=quizzes.js.map