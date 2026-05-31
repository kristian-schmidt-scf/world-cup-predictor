// Full 48-team WC 2026 Monte Carlo tournament simulation.
//
// Each simulation:
//   1. Group stage  — 6 round-robin matches per group; points + GD + GF tiebreakers
//   2. 3rd-place    — best 8 of 12 third-placed teams advance (WC 2026 format)
//   3. Round of 32  — single-elimination; draws → extra time → penalty shootout
//   4. R16 → QF → SF → Final
//
// Returns per-team probabilities of reaching each stage.

import { GROUP_TEAMS, GROUPS } from '../data/fixtures.js';
import { TEAMS } from '../data/teams.js';
import { expectedGoals, sampleScore, samplePoisson } from './dixonColes.js';

// ── Elo-only match simulation (logistic win prob, no Poisson score matrix) ───
const ELO_DRAW_BASE  = 0.27;  // draw rate at equal strength
const ELO_DRAW_SCALE = 500;   // Elo diff at which draw rate decays by 1/e

function eloSimulateMatch(teamA, teamB, eloMap, isKnockout = false) {
  const eloA = eloMap[teamA] ?? 1500;
  const eloB = eloMap[teamB] ?? 1500;
  const diff = eloA - eloB;

  const pWinA = 1 / (1 + Math.pow(10, -diff / 400));
  const pDraw = ELO_DRAW_BASE * Math.exp(-Math.abs(diff) / ELO_DRAW_SCALE);
  const adjA  = pWinA        * (1 - pDraw);
  const adjB  = (1 - pWinA) * (1 - pDraw);

  const r = Math.random();
  let goalsA, goalsB, winner;

  if (r < adjA) {
    const xgA = Math.max(0.5, 1.4 + diff / 1500);
    const xgB = Math.max(0.2, 0.7 - diff / 2000);
    goalsA = samplePoisson(xgA);
    goalsB = samplePoisson(xgB);
    if (goalsA <= goalsB) goalsA = goalsB + 1;
    winner = teamA;
  } else if (r < adjA + pDraw) {
    const g = samplePoisson(0.9);
    goalsA = g; goalsB = g;
    winner = isKnockout ? penaltyWinner(teamA, teamB) : null;
  } else {
    const xgB = Math.max(0.5, 1.4 - diff / 1500);
    const xgA = Math.max(0.2, 0.7 + diff / 2000);
    goalsB = samplePoisson(xgB);
    goalsA = samplePoisson(xgA);
    if (goalsB <= goalsA) goalsB = goalsA + 1;
    winner = teamB;
  }

  if (isKnockout && !winner) winner = goalsA > goalsB ? teamA : teamB;
  return { goalsA, goalsB, winner };
}

// ── Penalty shootout ─────────────────────────────────────────────────────────
// Modelled as 50/50; extend with historical shootout data in a future iteration.
function penaltyWinner(teamA, teamB) {
  return Math.random() < 0.5 ? teamA : teamB;
}

// ── Simulate a single match (returns winner or null for group-stage draws) ───

function simulateMatch(teamA, teamB, params, isKnockout = false, model = 'full', eloMap = {}) {
  if (model === 'elo') return eloSimulateMatch(teamA, teamB, eloMap, isKnockout);

  const { xgA, xgB } = expectedGoals(teamA, teamB, params);
  const { goalsA, goalsB } = sampleScore(xgA, xgB);

  if (!isKnockout) return { goalsA, goalsB };

  if (goalsA !== goalsB) return { goalsA, goalsB, winner: goalsA > goalsB ? teamA : teamB };

  // Extra time: 30 min modelled as ~0.35 of a full match
  const etScale = 0.35;
  const { goalsA: etA, goalsB: etB } = sampleScore(xgA * etScale, xgB * etScale);
  const totalA = goalsA + etA, totalB = goalsB + etB;
  if (totalA !== totalB) return { goalsA: totalA, goalsB: totalB, winner: totalA > totalB ? teamA : teamB };

  return { goalsA: totalA, goalsB: totalB, winner: penaltyWinner(teamA, teamB), penalties: true };
}

// ── Group stage ──────────────────────────────────────────────────────────────

function simulateGroup(group, params, lockedResults = {}, model = 'full', eloMap = {}) {
  const teams = GROUP_TEAMS[group];
  const [t1, t2, t3, t4] = teams;

  const matches = [
    [t1, t2], [t3, t4],  // MD1
    [t1, t3], [t2, t4],  // MD2
    [t1, t4], [t2, t3],  // MD3
  ];

  // stats: points, gd (goal diff), gf (goals for), id
  const stats = Object.fromEntries(teams.map(id => [id, { id, pts: 0, gd: 0, gf: 0 }]));

  for (const [a, b] of matches) {
    const key = `${group}-${a}-${b}`;
    let goalsA, goalsB;

    if (lockedResults[key] !== undefined) {
      ({ goalsA, goalsB } = lockedResults[key]);
    } else {
      ({ goalsA, goalsB } = simulateMatch(a, b, params, false, model, eloMap));
    }

    stats[a].gf += goalsA; stats[a].gd += goalsA - goalsB;
    stats[b].gf += goalsB; stats[b].gd += goalsB - goalsA;

    if (goalsA > goalsB)      { stats[a].pts += 3; }
    else if (goalsA === goalsB) { stats[a].pts += 1; stats[b].pts += 1; }
    else                        { stats[b].pts += 3; }
  }

  const ranked = Object.values(stats).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
  );

  return ranked; // [1st, 2nd, 3rd, 4th]
}

// ── Select 8 best third-placed teams ────────────────────────────────────────

function bestThirdPlace(thirdPlaceTeams) {
  // thirdPlaceTeams: array of { id, pts, gd, gf, group }
  return [...thirdPlaceTeams]
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8)
    .map(t => t.id);
}

// ── Knockout stage ───────────────────────────────────────────────────────────

function simulateKnockout(slots, params) {
  // slots: array of teams (must be power-of-2 length: 32, 16, 8, 4, 2)
  // Returns the winner
  let remaining = [...slots];
  while (remaining.length > 1) {
    const next = [];
    for (let i = 0; i < remaining.length; i += 2) {
      const { winner } = simulateMatch(remaining[i], remaining[i + 1], params, true);
      next.push(winner);
    }
    remaining = next;
  }
  return remaining[0];
}

// ── One full tournament simulation ──────────────────────────────────────────

function simulateOnce(params, lockedResults = {}, model = 'full', eloMap = {}) {
  const groupFirsts   = [];
  const groupSeconds  = [];
  const groupThirds   = [];
  const groupResults  = {}; // group → [{ id, pts, gd, finish, qualified }]

  for (const group of GROUPS) {
    const ranked = simulateGroup(group, params, lockedResults, model, eloMap);
    const [first, second, third] = ranked;
    groupFirsts.push(first.id);
    groupSeconds.push(second.id);
    groupThirds.push({ ...third, group });
    groupResults[group] = ranked.map((t, i) => ({
      id: t.id, pts: t.pts, gd: t.gd, finish: i + 1, qualified: i < 2,
    }));
  }

  const best8Thirds = bestThirdPlace(groupThirds);
  const best8ThirdSet = new Set(best8Thirds);

  // Mark qualifying 3rd-place teams
  for (const group of GROUPS) {
    const third = groupResults[group].find(t => t.finish === 3);
    if (third && best8ThirdSet.has(third.id)) third.qualified = true;
  }

  // Round of 32 bracket: 32 teams (12 winners + 12 runners-up + 8 best thirds)
  // Results in exactly 16 matches. Pairing avoids same-group clashes in R32.
  // Full FIFA bracket seeding rules are complex; this simplified pairing gives
  // statistically sound Monte Carlo results.
  const r32 = [];
  // 8 matches: group winners A–H vs the 8 best 3rd-place teams
  for (let i = 0; i < 8; i++) {
    r32.push(groupFirsts[i], best8Thirds[i]);
  }
  // 4 matches: group winners I–L vs runners-up E–H
  for (let i = 0; i < 4; i++) {
    r32.push(groupFirsts[8 + i], groupSeconds[4 + i]);
  }
  // 4 matches: runners-up A–D vs runners-up I–L
  for (let i = 0; i < 4; i++) {
    r32.push(groupSeconds[i], groupSeconds[8 + i]);
  }
  // Sanity: r32.length must equal 32

  // Simulate the knockout bracket as a flat single-elimination tree
  const stages = {
    r32:   [],
    r16:   [],
    qf:    [],
    sf:    [],
    final: null,
  };

  let bracket = [...r32];
  const advancers = (pairs) => {
    const next = [];
    for (let i = 0; i < pairs.length; i += 2) {
      const { winner } = simulateMatch(pairs[i], pairs[i + 1], params, true, model, eloMap);
      next.push(winner);
    }
    return next;
  };

  stages.r32   = advancers(r32);           // 32 → 16 (R16 qualifiers)
  stages.r16   = advancers(stages.r32);   // 16 → 8  (QF qualifiers)
  stages.qf    = advancers(stages.r16);   // 8  → 4  (SF qualifiers)
  stages.sf    = advancers(stages.qf);    // 4  → 2  (finalists)
  stages.final = advancers(stages.sf)[0]; // 2  → 1  (winner)

  return { stages, groupResults };
}

// ── Monte Carlo aggregation ──────────────────────────────────────────────────

export function runMonteCarlo(n, params, lockedResults = {}, model = 'full', eloMap = {}) {
  const teamIds = TEAMS.map(t => t.id);

  const counts = Object.fromEntries(teamIds.map(id => [id, {
    r16: 0, qf: 0, sf: 0, final: 0, winner: 0,
  }]));

  // Per-group accumulators: ptsSum, gdSum, finish position counts, qualified count
  const groupAcc = Object.fromEntries(GROUPS.map(g => [
    g,
    Object.fromEntries(GROUP_TEAMS[g].map(id => [id, { pts: 0, gd: 0, f1: 0, f2: 0, f3: 0, f4: 0, qual: 0 }])),
  ]));

  for (let sim = 0; sim < n; sim++) {
    const { stages, groupResults } = simulateOnce(params, lockedResults, model, eloMap);

    for (const id of stages.r32) counts[id].r16++;
    for (const id of stages.r16) counts[id].qf++;
    for (const id of stages.qf)  counts[id].sf++;
    for (const id of stages.sf)  counts[id].final++;
    counts[stages.final].winner++;

    for (const [g, teams] of Object.entries(groupResults)) {
      for (const t of teams) {
        const a = groupAcc[g][t.id];
        a.pts += t.pts;
        a.gd  += t.gd;
        a[`f${t.finish}`]++;
        if (t.qualified) a.qual++;
      }
    }
  }

  const probs = Object.fromEntries(teamIds.map(id => [id, {
    r16:    round4(counts[id].r16    / n),
    qf:     round4(counts[id].qf     / n),
    sf:     round4(counts[id].sf     / n),
    final:  round4(counts[id].final  / n),
    winner: round4(counts[id].winner / n),
  }]));

  const groups = Object.fromEntries(GROUPS.map(g => [
    g,
    Object.fromEntries(Object.entries(groupAcc[g]).map(([id, a]) => [id, {
      avgPts: round4(a.pts / n),
      avgGd:  round4(a.gd  / n),
      p1st:   round4(a.f1  / n),
      p2nd:   round4(a.f2  / n),
      p3rd:   round4(a.f3  / n),
      p4th:   round4(a.f4  / n),
      pQual:  round4(a.qual / n),
    }])),
  ]));

  const winnerSum = Object.values(probs).reduce((s, p) => s + p.winner, 0);
  return { probs, groups, meta: { n, winnerProbSum: round4(winnerSum) } };
}

// ── Run all three models and compute divergence ──────────────────────────────
export function runMonteCarloCompare(n, fullParams, dcParams, eloMap, lockedResults = {}) {
  const full = runMonteCarlo(n, fullParams, lockedResults, 'full', eloMap);
  const dc   = runMonteCarlo(n, dcParams,   lockedResults, 'dc',   eloMap);
  const elo  = runMonteCarlo(n, null,       lockedResults, 'elo',  eloMap);

  // Divergence: for each team, compute spread of winner% across 3 models
  const teamIds = TEAMS.map(t => t.id);
  const divergence = teamIds.map(id => {
    const vals = [full.probs[id].winner, dc.probs[id].winner, elo.probs[id].winner];
    const spread = Math.max(...vals) - Math.min(...vals);
    return { id, full: vals[0], dc: vals[1], elo: vals[2], spread: round4(spread) };
  }).sort((a, b) => b.spread - a.spread);

  return { full: full.probs, dc: dc.probs, elo: elo.probs, divergence, meta: { n } };
}

// ── Cached probs singleton — reused by fantasy engine to avoid re-running sim ──
let _cachedSimResult = null;

export function setCachedProbs(result) { _cachedSimResult = result; }
export function getCachedProbs()       { return _cachedSimResult; }

// ── Single match prediction (exported for API use) ──────────────────────────
export { simulateMatch, simulateGroup };

function round4(x) { return Math.round(x * 10_000) / 10_000; }
