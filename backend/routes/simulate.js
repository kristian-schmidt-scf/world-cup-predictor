import { Router } from 'express';
import { loadAll, refreshAll, getAllFixtures } from '../data/index.js';
import { estimateParams, invalidateParams } from '../models/hierarchicalBayesian.js';
import { runMonteCarlo } from '../models/tournamentSimulation.js';
import { validateNumSims } from '../middleware/validate.js';
import { getResults } from '../data/results.js';

const router = Router();

// POST /api/simulate
// Body: { numSims: number, lockedResults?: { [matchKey]: { goalsA, goalsB } } }
router.post('/simulate', validateNumSims, async (req, res, next) => {
  try {
    const { numSims, lockedResults = {} } = req.body;
    const { matches, elo, squadStats } = await loadAll();
    const params = estimateParams(matches, elo, squadStats);

    // Real results always override scenario locks
    const merged = { ...lockedResults, ...getResults() };

    const t0 = Date.now();
    const { probs, meta } = runMonteCarlo(numSims, params, merged);
    res.json({ probs, meta: { ...meta, elapsedMs: Date.now() - t0 } });
  } catch (err) {
    next(err);
  }
});

// GET /api/bracket
// Returns fixture structure + any locked real-world results (Phase 5 will populate lockedResults).
router.get('/bracket', (req, res, next) => {
  try {
    res.json({ fixtures: getAllFixtures(), lockedResults: {} });
  } catch (err) {
    next(err);
  }
});

// POST /api/refresh
// Invalidates all caches, re-fetches live data, and re-warms the model.
router.post('/refresh', async (req, res, next) => {
  try {
    invalidateParams();
    const { teams, fixtures, matches, elo, form, squadStats } = await refreshAll();
    estimateParams(matches, elo, squadStats);
    res.json({
      ok: true,
      counts: {
        teams:      teams.length,
        fixtures:   fixtures.length,
        matches:    matches.length,
        elo:        Object.keys(elo).length,
        form:       Object.keys(form).length,
        squadStats: Object.keys(squadStats).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
