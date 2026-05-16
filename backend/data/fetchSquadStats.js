// Squad market values (Transfermarkt, €M, May 2026) and average squad ages
// (RotoWire / ESPN projected rosters, May 2026).
//
// Market values: sourced from Transfermarkt via sportsorca.com and beIN Sports.
// Avg ages: sourced from RotoWire (all 48 teams confirmed).
// Update market values monthly; ages are stable once squads are named.

import { get, set } from './cache.js';

const CACHE_KEY   = 'squad_stats';
const CACHE_TTL   = 24 * 30; // 30 days — values are stable pre-tournament

// marketValueM = total squad market value in € millions (Transfermarkt)
// avgAge       = average squad age (RotoWire projected rosters)
const SQUAD_STATS = {
  // Group A
  MEX: { marketValueM: 200,  avgAge: 27.23 },
  KOR: { marketValueM: 185,  avgAge: 27.32 },
  CZE: { marketValueM: 140,  avgAge: 27.76 },
  RSA: { marketValueM: 70,   avgAge: 26.22 },

  // Group B
  CAN: { marketValueM: 160,  avgAge: 26.23 },
  SUI: { marketValueM: 230,  avgAge: 27.54 },
  BIH: { marketValueM: 110,  avgAge: 26.60 },
  QAT: { marketValueM: 35,   avgAge: 27.60 },

  // Group C
  BRA: { marketValueM: 1000, avgAge: 27.64 },
  MAR: { marketValueM: 320,  avgAge: 27.42 },
  SCO: { marketValueM: 180,  avgAge: 28.35 },
  HAI: { marketValueM: 25,   avgAge: 27.36 },

  // Group D
  USA: { marketValueM: 350,  avgAge: 26.00 },
  AUS: { marketValueM: 150,  avgAge: 26.23 },
  TUR: { marketValueM: 460,  avgAge: 27.03 },
  PRY: { marketValueM: 80,   avgAge: 28.36 },

  // Group E
  GER: { marketValueM: 850,  avgAge: 27.46 },
  ECU: { marketValueM: 160,  avgAge: 25.62 },
  CIV: { marketValueM: 200,  avgAge: 25.48 },
  CUW: { marketValueM: 29,   avgAge: 27.77 },

  // Group F
  NED: { marketValueM: 720,  avgAge: 26.50 },
  JPN: { marketValueM: 250,  avgAge: 26.00 },
  SWE: { marketValueM: 200,  avgAge: 26.04 },
  TUN: { marketValueM: 75,   avgAge: 28.24 },

  // Group G
  BEL: { marketValueM: 540,  avgAge: 28.27 },
  IRN: { marketValueM: 70,   avgAge: 29.00 },
  EGY: { marketValueM: 90,   avgAge: 28.88 },
  NZL: { marketValueM: 40,   avgAge: 27.09 },

  // Group H
  ESP: { marketValueM: 920,  avgAge: 26.65 },
  URU: { marketValueM: 220,  avgAge: 28.07 },
  KSA: { marketValueM: 60,   avgAge: 26.97 },
  CPV: { marketValueM: 48,   avgAge: 27.96 },

  // Group I
  FRA: { marketValueM: 1280, avgAge: 26.31 },
  SEN: { marketValueM: 250,  avgAge: 27.23 },
  NOR: { marketValueM: 500,  avgAge: 26.62 },
  IRQ: { marketValueM: 20,   avgAge: 26.00 },

  // Group J
  ARG: { marketValueM: 570,  avgAge: 28.91 },
  JOR: { marketValueM: 16,   avgAge: 28.94 },
  AUT: { marketValueM: 280,  avgAge: 28.04 },
  ALG: { marketValueM: 130,  avgAge: 25.67 },

  // Group K
  POR: { marketValueM: 850,  avgAge: 27.19 },
  COL: { marketValueM: 450,  avgAge: 29.98 },
  COD: { marketValueM: 55,   avgAge: 27.65 },
  UZB: { marketValueM: 50,   avgAge: 27.35 },

  // Group L
  ENG: { marketValueM: 1300, avgAge: 27.00 },
  CRO: { marketValueM: 280,  avgAge: 27.88 },
  GHA: { marketValueM: 230,  avgAge: 26.62 },
  PAN: { marketValueM: 30,   avgAge: 29.52 },
};

export function getSquadStats() {
  const cached = get(CACHE_KEY);
  if (cached) return cached;

  set(CACHE_KEY, SQUAD_STATS, CACHE_TTL);
  return SQUAD_STATS;
}

export function teamSquadStats(teamId) {
  return SQUAD_STATS[teamId] ?? null;
}

// Normalise market values to a 0–1 scale across all WC teams.
// Useful as a model feature alongside Elo and form.
export function normaliseMarketValues(stats = SQUAD_STATS) {
  const values = Object.values(stats).map(s => s.marketValueM);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return Object.fromEntries(
    Object.entries(stats).map(([id, s]) => [
      id,
      Math.round(((s.marketValueM - min) / (max - min)) * 1000) / 1000,
    ])
  );
}
