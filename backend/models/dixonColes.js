// Dixon-Coles Poisson model for match prediction.
//
// Per-match output:
//   xgA, xgB          – expected goals for each team
//   pWin, pDraw, pLoss – outcome probabilities
//   scoreMatrix        – P(scoreA=i, scoreB=j) up to MAX_SCORE × MAX_SCORE
//
// The τ correction adjusts the over-frequency of low-score results
// (0-0, 1-0, 0-1, 1-1) relative to independent Poisson.
// ρ ≈ -0.13 is the standard literature estimate for football.

import { MAX_SCORE } from './hierarchicalBayesian.js';

const RHO_DEFAULT = -0.13;  // Dixon-Coles low-score correlation; negative → more draws/low-score results
const MAX_G       = MAX_SCORE;

// ── Precompute log-factorials for Poisson PMF ───────────────────────────────

const LOG_FACT = new Float64Array(MAX_G + 2);
for (let k = 1; k <= MAX_G + 1; k++) LOG_FACT[k] = LOG_FACT[k - 1] + Math.log(k);

function poissonPmf(k, lambda) {
  if (k < 0 || k > MAX_G) return 0;
  return Math.exp(k * Math.log(lambda + 1e-10) - lambda - LOG_FACT[k]);
}

// Dixon-Coles τ correction for joint low-score probability
function tau(x, y, lambdaA, lambdaB, rho) {
  if (x === 0 && y === 0) return 1 - lambdaA * lambdaB * rho;
  if (x === 1 && y === 0) return 1 + lambdaB * rho;
  if (x === 0 && y === 1) return 1 + lambdaA * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

// ── Expected goals ───────────────────────────────────────────────────────────

export function expectedGoals(teamA, teamB, params) {
  const a = params[teamA];
  const b = params[teamB];
  if (!a || !b) throw new Error(`Unknown team: ${!a ? teamA : teamB}`);
  // Neutral venue — no home advantage
  return {
    xgA: Math.exp(a.attack + b.defense),
    xgB: Math.exp(b.attack + a.defense),
  };
}

// ── Score probability matrix ─────────────────────────────────────────────────

export function scoreMatrix(xgA, xgB, rho = RHO_DEFAULT) {
  const matrix = [];
  for (let i = 0; i <= MAX_G; i++) {
    matrix[i] = [];
    for (let j = 0; j <= MAX_G; j++) {
      matrix[i][j] = tau(i, j, xgA, xgB, rho) * poissonPmf(i, xgA) * poissonPmf(j, xgB);
    }
  }
  return matrix;
}

// ── Win / draw / loss probabilities ─────────────────────────────────────────

export function outcomeProbs(matrix) {
  let pWin = 0, pDraw = 0, pLoss = 0;
  for (let i = 0; i <= MAX_G; i++) {
    for (let j = 0; j <= MAX_G; j++) {
      const p = matrix[i][j];
      if (i > j) pWin  += p;
      else if (i === j) pDraw += p;
      else pLoss += p;
    }
  }
  // Renormalise to ensure probabilities sum to 1
  const total = pWin + pDraw + pLoss;
  return {
    pWin:  pWin  / total,
    pDraw: pDraw / total,
    pLoss: pLoss / total,
  };
}

// ── Full match prediction ────────────────────────────────────────────────────

export function predictMatch(teamA, teamB, params, rho = RHO_DEFAULT) {
  const { xgA, xgB } = expectedGoals(teamA, teamB, params);
  const matrix = scoreMatrix(xgA, xgB, rho);
  const { pWin, pDraw, pLoss } = outcomeProbs(matrix);

  return {
    teamA, teamB,
    xgA: round2(xgA),
    xgB: round2(xgB),
    pWin:  round4(pWin),
    pDraw: round4(pDraw),
    pLoss: round4(pLoss),
    scoreMatrix: matrix,
  };
}

// ── Fast Poisson sampler for Monte Carlo ────────────────────────────────────
// Knuth algorithm — efficient for λ < ~30 (football goals are always well below this)

export function samplePoisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// Sample a single match score (for simulation — skips τ correction for speed)
export function sampleScore(xgA, xgB) {
  return { goalsA: samplePoisson(xgA), goalsB: samplePoisson(xgB) };
}

// ── Most likely score ────────────────────────────────────────────────────────

export function mostLikelyScore(matrix) {
  let best = { i: 0, j: 0, p: -1 };
  for (let i = 0; i <= MAX_G; i++) {
    for (let j = 0; j <= MAX_G; j++) {
      if (matrix[i][j] > best.p) best = { i, j, p: matrix[i][j] };
    }
  }
  return { goalsA: best.i, goalsB: best.j, prob: round4(best.p) };
}

function round2(x) { return Math.round(x * 100)   / 100;   }
function round4(x) { return Math.round(x * 10_000) / 10_000; }
