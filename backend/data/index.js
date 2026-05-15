// Unified data access. Run directly to pre-warm the cache:
//   node backend/data/index.js

import { TEAMS } from './teams.js';
import { GROUP_FIXTURES, KNOCKOUT_SLOTS, getAllFixtures } from './fixtures.js';
import { fetchMatches } from './fetchMatches.js';
import { invalidate } from './cache.js';

export { TEAMS, GROUP_FIXTURES, KNOCKOUT_SLOTS, getAllFixtures, fetchMatches };

export async function loadAll() {
  const matches = await fetchMatches();
  return { teams: TEAMS, fixtures: getAllFixtures(), matches };
}

export async function refreshAll() {
  invalidate('historical_matches');
  return loadAll();
}

// Pre-warm cache when run directly
if (process.argv[1].endsWith('index.js')) {
  console.log('Pre-warming data cache...');
  loadAll()
    .then(({ teams, fixtures, matches }) => {
      console.log(`  Teams:    ${teams.length}`);
      console.log(`  Fixtures: ${fixtures.length}`);
      console.log(`  Matches:  ${matches.length}`);
    })
    .catch(err => {
      console.error('Data load failed:', err.message);
      process.exit(1);
    });
}
