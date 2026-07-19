"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const games = await models_1.Game.find({ hostId, status: 'finished' }).sort({ endedAt: -1 }).lean();
    const reports = [];
    for (const g of games) {
        const quiz = await models_1.Quiz.findOne({ id: g.quizId }).lean();
        const playerCount = await models_1.GameResult.countDocuments({ gameId: g.id });
        const top = await models_1.GameResult.findOne({ gameId: g.id }).sort({ score: -1 }).lean();
        reports.push({
            id: g.id,
            game_pin: g.gamePin,
            started_at: g.startedAt,
            ended_at: g.endedAt,
            created_at: g.created_at,
            quiz_title: quiz?.title,
            player_count: playerCount,
            top_score: top?.score ?? 0,
        });
    }
    res.json({ reports });
});
router.get('/:gameId', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const gameId = Number(req.params.gameId);
    const game = await models_1.Game.findOne({ id: gameId, hostId, status: 'finished' }).lean();
    if (!game) {
        return res.status(404).json({ error: 'Report not found' });
    }
    const quiz = await models_1.Quiz.findOne({ id: game.quizId }).lean();
    const results = await models_1.GameResult.find({ gameId }).sort({ rank: 1 }).lean();
    res.json({
        game: { ...game, quiz_title: quiz?.title },
        results,
    });
});
exports.default = router;
//# sourceMappingURL=reports.js.map