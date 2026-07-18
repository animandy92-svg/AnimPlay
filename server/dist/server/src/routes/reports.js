"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const reports = db.prepare(`
    SELECT g.id, g.game_pin, g.started_at, g.ended_at, g.created_at,
           q.title as quiz_title,
           (SELECT COUNT(*) FROM game_results gr WHERE gr.game_id = g.id) as player_count,
           (SELECT MAX(score) FROM game_results gr WHERE gr.game_id = g.id) as top_score
    FROM games g
    JOIN quizzes q ON q.id = g.quiz_id
    WHERE g.host_id = ? AND g.status = 'finished'
    ORDER BY g.ended_at DESC
  `).all(hostId);
    res.json({ reports });
});
router.get('/:gameId', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const gameId = req.params.gameId;
    const game = db.prepare(`
    SELECT g.*, q.title as quiz_title
    FROM games g
    JOIN quizzes q ON q.id = g.quiz_id
    WHERE g.id = ? AND g.host_id = ? AND g.status = 'finished'
  `).get(gameId, hostId);
    if (!game) {
        return res.status(404).json({ error: 'Report not found' });
    }
    const results = db.prepare('SELECT * FROM game_results WHERE game_id = ? ORDER BY rank').all(gameId);
    res.json({ game, results });
});
exports.default = router;
//# sourceMappingURL=reports.js.map