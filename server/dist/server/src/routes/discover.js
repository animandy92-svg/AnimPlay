"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const router = (0, express_1.Router)();
const CATEGORIES = ['general', 'trivia', 'science', 'sports', 'language', 'food', 'animals'];
router.get('/categories', (_req, res) => {
    res.json({ categories: CATEGORIES });
});
router.get('/quizzes', async (req, res) => {
    const { search = '', category = '', sort = 'popular' } = req.query;
    const filter = {
        isPublic: true,
        status: 'published',
        deletedAt: null,
    };
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }
    if (category && category !== 'all') {
        filter.category = category;
    }
    let sortOption = { playCount: -1 };
    if (sort === 'newest')
        sortOption = { createdAt: -1 };
    const quizzes = await models_1.Quiz.find(filter).sort(sortOption).lean();
    const result = [];
    for (const q of quizzes) {
        const host = await models_1.Host.findOne({ id: q.hostId }, { username: 1 }).lean();
        const questionCount = await models_1.Question.countDocuments({ quizId: q.id });
        result.push({ ...q, creator_name: host?.username || '', question_count: questionCount });
    }
    res.json({ quizzes: result });
});
router.post('/:quizId/play', async (req, res) => {
    const quizId = Number(req.params.quizId);
    const quiz = await models_1.Quiz.findOne({ id: quizId, isPublic: true });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    await models_1.Quiz.updateOne({ id: quizId }, { $inc: { playCount: 1 } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=discover.js.map