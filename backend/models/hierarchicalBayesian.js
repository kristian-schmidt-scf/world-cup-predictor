// Estimates attack (α) and defense (δ) strength parameters for each team.
//
// Model (log-linear, neutral venue):
//   λ_{i scores vs j} = exp(α_i + δ_j)
//   λ_{home i vs away j} = exp(α_i + δ_j + HOME_ADV)
//
// α_i > 0 → strong attack
// δ_j < 0 → strong defense (fewer goals conceded)
//
// Parameters are estimated via iterative MLE (coordinate ascent) on historical
// match results with exponential time-decay weighting. An L2 regulariser pulls
// sparse-data teams toward the pooled mean (the hierarchical prior).
// Initialisation blends four signals: Elo, market value, squad age, and FIFA rank.

import { get, set, invalidate } from '../data/cache.js';
import { TEAMS } from '../data/teams.js';

const CACHE_KEY        = 'team_params';
const CACHE_TTL        = 24;          // hours
const MAX_ITER         = 200;
const TOL              = 1e-7;
const HOME_ADV         = 0.1;         // log-scale home advantage (~10% more goals)
const DECAY_HALF_LIFE  = 548;         // days (≈ 1.5 years)
const REG_LAMBDA       = 0.02;        // L2 regularisation toward prior mean
const PEAK_AGE         = 26.5;        // squad avg age with maximum performance bonus
const MAX_SCORE        = 10;          // max goals per team in score matrix

// ── Prior initialisation ────────────────────────────────────────────────────

function buildPrior(teams, elo, squadStats) {
  const eloVals = teams.map(t => elo[t.id] ?? 1500);
  const mktVals = teams.map(t => squadStats[t.id]?.marketValueM ?? 100);
  const ageVals = teams.map(t => squadStats[t.id]?.avgAge ?? PEAK_AGE);

  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std  = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length); };

  const eloMean = mean(eloVals); const eloStd = std(eloVals) || 1;
  const mktMean = mean(mktVals); const mktStd = std(mktVals) || 1;

  // Age effect: quadratic bonus peaking at PEAK_AGE, symmetric falloff
  function ageBonus(age) {
    const diff = age - PEAK_AGE;
    return -0.004 * diff * diff; // ≈ –0.016 per year away from peak
  }

  const prior = {};
  for (const t of teams) {
    const eloZ = (elo[t.id] ?? eloMean - eloMean) / eloStd;
    const mktZ = (Math.log((squadStats[t.id]?.marketValueM ?? 100) + 1) - Math.log(mktMean + 1)) / mktStd;
    const age  = squadStats[t.id]?.avgAge ?? PEAK_AGE;

    // Blend signals: Elo is the strongest predictor, market value adds independent signal
    const attackPrior  =  0.35 * eloZ + 0.15 * mktZ + ageBonus(age);
    const defensePrior = -0.25 * eloZ - 0.10 * mktZ;

    prior[t.id] = { attack: attackPrior, defense: defensePrior };
  }
  return prior;
}

// ── Time-decay weight ───────────────────────────────────────────────────────

function timeWeight(dateStr) {
  const days = (Date.now() - new Date(dateStr)) / 86_400_000;
  return Math.exp(-Math.LN2 * days / DECAY_HALF_LIFE);
}

// ── Main estimation ─────────────────────────────────────────────────────────

export function estimateParams(matches, eloRatings = {}, squadStats = {}) {
  const cached = get(CACHE_KEY);
  if (cached) return cached;

  const teams  = TEAMS;
  const teamIds = teams.map(t => t.id);
  const wcSet  = new Set(teamIds);
  const prior  = buildPrior(teams, eloRatings, squadStats);

  // Initialise from prior
  const alpha = Object.fromEntries(teamIds.map(id => [id, prior[id].attack]));
  const delta = Object.fromEntries(teamIds.map(id => [id, prior[id].defense]));

  // Restrict to matches where both teams are WC participants
  const relevant = matches.filter(m => m.home && m.away && wcSet.has(m.home) && wcSet.has(m.away));

  if (relevant.length === 0) {
    console.warn('[Bayesian] No WC-vs-WC matches found; returning prior only.');
    return finalise(teamIds, alpha, delta);
  }

  const weights = relevant.map(m => timeWeight(m.date));

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const prevAlpha = { ...alpha };
    const prevDelta = { ...delta };

    // ── Update attack parameters ─────────────────────────
    for (const id of teamIds) {
      let goalsFor = 0, expFor = 0;
      for (let i = 0; i < relevant.length; i++) {
        const m = relevant[i]; const w = weights[i];
        const h = m.neutral ? 0 : HOME_ADV;
        if (m.home === id) { goalsFor += m.homeGoals * w; expFor += Math.exp(alpha[id] + delta[m.away] + h) * w; }
        if (m.away === id) { goalsFor += m.awayGoals * w; expFor += Math.exp(alpha[id] + delta[m.home])     * w; }
      }
      if (expFor > 0 && goalsFor > 0) {
        // MLE step + L2 pull toward prior
        alpha[id] += Math.log(goalsFor / expFor) - REG_LAMBDA * (alpha[id] - prior[id].attack);
      }
    }

    // ── Update defense parameters ────────────────────────
    for (const id of teamIds) {
      let goalsAgainst = 0, expAgainst = 0;
      for (let i = 0; i < relevant.length; i++) {
        const m = relevant[i]; const w = weights[i];
        const h = m.neutral ? 0 : HOME_ADV;
        if (m.home === id) { goalsAgainst += m.awayGoals * w; expAgainst += Math.exp(alpha[m.away] + delta[id])     * w; }
        if (m.away === id) { goalsAgainst += m.homeGoals * w; expAgainst += Math.exp(alpha[m.home] + delta[id] + h) * w; }
      }
      if (expAgainst > 0 && goalsAgainst > 0) {
        delta[id] += Math.log(goalsAgainst / expAgainst) - REG_LAMBDA * (delta[id] - prior[id].defense);
      }
    }

    // ── Normalise delta (identifiability: mean δ = 0) ───
    const meanDelta = teamIds.reduce((s, id) => s + delta[id], 0) / teamIds.length;
    for (const id of teamIds) delta[id] -= meanDelta;

    // ── Convergence check ────────────────────────────────
    const maxChange = Math.max(...teamIds.map(id =>
      Math.abs(alpha[id] - prevAlpha[id]) + Math.abs(delta[id] - prevDelta[id])
    ));
    if (maxChange < TOL) {
      console.log(`[Bayesian] Converged at iteration ${iter + 1}`);
      break;
    }
  }

  return finalise(teamIds, alpha, delta);
}

function finalise(teamIds, alpha, delta) {
  const result = Object.fromEntries(
    teamIds.map(id => [id, {
      attack:  round4(alpha[id]),
      defense: round4(delta[id]),
    }])
  );
  set(CACHE_KEY, result, CACHE_TTL);
  return result;
}

function round4(x) { return Math.round(x * 10_000) / 10_000; }

export function invalidateParams() { invalidate(CACHE_KEY); }

// ── DC-only: Elo-seeded prior, no MLE fitting ───────────────────────────────
// Gives attack/defense params that reflect only Elo strength — no market
// value, no squad age, no historical match calibration.
export function estimateParamsDCOnly(eloRatings) {
  const cached = get('team_params_dc');
  if (cached) return cached;

  const teams   = TEAMS;
  const teamIds = teams.map(t => t.id);
  const eloVals = teamIds.map(id => eloRatings[id] ?? 1500);
  const mean    = eloVals.reduce((a, b) => a + b, 0) / eloVals.length;
  const std     = Math.sqrt(eloVals.reduce((a, b) => a + (b - mean) ** 2, 0) / eloVals.length) || 1;

  const result = Object.fromEntries(teamIds.map(id => {
    const z = ((eloRatings[id] ?? mean) - mean) / std;
    return [id, { attack: round4(0.35 * z), defense: round4(-0.25 * z) }];
  }));
  set('team_params_dc', result, CACHE_TTL);
  return result;
}

// ── Elo-only: raw Elo ratings formatted for the simulation layer ────────────
export function getEloMap(eloRatings) {
  return Object.fromEntries(TEAMS.map(t => [t.id, eloRatings[t.id] ?? 1500]));
}

export { MAX_SCORE, HOME_ADV };
