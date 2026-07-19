"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
const COLORS = ['red', 'blue', 'yellow', 'green'];
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const tab = req.query.tab || 'recent';
    const folderId = req.query.folderId ? Number(req.query.folderId) : undefined;
    const filter = { hostId };
    if (tab === 'trash') {
        filter.deletedAt = { $ne: null };
    }
    else {
        filter.deletedAt = null;
        if (tab === 'drafts')
            filter.status = 'draft';
        else if (tab === 'favorites')
            filter.isFavorite = true;
        else if (tab === 'shared') {
            return res.json({ quizzes: [] });
        }
    }
    if (folderId)
        filter.folderId = folderId;
    let sort = { updatedAt: -1 };
    const quizzes = await models_1.Quiz.find(filter).sort(sort).lean();
    const result = [];
    for (const q of quizzes) {
        const questionCount = await models_1.Question.countDocuments({ quizId: q.id });
        result.push({ ...q, question_count: questionCount });
    }
    res.json({ quizzes: result });
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const { title, description, status, is_public } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    const id = await (0, models_1.nextId)('quizzes');
    const quiz = await models_1.Quiz.create({
        id,
        hostId,
        title,
        description: description || '',
        status: status || 'draft',
        isPublic: !!is_public,
        category: 'general',
        playCount: 0,
        isFavorite: false,
        folderId: null,
        deletedAt: null,
    });
    res.json({ quiz: { id: quiz.id, title, description } });
});
router.post('/:id/clone', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const sourceId = Number(req.params.id);
    const source = await models_1.Quiz.findOne({ id: sourceId, isPublic: true });
    if (!source) {
        return res.status(404).json({ error: 'Public quiz not found' });
    }
    const newQuizId = await (0, models_1.nextId)('quizzes');
    const newQuiz = await models_1.Quiz.create({
        id: newQuizId,
        hostId,
        title: `${source.title} (copy)`,
        description: source.description,
        isPublic: false,
        category: source.category || 'general',
        status: 'published',
        isFavorite: false,
        folderId: null,
        deletedAt: null,
    });
    const questions = await models_1.Question.find({ quizId: sourceId }).sort({ sortOrder: 1 }).lean();
    for (const q of questions) {
        const questionId = await (0, models_1.nextId)('questions');
        const newQ = await models_1.Question.create({
            id: questionId,
            quizId: newQuizId,
            questionText: q.questionText,
            imageUrl: q.imageUrl,
            timerSeconds: q.timerSeconds,
            points: q.points,
            pointsMultiplier: q.pointsMultiplier,
            sortOrder: q.sortOrder,
            correctIndex: q.correctIndex,
        });
        const answers = await models_1.Answer.find({ questionId: q.id }).sort({ sortIndex: 1 }).lean();
        for (const a of answers) {
            const answerId = await (0, models_1.nextId)('answers');
            await models_1.Answer.create({
                id: answerId,
                questionId,
                sortIndex: a.sortIndex,
                text: a.text,
                color: a.color,
            });
        }
    }
    await models_1.Quiz.updateOne({ id: sourceId }, { $inc: { playCount: 1 } });
    res.json({ quiz: { id: newQuizId, title: `${source.title} (copy)` } });
});
router.post('/:id/restore', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz)
        return res.status(404).json({ error: 'Quiz not found' });
    await models_1.Quiz.updateOne({ id: quizId }, { $set: { deletedAt: null, updatedAt: new Date() } });
    res.json({ success: true });
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const questions = await models_1.Question.find({ quizId }).sort({ sortOrder: 1 }).lean();
    for (const q of questions) {
        q.answers = await models_1.Answer.find({ questionId: q.id }).sort({ sortIndex: 1 }).lean();
    }
    res.json({ quiz: { ...quiz.toObject(), questions } });
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const { title, description, status, is_public, is_favorite, folderId } = req.body;
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const update = { updatedAt: new Date() };
    if (title !== undefined)
        update.title = title;
    if (description !== undefined)
        update.description = description;
    if (status !== undefined)
        update.status = status;
    if (is_public !== undefined)
        update.isPublic = !!is_public;
    if (is_favorite !== undefined)
        update.isFavorite = !!is_favorite;
    if (folderId !== undefined)
        update.folderId = folderId ? Number(folderId) : null;
    await models_1.Quiz.updateOne({ id: quizId }, { $set: update });
    res.json({ success: true });
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const permanent = req.query.permanent === 'true';
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    if (permanent) {
        const qs = await models_1.Question.find({ quizId }).lean();
        for (const q of qs) {
            await models_1.Answer.deleteMany({ questionId: q.id });
        }
        await models_1.Question.deleteMany({ quizId });
        await models_1.Quiz.deleteOne({ id: quizId });
    }
    else {
        await models_1.Quiz.updateOne({ id: quizId }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
    }
    res.json({ success: true });
});
router.post('/:id/questions', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const { question_text, timer_seconds, points, correct_index, answers, questionType } = req.body;
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    if (!question_text || !answers || answers.length < 2) {
        return res.status(400).json({ error: 'Question text and at least 2 answers are required' });
    }
    const last = await models_1.Question.findOne({ quizId }).sort({ sortOrder: -1 }).lean();
    const sortOrder = (last?.sortOrder ?? -1) + 1;
    const questionId = await (0, models_1.nextId)('questions');
    await models_1.Question.create({
        id: questionId,
        quizId,
        questionText: question_text,
        imageUrl: null,
        timerSeconds: timer_seconds || 20,
        points: points || 1000,
        pointsMultiplier: 1.0,
        sortOrder,
        correctIndex: correct_index ?? 0,
        questionType: questionType || 'multiple_choice',
    });
    for (let i = 0; i < answers.length; i++) {
        const answerId = await (0, models_1.nextId)('answers');
        await models_1.Answer.create({
            id: answerId,
            questionId,
            sortIndex: i,
            text: answers[i].text || answers[i],
            color: answers[i].color || COLORS[i] || 'red',
        });
    }
    await models_1.Quiz.updateOne({ id: quizId }, { $set: { updatedAt: new Date() } });
    res.json({ question: { id: questionId } });
});
router.put('/:id/questions/:qid', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const questionId = Number(req.params.qid);
    const { question_text, timer_seconds, points, correct_index, answers, questionType } = req.body;
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    const update = {};
    if (question_text !== undefined)
        update.questionText = question_text;
    if (timer_seconds !== undefined)
        update.timerSeconds = timer_seconds;
    if (points !== undefined)
        update.points = points;
    if (correct_index !== undefined)
        update.correctIndex = correct_index;
    if (questionType !== undefined)
        update.questionType = questionType;
    if (Object.keys(update).length > 0) {
        await models_1.Question.updateOne({ id: questionId, quizId }, { $set: update });
    }
    if (answers && answers.length > 0) {
        await models_1.Answer.deleteMany({ questionId });
        for (let i = 0; i < answers.length; i++) {
            const answerId = await (0, models_1.nextId)('answers');
            await models_1.Answer.create({
                id: answerId,
                questionId,
                sortIndex: i,
                text: answers[i].text || answers[i],
                color: answers[i].color || COLORS[i] || 'red',
            });
        }
    }
    await models_1.Quiz.updateOne({ id: quizId }, { $set: { updatedAt: new Date() } });
    res.json({ success: true });
});
router.delete('/:id/questions/:qid', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const quizId = Number(req.params.id);
    const questionId = Number(req.params.qid);
    const quiz = await models_1.Quiz.findOne({ id: quizId, hostId });
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    await models_1.Question.deleteOne({ id: questionId, quizId });
    await models_1.Answer.deleteMany({ questionId });
    await models_1.Quiz.updateOne({ id: quizId }, { $set: { updatedAt: new Date() } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=quizzes.js.map