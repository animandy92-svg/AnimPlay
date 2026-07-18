"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const folders = db.prepare('SELECT * FROM folders WHERE host_id = ? ORDER BY name').all(hostId);
    res.json({ folders });
});
router.post('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const { name } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
    }
    const result = db.prepare('INSERT INTO folders (host_id, name) VALUES (?, ?)').run(hostId, name.trim());
    res.json({ folder: { id: result.lastInsertRowid, name: name.trim() } });
});
router.delete('/:id', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const hostId = req.hostId;
    const folderId = req.params.id;
    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND host_id = ?').get(folderId, hostId);
    if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
    }
    db.prepare('DELETE FROM quiz_folders WHERE folder_id = ?').run(folderId);
    db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=folders.js.map