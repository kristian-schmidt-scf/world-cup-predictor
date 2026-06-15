import { Router } from 'express';
import { fetchTodayMatches } from '../data/fetchLiveScores.js';

const router = Router();

router.get('/ticker', async (req, res, next) => {
  try {
    const data = await fetchTodayMatches();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
