// Unified data access. Run directly to pre-warm all caches:
//   node backend/data/index.js

import { TEAMS } from './teams.js';
import { GROUP_FIXTURES, KNOCKOUT_SLOTS, getAllFixtures } from './fixtures.js';
import { fetchMatches } from './fetchMatches.js';
import { computeEloRatings } from './computeElo.js';
import { computeAllForm } from './computeForm.js';
import { getSquadStats, normaliseMarketValues } from './fetchSquadStats.js';
import { invalidate } from './cache.js';

export {
  TEAMS,
  GROUP_FIXTURES,
  KNOCKOUT_SLOTS,
  getAllFixtures,
  fetchMatches,
  computeEloRatings,
  computeAllForm,
  getSquadStats,
  normaliseMarketValues,
};

export async function loadAll() {
  const matches    = await fetchMatches();
  const elo        = computeEloRatings(matches);
  const form       = computeAllForm(matches);
  const squadStats = getSquadStats();
  return { teams: TEAMS, fixtures: getAllFixtures(), matches, elo, form, squadStats };
}

export async function refreshAll() {
  invalidate('historical_matches');
  invalidate('elo_ratings');
  invalidate('team_form');
  invalidate('squad_stats');
  return loadAll();
}

// Pre-warm all caches and print a sample when run directly
if (process.argv[1].endsWith('index.js')) {
  console.log('Pre-warming data cache...\n');
  loadAll().then(({ teams, fixtures, matches, elo, form, squadStats }) => {
    console.log(`  Teams:    ${teams.length}`);
    console.log(`  Fixtures: ${fixtures.length}`);
    console.log(`  Matches:  ${matches.length}`);
    console.log(`  Elo computed for ${Object.keys(elo).length} teams`);
    console.log(`  Form computed for ${Object.keys(form).length} teams`);
    console.log(`  Squad stats loaded for ${Object.keys(squadStats).length} teams\n`);

    // Combined profile: top 10 WC teams by Elo
    const wcIds = new Set(teams.map(t => t.id));
    const top10 = Object.entries(elo)
      .filter(([id]) => wcIds.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('  Top 10 WC 2026 teams — combined profile:');
    console.log('       Team   Elo     Form  Mkt(€M)  AvgAge');
    top10.forEach(([id, rating], i) => {
      const f = form[id];
      const s = squadStats[id];
      const last5  = f?.last5?.padEnd(5, '-') ?? '-----';
      const mktVal = s ? String(s.marketValueM).padStart(6) : '     ?';
      const age    = s ? String(s.avgAge).padStart(6)       : '     ?';
      console.log(`    ${String(i + 1).padStart(2)}. ${id.padEnd(4)} ${String(rating).padStart(7)}  ${last5}  ${mktVal}   ${age}`);
    });
  }).catch(err => {
    console.error('Data load failed:', err.message);
    process.exit(1);
  });
}
