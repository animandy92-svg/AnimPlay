"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("./auth");
const pin_1 = require("../utils/pin");
const router = (0, express_1.Router)();
router.post('/start', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const { quizId } = req.body;
    if (!quizId) {
        return res.status(400).json({ error: 'quizId is required' });
    }
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND host_id = ?').get(quizId, hostId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?').get(quizId);
    if (questionCount.count === 0) {
        return res.status(400).json({ error: 'Quiz has no questions' });
    }
    let gamePin = (0, pin_1.generateGamePin)();
    let attempts = 0;
    while (attempts < 10) {
        const existing = db.prepare('SELECT id FROM games WHERE game_pin = ? AND status != ?').get(gamePin, 'finished');
        if (!existing)
            break;
        gamePin = (0, pin_1.generateGamePin)();
        attempts++;
    }
    const result = db.prepare('INSERT INTO games (game_pin, quiz_id, host_id, status) VALUES (?, ?, ?, ?)').run(gamePin, quizId, hostId, 'lobby');
    res.json({ gameId: result.lastInsertRowid, gamePin });
});
router.get('/:pin', (req, res) => {
    const db = (0, db_1.getDb)();
    const pin = req.params.pin;
    const game = db.prepare(`
    SELECT g.*, q.title as quiz_title
    FROM games g
    JOIN quizzes q ON q.id = g.quiz_id
    WHERE g.game_pin = ?
  `).get(pin);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ game });
});
router.get('/:pin/results', (req, res) => {
    const db = (0, db_1.getDb)();
    const pin = req.params.pin;
    const game = db.prepare('SELECT id FROM games WHERE game_pin = ?').get(pin);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    const results = db.prepare('SELECT * FROM game_results WHERE game_id = ? ORDER BY rank').all(game.id);
    res.json({ results });
});
exports.default = router;
//# sourceMappingURL=games.js.map