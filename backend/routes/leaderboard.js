import express from 'express';
import {
  registerUser, getUserByToken, savePicks, getLeaderboard, scoreAll,
} from '../data/leaderboard.js';

const router = express.Router();

const getToken = req => req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? null;

router.post('/leaderboard/register', (req, res) => {
  const { username } = req.body ?? {};
  if (!username || typeof username !== 'string')
    return res.status(400).json({ error: 'username required' });
  try {
    res.json(registerUser(username));
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

router.get('/leaderboard', (_req, res) => {
  res.json({ users: getLeaderboard() });
});

router.get('/leaderboard/me', (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'token required' });
  const user = getUserByToken(token);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const { id, username, picks, totalScore, scores } = user;
  res.json({ id, username, picks, totalScore, scores });
});

router.post('/leaderboard/picks', (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'token required' });
  const { picks } = req.body ?? {};
  if (!picks || typeof picks !== 'object') return res.status(400).json({ error: 'picks required' });
  const result = savePicks(token, picks);
  if (!result) return res.status(404).json({ error: 'user not found' });
  res.json({ ok: true, ...result });
});

// Admin-triggered: score all users based on actual results.
// Body: { actual: { winner, finalist, semiFinals: [t1, t2] } }
router.post('/leaderboard/score', (req, res) => {
  const { actual } = req.body ?? {};
  if (!actual || typeof actual !== 'object')
    return res.status(400).json({ error: 'actual required' });
  res.json({ ok: true, users: scoreAll(actual) });
});

export default router;
