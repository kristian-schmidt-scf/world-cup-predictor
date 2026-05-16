import { Router } from 'express';
import { getAllFixtures } from '../data/index.js';
import { getResults, setResult, deleteResult } from '../data/results.js';

const router = Router();

// GET /api/results — all persisted locked results
router.get('/results', (req, res) => {
  res.json({ results: getResults() });
});

// POST /api/results — lock a group-stage match result
// Body: { matchId: "G-HOME-AWAY", goalsA: number, goalsB: number }
router.post('/results', (req, res, next) => {
  try {
    const { matchId, goalsA, goalsB } = req.body;

    const fixture = getAllFixtures().find(
      f => f.stage === 'group' && `${f.group}-${f.home}-${f.away}` === matchId
    );
    if (!fixture) {
      return res.status(400).json({ error: `Unknown group match: "${matchId}"` });
    }

    const a = Number(goalsA), b = Number(goalsB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 20 || b > 20) {
      return res.status(400).json({ error: 'Scores must be integers between 0 and 20' });
    }

    res.json({ results: setResult(matchId, a, b) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/results/:matchId — unlock a result
router.delete('/results/:matchId', (req, res, next) => {
  try {
    const matchId = decodeURIComponent(req.params.matchId);
    res.json({ results: deleteResult(matchId) });
  } catch (err) {
    next(err);
  }
});

export default router;
