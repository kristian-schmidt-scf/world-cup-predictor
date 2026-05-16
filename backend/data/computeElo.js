// Computes World Football Elo ratings from the historical match dataset.
// Methodology follows eloratings.net: tournament-weighted K-factor,
// goal-difference multiplier, and home-field adjustment.

import { get, set } from './cache.js';

const CACHE_KEY = 'elo_ratings';
const CACHE_TTL_HOURS = 24;

const STARTING_ELO = 1500;

// K-factor by tournament type — higher = more volatile, more meaningful match
const TOURNAMENT_K = [
  { pattern: /fifa world cup$/i,                k: 60 },
  { pattern: /world cup qual/i,                 k: 50 },
  { pattern: /uefa euro|copa am[eé]rica|afcon|africa cup|asian cup|gold cup/i, k: 50 },
  { pattern: /nations league|confederations cup/i, k: 40 },
  { pattern: /friendly/i,                       k: 20 },
];

function kFactor(tournament) {
  for (const { pattern, k } of TOURNAMENT_K) {
    if (pattern.test(tournament)) return k;
  }
  return 30;
}

// Multiplier for goal difference: 1-goal win = 1.0, 2 = 1.5, 3 = 1.75, 4+ scales up
function goalDiffMultiplier(gd) {
  if (gd <= 1) return 1.0;
  if (gd === 2) return 1.5;
  if (gd === 3) return 1.75;
  return 1.75 + (gd - 3) * 0.25;
}

// Expected score for team A given Elo ratings and optional home advantage
function expectedScore(eloA, eloB, homeAdv = 0) {
  return 1 / (1 + Math.pow(10, (eloB - eloA - homeAdv) / 400));
}

export function computeEloRatings(matches) {
  const cached = get(CACHE_KEY);
  if (cached) return cached;

  const ratings = {};

  // Process chronologically so each match updates ratings in order
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));

  for (const { home, away, homeGoals, awayGoals, tournament, neutral } of sorted) {
    if (!home || !away) continue;

    ratings[home] ??= STARTING_ELO;
    ratings[away] ??= STARTING_ELO;

    // No home advantage for neutral-venue matches (all WC matches are neutral)
    const homeAdv = neutral ? 0 : 100;
    const K = kFactor(tournament);

    const eHome = expectedScore(ratings[home], ratings[away], homeAdv);
    const gd = Math.abs(homeGoals - awayGoals);
    const gdMult = goalDiffMultiplier(gd);

    const actualHome = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0;
    const delta = K * gdMult * (actualHome - eHome);

    ratings[home] = ratings[home] + delta;
    ratings[away] = ratings[away] - delta;
  }

  // Round to 1 decimal for readability
  const result = Object.fromEntries(
    Object.entries(ratings).map(([id, elo]) => [id, Math.round(elo * 10) / 10])
  );

  set(CACHE_KEY, result, CACHE_TTL_HOURS);
  return result;
}

// Returns Elo for a specific team, or null if no data
export function teamElo(ratings, teamId) {
  return ratings[teamId] ?? null;
}

// Win probability for team A vs team B at a neutral venue
export function eloWinProb(eloA, eloB) {
  return expectedScore(eloA, eloB, 0);
}
