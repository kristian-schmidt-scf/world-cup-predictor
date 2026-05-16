import { Router } from 'express';
import { getAllFixtures, loadAll } from '../data/index.js';
import { estimateParams } from '../models/hierarchicalBayesian.js';
import { predictMatch } from '../models/dixonColes.js';
import { validateTeamParam } from '../middleware/validate.js';

const router = Router();

// GET /api/fixtures
router.get('/fixtures', (req, res, next) => {
  try {
    res.json({ fixtures: getAllFixtures() });
  } catch (err) {
    next(err);
  }
});

// GET /api/match/:teamA/:teamB
router.get('/match/:teamA/:teamB',
  validateTeamParam('teamA'),
  validateTeamParam('teamB'),
  async (req, res, next) => {
    try {
      const { matches, elo, squadStats } = await loadAll();
      const params = estimateParams(matches, elo, squadStats);
      const { teamA, teamB } = req.params;
      const { scoreMatrix, ...pred } = predictMatch(teamA, teamB, params);

      // Top 10 most likely scorelines (for the frontend score histogram)
      const allScores = [];
      for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
          allScores.push({ goalsA: i, goalsB: j, prob: Math.round(scoreMatrix[i][j] * 10_000) / 10_000 });
        }
      }
      allScores.sort((a, b) => b.prob - a.prob);

      res.json({ ...pred, scoreMatrix, topScores: allScores.slice(0, 10) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
