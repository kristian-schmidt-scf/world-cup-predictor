// Quick integration smoke-test for the full modeling pipeline.
// Run: node backend/models/test.js

import { loadAll } from '../data/index.js';
import { estimateParams, invalidateParams } from './hierarchicalBayesian.js';
import { predictMatch, mostLikelyScore } from './dixonColes.js';
import { runMonteCarlo } from './tournamentSimulation.js';

invalidateParams(); // always recompute for the test

console.log('Loading data...');
const { matches, elo, squadStats } = await loadAll();

console.log('Estimating team parameters...');
const t0     = Date.now();
const params = estimateParams(matches, elo, squadStats);
console.log(`  Done in ${Date.now() - t0}ms\n`);

// ── Top 10 by attack strength ────────────────────────────────────────────────
const sorted = Object.entries(params).sort((a, b) => b[1].attack - a[1].attack).slice(0, 10);
console.log('Top 10 by attack strength:');
console.log('  Team   Attack  Defense');
for (const [id, p] of sorted) {
  console.log(`  ${id.padEnd(5)} ${String(p.attack).padStart(7)}  ${String(p.defense).padStart(7)}`);
}

// ── Sample match predictions ─────────────────────────────────────────────────
console.log('\nSample match predictions:');
const fixtures = [
  ['FRA', 'ARG'],  // Group I top clash
  ['ENG', 'BRA'],  // hypothetical knockout
  ['ESP', 'GER'],  // classic rivalry
  ['NOR', 'IRQ'],  // group mismatch
];
for (const [a, b] of fixtures) {
  const pred  = predictMatch(a, b, params);
  const score = mostLikelyScore(pred.scoreMatrix);
  console.log(`  ${a} vs ${b}: xG ${pred.xgA}–${pred.xgB}  W/D/L ${(pred.pWin*100).toFixed(1)}/${(pred.pDraw*100).toFixed(1)}/${(pred.pLoss*100).toFixed(1)}%  most likely ${score.goalsA}–${score.goalsB}`);
}

// ── Monte Carlo (1000 sims for speed; use 10000 in production) ───────────────
console.log('\nRunning 1,000 Monte Carlo simulations...');
const t1  = Date.now();
const { probs, meta } = runMonteCarlo(1_000, params);
console.log(`  Done in ${Date.now() - t1}ms  (winner sum: ${meta.winnerProbSum})\n`);

const topWinners = Object.entries(probs)
  .sort((a, b) => b[1].winner - a[1].winner)
  .slice(0, 10);

console.log('Top 10 tournament winner probabilities:');
console.log('  Team   Winner   Final    SF      QF      R16');
for (const [id, p] of topWinners) {
  const fmt = v => (v * 100).toFixed(1).padStart(6) + '%';
  console.log(`  ${id.padEnd(5)} ${fmt(p.winner)} ${fmt(p.final)} ${fmt(p.sf)} ${fmt(p.qf)} ${fmt(p.r16)}`);
}
