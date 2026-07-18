"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'animplay-secret-key-change-in-production';
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        const db = (0, db_1.getDb)();
        const existing = db.prepare('SELECT id FROM hosts WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = db.prepare('INSERT INTO hosts (username, email, password) VALUES (?, ?, ?)').run(username, email, hashedPassword);
        const token = jsonwebtoken_1.default.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, host: { id: result.lastInsertRowid, username, email } });
    }
    catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        if (!login || !password) {
            return res.status(400).json({ error: 'Login and password are required' });
        }
        const db = (0, db_1.getDb)();
        const host = db.prepare('SELECT * FROM hosts WHERE username = ? OR email = ?').get(login, login);
        if (!host || !(await bcrypt_1.default.compare(password, host.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: host.id, username: host.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, host: { id: host.id, username: host.username, email: host.email } });
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const db = (0, db_1.getDb)();
        const host = db.prepare('SELECT id, username, email, created_at FROM hosts WHERE id = ?').get(decoded.id);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        res.json({ host });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.hostId = decoded.id;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}
exports.default = router;
//# sourceMappingURL=auth.js.map