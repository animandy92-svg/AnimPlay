import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Host } from '../models';
import { nextId } from '../models';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'animplay-secret-key-change-in-production';

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const existing = await Host.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = await nextId('hosts');
    const host = await Host.create({ id, username, email, password: hashedPassword });

    const token = jwt.sign({ id: host.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, host: { id: host.id, username, email } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const host = await Host.findOne({ $or: [{ username: login }, { email: login }] });

    if (!host || !(await bcrypt.compare(password, host.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: host.id, username: host.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, host: { id: host.id, username: host.username, email: host.email } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const host = await Host.findOne({ id: decoded.id }, { password: 0 });

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    res.json({ host });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).hostId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default router;
