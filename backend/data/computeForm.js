// Computes recent form for each team from historical match results.
// Uses exponential time-decay so the most recent matches carry more weight.

import { get, set } from './cache.js';

const CACHE_KEY = 'team_form';
const CACHE_TTL_HOURS = 24;

const WINDOW = 10;          // number of recent matches to consider
const DECAY_RATE = 0.15;    // higher = faster decay (older matches matter less)

function decayWeight(matchIndex) {
  // matchIndex 0 = most recent; weight decreases exponentially
  return Math.exp(-DECAY_RATE * matchIndex);
}

function formForTeam(teamId, matches) {
  const teamMatches = matches
    .filter(m => m.home === teamId || m.away === teamId)
    .sort((a, b) => b.date.localeCompare(a.date)) // newest first
    .slice(0, WINDOW);

  if (teamMatches.length === 0) return null;

  let weightedPoints = 0;
  let maxWeightedPoints = 0;
  let wins = 0, draws = 0, losses = 0;
  let goalsFor = 0, goalsAgainst = 0;

  teamMatches.forEach((match, idx) => {
    const w = decayWeight(idx);
    const isHome = match.home === teamId;
    const gf = isHome ? match.homeGoals : match.awayGoals;
    const ga = isHome ? match.awayGoals : match.homeGoals;

    goalsFor += gf;
    goalsAgainst += ga;

    if (gf > ga)      { wins++;   weightedPoints += 3 * w; }
    else if (gf === ga) { draws++; weightedPoints += 1 * w; }
    else                { losses++;                          }

    maxWeightedPoints += 3 * w;
  });

  const played = teamMatches.length;

  return {
    // 0–100 score: 100 = won every recent match, 0 = lost every recent match
    formScore:     Math.round((weightedPoints / maxWeightedPoints) * 100),
    record:        { wins, draws, losses, played },
    avgGoalsFor:   Math.round((goalsFor   / played) * 100) / 100,
    avgGoalsAgainst: Math.round((goalsAgainst / played) * 100) / 100,
    avgGoalDiff:   Math.round(((goalsFor - goalsAgainst) / played) * 100) / 100,
    // Last 5 results as a compact string, e.g. "WDWLW" (newest first)
    last5: teamMatches.slice(0, 5).map(match => {
      const isHome = match.home === teamId;
      const gf = isHome ? match.homeGoals : match.awayGoals;
      const ga = isHome ? match.awayGoals : match.homeGoals;
      return gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    }).join(''),
  };
}

export function computeAllForm(matches) {
  const cached = get(CACHE_KEY);
  if (cached) return cached;

  const teamIds = [...new Set(matches.flatMap(m => [m.home, m.away].filter(Boolean)))];
  const result = Object.fromEntries(
    teamIds.map(id => [id, formForTeam(id, matches)])
  );

  set(CACHE_KEY, result, CACHE_TTL_HOURS);
  return result;
}

export function teamForm(formMap, teamId) {
  return formMap[teamId] ?? null;
}
