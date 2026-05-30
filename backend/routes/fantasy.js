import { Router } from 'express';
import { loadAll } from '../data/index.js';
import { estimateParams } from '../models/hierarchicalBayesian.js';
import { runMonteCarlo, getCachedProbs, setCachedProbs } from '../models/tournamentSimulation.js';
import { getPlayers } from '../data/players.js';
import { computePlayerProjections, optimiseSquad } from '../models/fantasyEngine.js';

const router = Router();

async function getEnrichedPlayers() {
  const { matches, elo, squadStats } = await loadAll();
  const params = estimateParams(matches, elo, squadStats);

  // Reuse the last simulate result; fall back to a quick 2k-sim if not yet warmed
  let cached = getCachedProbs();
  if (!cached) {
    const result = runMonteCarlo(2_000, params);
    setCachedProbs(result);
    cached = result;
  }

  const players = getPlayers();
  return computePlayerProjections(players, params, cached.probs);
}

// GET /api/fantasy/players
// Returns all ~720 players enriched with projected pts
router.get('/fantasy/players', async (req, res, next) => {
  try {
    const players = await getEnrichedPlayers();
    res.json({ players });
  } catch (err) {
    next(err);
  }
});

// GET /api/fantasy/optimise?budget=100
// Returns optimal 15-player squad under the given budget
router.get('/fantasy/optimise', async (req, res, next) => {
  try {
    const budget  = Math.min(105, Math.max(50, parseFloat(req.query.budget) || 100));
    const players = await getEnrichedPlayers();
    const result  = optimiseSquad(players, budget);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
