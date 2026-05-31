import { Router } from 'express';
import { loadAll, refreshAll, getAllFixtures } from '../data/index.js';
import { estimateParams, estimateParamsDCOnly, getEloMap, invalidateParams } from '../models/hierarchicalBayesian.js';
import { runMonteCarlo, runMonteCarloCompare, setCachedProbs } from '../models/tournamentSimulation.js';
import { invalidate } from '../data/cache.js';
import { validateNumSims } from '../middleware/validate.js';
import { getResults } from '../data/results.js';

const VALID_MODELS = new Set(['full', 'dc', 'elo']);

const router = Router();

// POST /api/simulate
// Body: { numSims, model?: 'full'|'dc'|'elo', lockedResults? }
router.post('/simulate', validateNumSims, async (req, res, next) => {
  try {
    const { numSims, lockedResults = {}, model = 'full' } = req.body;
    if (!VALID_MODELS.has(model)) return res.status(400).json({ error: `Unknown model: ${model}` });

    const { matches, elo, squadStats } = await loadAll();
    const fullParams = estimateParams(matches, elo, squadStats);
    const eloMap     = getEloMap(elo);

    let params;
    if (model === 'full') params = fullParams;
    else if (model === 'dc') params = estimateParamsDCOnly(elo);
    else params = null; // elo model ignores params

    const merged = { ...lockedResults, ...getResults() };

    const t0 = Date.now();
    const { probs, groups, meta } = runMonteCarlo(numSims, params, merged, model, eloMap);
    setCachedProbs({ probs, groups });
    res.json({ probs, groups, meta: { ...meta, model, elapsedMs: Date.now() - t0 } });
  } catch (err) {
    next(err);
  }
});

// POST /api/simulate/compare
// Runs all three models at numSims each and returns divergence data.
// Body: { numSims? } (default 3000 — faster than full run)
router.post('/simulate/compare', async (req, res, next) => {
  try {
    const numSims = Math.min(Math.max(parseInt(req.body?.numSims) || 3000, 500), 10000);
    const { matches, elo, squadStats } = await loadAll();
    const fullParams = estimateParams(matches, elo, squadStats);
    const dcParams   = estimateParamsDCOnly(elo);
    const eloMap     = getEloMap(elo);
    const merged     = getResults();

    const t0 = Date.now();
    const result = runMonteCarloCompare(numSims, fullParams, dcParams, eloMap, merged);
    res.json({ ...result, elapsedMs: Date.now() - t0 });
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
    invalidate('fantasy_projections');
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
