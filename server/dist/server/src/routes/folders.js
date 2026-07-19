"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const folders = await models_1.Folder.find({ hostId }).sort({ name: 1 }).lean();
    res.json({ folders });
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const { name } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
    }
    const id = await (0, models_1.nextId)('folders');
    await models_1.Folder.create({ id, hostId, name: name.trim() });
    res.json({ folder: { id, name: name.trim() } });
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const hostId = req.hostId;
    const folderId = Number(req.params.id);
    const folder = await models_1.Folder.findOne({ id: folderId, hostId });
    if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
    }
    await models_1.Folder.deleteOne({ id: folderId });
    await models_1.Quiz.updateMany({ folderId }, { $set: { folderId: null } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=folders.js.map