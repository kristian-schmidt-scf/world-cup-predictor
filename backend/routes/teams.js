import { Router } from 'express';
import { loadAll } from '../data/index.js';
import { estimateParams } from '../models/hierarchicalBayesian.js';
import { validateTeamParam } from '../middleware/validate.js';

const router = Router();

function enrichTeam(team, elo, form, squadStats, params) {
  const f = form[team.id]       ?? {};
  const s = squadStats[team.id] ?? {};
  const p = params[team.id]     ?? {};
  return {
    ...team,
    elo:             elo[team.id]       ?? null,
    attack:          p.attack           ?? null,
    defense:         p.defense          ?? null,
    formScore:       f.formScore        ?? null,
    last5:           f.last5            ?? null,
    record:          f.record           ?? null,
    avgGoalsFor:     f.avgGoalsFor      ?? null,
    avgGoalsAgainst: f.avgGoalsAgainst  ?? null,
    marketValueM:    s.marketValueM     ?? null,
    avgAge:          s.avgAge           ?? null,
  };
}

// GET /api/teams
router.get('/teams', async (req, res, next) => {
  try {
    const { teams, matches, elo, form, squadStats } = await loadAll();
    const params = estimateParams(matches, elo, squadStats);
    res.json({ teams: teams.map(t => enrichTeam(t, elo, form, squadStats, params)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/team/:id
router.get('/team/:id', validateTeamParam('id'), async (req, res, next) => {
  try {
    const { teams, matches, elo, form, squadStats } = await loadAll();
    const params = estimateParams(matches, elo, squadStats);
    const team   = teams.find(t => t.id === req.params.id);
    res.json({ team: enrichTeam(team, elo, form, squadStats, params) });
  } catch (err) {
    next(err);
  }
});

export default router;
