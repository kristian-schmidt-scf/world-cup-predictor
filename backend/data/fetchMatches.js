// Fetches historical international match results from the martj42 dataset:
// https://github.com/martj42/international_results
// Free, no API key required, updated within 24h of matches.
// Filters to matches from 2022 onwards involving WC 2026 teams.

import { get, set, getStale } from './cache.js';
import { TEAM_BY_NAME } from './teams.js';

const RESULTS_URL =
  'https://raw.githubusercontent.com/martj42/international_results/master/results.csv';

const SHOOTOUTS_URL =
  'https://raw.githubusercontent.com/martj42/international_results/master/shootouts.csv';

const CACHE_KEY           = 'historical_matches';
const CACHE_KEY_ALL       = 'historical_matches_all';
const CACHE_KEY_SHOOTOUTS = 'historical_shootouts';
const CACHE_TTL_HOURS = 24;
// Elo needs longer history for calibration; form only uses last 10 matches anyway
const CUTOFF_DATE = '2010-01-01';

// Simple CSV parser — avoids a dependency for a straightforward format.
function parseCsv(text) {
  const [headerLine, ...rows] = text.trim().split('\n');
  const headers = headerLine.split(',');
  return rows.map(row => {
    const values = row.split(',');
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]));
  });
}

// Normalise team names from the dataset to our team IDs.
// The CSV uses full English names; we match against teams.js TEAM_BY_NAME.
function resolveTeamId(name) {
  const lower = name.toLowerCase();
  const team = TEAM_BY_NAME[lower];
  if (team) return team.id;

  // Common aliases not in our canonical names
  const aliases = {
    'usa':                   'USA',
    'united states':         'USA',
    'south korea':           'KOR',
    'republic of korea':     'KOR',
    'korea republic':        'KOR',
    'ivory coast':           'CIV',
    "côte d'ivoire":         'CIV',
    'curacao':               'CUW',
    'curaçao':               'CUW',
    'turkiye':               'TUR',
    'turkey':                'TUR',
    'czech republic':        'CZE',
    'czechia':               'CZE',
    'dr congo':              'COD',
    'congo dr':              'COD',
    'democratic republic of the congo': 'COD',
    'new zealand':           'NZL',
    'saudi arabia':          'KSA',
    'cape verde':            'CPV',
    'bosnia and herzegovina':'BIH',
    'bosnia-herzegovina':    'BIH',
  };
  return aliases[lower] ?? null;
}

function parseAndMap(rows, dateFilter) {
  return rows
    .filter(r => !dateFilter || r.date >= dateFilter)
    .map(r => {
      const homeId = resolveTeamId(r.home_team);
      const awayId = resolveTeamId(r.away_team);
      return {
        date:       r.date,
        home:       homeId,
        away:       awayId,
        homeGoals:  parseInt(r.home_score, 10),
        awayGoals:  parseInt(r.away_score, 10),
        tournament: r.tournament,
        neutral:    r.neutral === 'True',
      };
    })
    .filter(m => (m.home || m.away) && !isNaN(m.homeGoals) && !isNaN(m.awayGoals));
}

async function fetchRaw() {
  try {
    const res = await fetch(RESULTS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    throw err;
  }
}

// Returns matches since CUTOFF_DATE — used for model fitting (Elo, form, Bayesian).
export async function fetchMatches() {
  const cached = get(CACHE_KEY);
  if (cached) return cached;

  let raw;
  try {
    raw = await fetchRaw();
  } catch (err) {
    console.warn(`[fetchMatches] fetch failed (${err.message}), using stale cache`);
    const stale = getStale(CACHE_KEY);
    if (stale) return stale;
    throw new Error('No historical match data available and fetch failed.');
  }

  const matches = parseAndMap(parseCsv(raw), CUTOFF_DATE);
  set(CACHE_KEY, matches, CACHE_TTL_HOURS);
  console.log(`[fetchMatches] loaded ${matches.length} matches since ${CUTOFF_DATE}`);
  return matches;
}

// Returns the full historical dataset (all years) — used for H2H display only.
export async function fetchAllMatches() {
  const cached = get(CACHE_KEY_ALL);
  if (cached) return cached;

  let raw;
  try {
    raw = await fetchRaw();
  } catch (err) {
    console.warn(`[fetchAllMatches] fetch failed (${err.message}), using stale cache`);
    const stale = getStale(CACHE_KEY_ALL);
    if (stale) return stale;
    throw new Error('No historical match data available and fetch failed.');
  }

  const matches = parseAndMap(parseCsv(raw), null);
  set(CACHE_KEY_ALL, matches, CACHE_TTL_HOURS);
  console.log(`[fetchAllMatches] loaded ${matches.length} matches (full history)`);
  return matches;
}

// Returns a Map keyed by `date|homeId|awayId` → { winner: teamId }
// Covers penalty shootout outcomes from the martj42 shootouts dataset.
export async function fetchShootouts() {
  const cached = get(CACHE_KEY_SHOOTOUTS);
  if (cached) return new Map(cached);

  let raw;
  try {
    const res = await fetch(SHOOTOUTS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.text();
  } catch (err) {
    console.warn(`[fetchShootouts] fetch failed (${err.message}), using stale cache`);
    const stale = getStale(CACHE_KEY_SHOOTOUTS);
    if (stale) return new Map(stale);
    return new Map(); // shootout data is optional — don't throw
  }

  const rows = parseCsv(raw);
  const entries = [];
  for (const r of rows) {
    const homeId   = resolveTeamId(r.home_team);
    const awayId   = resolveTeamId(r.away_team);
    const winnerId = resolveTeamId(r.winner);
    if (!homeId || !awayId || !winnerId) continue;
    entries.push([`${r.date}|${homeId}|${awayId}`, { winner: winnerId }]);
  }

  set(CACHE_KEY_SHOOTOUTS, entries, CACHE_TTL_HOURS);
  console.log(`[fetchShootouts] loaded ${entries.length} penalty shootout records`);
  return new Map(entries);
}
