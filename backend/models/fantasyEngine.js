// Fantasy WC 2026 projection engine.
// Computes expected fantasy points per player using Dixon-Coles match predictions
// and Monte Carlo stage-reaching probabilities.

import { expectedGoals, scoreMatrix } from './dixonColes.js';
import { GROUP_FIXTURES, GROUPS, GROUP_TEAMS } from '../data/fixtures.js';
import { get, set } from '../data/cache.js';

const CACHE_KEY = 'fantasy_projections';
const CACHE_TTL_H = 24;

// ── Scoring rules per position (official FIFA Fantasy WC 2026) ───────────────

export const SCORING = {
  GK:  { app60: 2, appSub: 1, goal: 9,  assist: 3, cleanSheet: 5, savePer3: 1, goalConcededAfter1: -1 },
  DEF: { app60: 2, appSub: 1, goal: 7,  assist: 3, cleanSheet: 5, goalConcededAfter1: -1 },
  MID: { app60: 2, appSub: 1, goal: 6,  assist: 3, cleanSheet: 1 },
  FWD: { app60: 2, appSub: 1, goal: 5,  assist: 3 },
};

// Historical WC goal distribution by position (approximate)
const GOAL_SHARE = { GK: 0.00, DEF: 0.08, MID: 0.25, FWD: 0.67 };
const ASSIST_RATE = 0.85;   // probability an attacker's goal has an assist
const P_APP_60   = 0.75;    // starter assumption (no lineup data available)
const P_CARD     = 0.10;    // ~10% chance of a yellow card per player per match
// Expected saves per match for GKs: roughly 3–5; use opponent xG as proxy
// Every 3 saves = +1 pt; GK saves ~= opponent xG * ~2 (shots-to-xG ratio)
const SAVES_PER_XG = 2.0;

// ── Clean-sheet probability from score matrix ────────────────────────────────

function pCleanSheetFor(team, opponent, params) {
  const { xgA, xgB } = expectedGoals(team, opponent, params);
  const mat = scoreMatrix(xgA, xgB);
  // P(opponent scores 0) = sum of matrix column 0
  let p = 0;
  for (let i = 0; i < mat.length; i++) p += mat[i][0];
  return { xgFor: xgA, xgAgainst: xgB, pCS: p };
}

// ── Expected pts for one player in one match ─────────────────────────────────

function xptsMatch(player, xgFor, xgAgainst, pCS, qualityWeight = 1) {
  const s  = SCORING[player.pos];
  const gs = GOAL_SHARE[player.pos];

  // qualityWeight distributes the position's goal share by player price within the team
  const xGoals   = xgFor  * gs * qualityWeight;
  const xAssists = xGoals * ASSIST_RATE;
  const xCards   = P_CARD;

  let xpts = P_APP_60 * s.app60;
  xpts += xGoals   * s.goal;
  xpts += xAssists * s.assist;
  xpts -= xCards;   // yellow card deduction

  if (s.cleanSheet) xpts += pCS * s.cleanSheet;

  if (player.pos === 'GK') {
    // Save bonus: ~SAVES_PER_XG saves per unit of opponent xG, +1 per 3 saves
    const xSaves = xgAgainst * SAVES_PER_XG;
    xpts += (xSaves / 3) * (s.savePer3 ?? 0);
    // Goal conceded deduction: first goal free, each additional -1
    // E(conceded after 1st) ≈ max(0, xgAgainst - 1) * (1 - pCS)
    const xConcededAfter1 = Math.max(0, xgAgainst - 1) * (1 - pCS);
    xpts += xConcededAfter1 * (s.goalConcededAfter1 ?? 0);
  }

  if (player.pos === 'DEF') {
    const xConcededAfter1 = Math.max(0, xgAgainst - 1) * (1 - pCS);
    xpts += xConcededAfter1 * (s.goalConcededAfter1 ?? 0);
  }

  return xpts;
}

// ── Project a single player across the whole tournament ─────────────────────

export function projectPlayer(player, params, stageProbs, qualityWeight = 1) {
  // ── Group stage (3 confirmed fixtures) ──────────────────────────────────────
  const teamFixtures = GROUP_FIXTURES.filter(
    f => f.home === player.team || f.away === player.team
  );

  let xptsGroupStage = 0;
  for (const f of teamFixtures) {
    const opponent = f.home === player.team ? f.away : f.home;
    const { xgFor, xgAgainst, pCS } = pCleanSheetFor(player.team, opponent, params);
    xptsGroupStage += xptsMatch(player, xgFor, xgAgainst, pCS, qualityWeight);
  }

  // ── Knockout rounds ─────────────────────────────────────────────────────────
  // Use team's average attack/defense to estimate a "typical" KO match
  const p = params[player.team];
  if (!p) return { xptsGroupStage, xptsKnockout: 0, xptsTotal: xptsGroupStage };

  // Estimate xG against an average opponent (attack=0, defense=0 in log-space)
  const xgForKO      = Math.exp(p.attack);   // vs average defense = 0
  const xgAgainstKO  = Math.exp(p.defense);  // proxy: team's defense leakiness
  const { pCS: pCSKO } = (() => {
    // Approximate: P(CS in KO) from own defense strength
    const poissonZero = Math.exp(-xgAgainstKO);
    return { pCS: poissonZero };
  })();

  const xptsPerKO = xptsMatch(player, xgForKO, xgAgainstKO, pCSKO, qualityWeight);

  const sp = stageProbs[player.team] ?? {};
  // P(play in each KO round): group qualification → r16 → qf → sf → final
  // pQual comes from groups data; approximated here as sp.r16 (reaching R16 = survived R32)
  const pQual   = sp.r16    ?? 0;  // R32 match played
  const pR16    = sp.qf     ?? 0;  // R16 match played
  const pQF     = sp.sf     ?? 0;  // QF match played
  const pSF     = sp.final  ?? 0;  // SF match played
  const pFinal  = sp.winner ?? 0;  // Final match played (winner plays it)
  // The runner-up also plays the Final — approximate as 2 × pFinal for "reaches final"
  const pReachesFinal = sp.final ?? 0;  // sp.final = P(reaches final round)

  const xptsKnockout =
    pQual        * xptsPerKO +  // R32
    pR16         * xptsPerKO +  // R16
    pQF          * xptsPerKO +  // QF
    pSF          * xptsPerKO +  // SF
    pReachesFinal * xptsPerKO;  // Final

  const xptsTotal = xptsGroupStage + xptsKnockout;
  return { xptsGroupStage, xptsKnockout, xptsTotal };
}

// ── Price-based quality weights within a position group on each team ─────────
// Distributes xG share by each player's price relative to teammates in same pos.
// This ensures Mbappe ($10.5M) gets a higher goal share than Kolo Muani ($7M).
function buildPriceWeights(players) {
  // { 'FRA_FWD': { 'FRA_FWD_1': 0.42, 'FRA_FWD_2': 0.30, ... } }
  const groups = {};
  for (const p of players) {
    const key = `${p.team}_${p.pos}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  const weights = {};
  for (const [key, group] of Object.entries(groups)) {
    const total = group.reduce((s, p) => s + p.price, 0);
    for (const p of group) weights[p.id] = total > 0 ? p.price / total : 1 / group.length;
  }
  return weights;
}

// ── Batch projection with 24-hour cache ─────────────────────────────────────

export function computePlayerProjections(players, params, stageProbs) {
  const cached = get(CACHE_KEY);
  if (cached) return cached;

  const priceWeights = buildPriceWeights(players);

  const enriched = players.map(p => ({
    ...p,
    ...projectPlayer(p, params, stageProbs, priceWeights[p.id] ?? 1),
  }));

  set(CACHE_KEY, enriched, CACHE_TTL_H);
  return enriched;
}

// ── Greedy squad optimiser ───────────────────────────────────────────────────

const SLOTS = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

export function optimiseSquad(enrichedPlayers, budget = 100) {
  const filled        = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const countryCounts = {};
  const squad         = [];
  let   spent         = 0;

  // Sort by xptsTotal / price descending (value-per-dollar)
  const sorted = [...enrichedPlayers].sort(
    (a, b) => ((b.xptsTotal ?? 0) / b.price) - ((a.xptsTotal ?? 0) / a.price)
  );

  for (const p of sorted) {
    if (squad.length === 15) break;
    if (filled[p.pos] >= SLOTS[p.pos])          continue;
    if (spent + p.price > budget)                continue;
    if ((countryCounts[p.team] ?? 0) >= 3)       continue;

    squad.push(p);
    filled[p.pos]++;
    countryCounts[p.team] = (countryCounts[p.team] ?? 0) + 1;
    spent += p.price;
  }

  // Fallback: fill any remaining mandatory slots with cheapest valid player
  for (const [pos, required] of Object.entries(SLOTS)) {
    while (filled[pos] < required) {
      const candidate = enrichedPlayers
        .filter(p =>
          p.pos === pos &&
          !squad.includes(p) &&
          spent + p.price <= budget &&
          (countryCounts[p.team] ?? 0) < 3
        )
        .sort((a, b) => a.price - b.price)[0];

      if (!candidate) break;
      squad.push(candidate);
      filled[pos]++;
      countryCounts[candidate.team] = (countryCounts[candidate.team] ?? 0) + 1;
      spent += candidate.price;
    }
  }

  return {
    squad,
    totalXpts:  +squad.reduce((s, p) => s + (p.xptsTotal ?? 0), 0).toFixed(2),
    totalPrice: +spent.toFixed(1),
  };
}

// ── Validate a squad against the group-stage constraints ─────────────────────

export function validateSquad(playerIds, allPlayers) {
  const players = playerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
  const errors  = [];

  if (players.length > 15) errors.push('Too many players (max 15)');

  const filled  = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const country = {};
  let   spent   = 0;

  for (const p of players) {
    filled[p.pos]++;
    country[p.team] = (country[p.team] ?? 0) + 1;
    spent += p.price;
  }

  if (spent > 100) errors.push(`Over budget ($${spent.toFixed(1)}M / $100M)`);
  for (const [pos, max] of Object.entries(SLOTS)) {
    if (filled[pos] > max) errors.push(`Too many ${pos} (${filled[pos]}/${max})`);
  }
  for (const [team, n] of Object.entries(country)) {
    if (n > 3) errors.push(`Too many players from ${team} (${n}/3)`);
  }

  return { valid: errors.length === 0, errors };
}
