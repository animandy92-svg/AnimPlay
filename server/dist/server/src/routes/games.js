"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("./auth");
const pin_1 = require("../utils/pin");
const router = (0, express_1.Router)();
router.post('/start', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const { quizId, gameMode } = req.body;
    if (!quizId) {
        return res.status(400).json({ error: 'quizId is required' });
    }
    const quiz = await models_1.Quiz.findOne({ id: Number(quizId), hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const questionCount = await models_1.Question.countDocuments({ quizId: Number(quizId) });
    if (questionCount === 0) {
        return res.status(400).json({ error: 'Quiz has no questions' });
    }
    let gamePin = (0, pin_1.generateGamePin)();
    let attempts = 0;
    while (attempts < 10) {
        const existing = await models_1.Game.findOne({ gamePin, status: { $ne: 'finished' } });
        if (!existing)
            break;
        gamePin = (0, pin_1.generateGamePin)();
        attempts++;
    }
    const id = await (0, models_1.nextId)('games');
    const game = await models_1.Game.create({
        id,
        gamePin,
        quizId: Number(quizId),
        hostId,
        status: 'lobby',
        currentQuestion: 0,
        startedAt: null,
        endedAt: null,
    });
    res.json({ gameId: id, gamePin, gameMode: gameMode || 'classic' });
});
router.get('/:pin', async (req, res) => {
    const pin = req.params.pin;
    const game = await models_1.Game.findOne({ gamePin: pin }).lean();
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    const quiz = await models_1.Quiz.findOne({ id: game.quizId }).lean();
    res.json({ game: { ...game, quiz_title: quiz?.title } });
});
router.get('/:pin/results', async (req, res) => {
    const pin = req.params.pin;
    const game = await models_1.Game.findOne({ gamePin: pin }).lean();
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    const results = await models_1.GameResult.find({ gameId: game.id }).sort({ rank: 1 }).lean();
    res.json({ results });
});
exports.default = router;
//# sourceMappingURL=games.js.map