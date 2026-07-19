import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { Host } from '../models';
import { nextId } from '../models';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using a development fallback. Set JWT_SECRET in production.');
}
const FALLBACK_JWT_SECRET = 'animplay-secret-key-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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

    const token = jwt.sign({ id: host.id, username }, JWT_SECRET || FALLBACK_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, host: { id: host.id, username, email } });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const host = await Host.findOne({ $or: [{ username: login }, { email: login }] });

    if (!host || !host.password || !(await bcrypt.compare(password, host.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: host.id, username: host.username }, JWT_SECRET || FALLBACK_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, host: { id: host.id, username: host.username, email: host.email } });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    if (!googleClient) {
      return res.status(500).json({ error: 'Google Sign-In is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || '';
    const picture = payload.picture || null;

    let host = await Host.findOne({ googleId });

    if (!host) {
      host = await Host.findOne({ email });

      if (host) {
        host.googleId = googleId;
        host.provider = 'google';
        if (picture) {
          (host as any).picture = picture;
        }
        await host.save();
      } else {
        let username = name.replace(/\s+/g, '').toLowerCase();
        if (!username) {
          username = `g_${googleId}`;
        }

        const existingUsername = await Host.findOne({ username });
        if (existingUsername) {
          username = `${username}_${googleId.slice(-6)}`;
        }

        const id = await nextId('hosts');
        host = await Host.create({
          id,
          username,
          email,
          password: undefined,
          provider: 'google',
          googleId,
          created_at: new Date(),
        } as any);

        if (picture) {
          (host as any).picture = picture;
        }
      }
    }

    const token = jwt.sign({ id: host.id, username: host.username }, JWT_SECRET || FALLBACK_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, host: { id: host.id, username: host.username, email: host.email } });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({ error: 'Google authentication failed' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET || FALLBACK_JWT_SECRET) as any;
    const host = await Host.findOne({ id: decoded.id }, { password: 0 });

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    res.json({ host });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET || FALLBACK_JWT_SECRET) as any;
    (req as any).hostId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default router;
