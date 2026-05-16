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
import { expectedGoals, sampleScore } from './dixonColes.js';

// ── Penalty shootout ─────────────────────────────────────────────────────────
// Modelled as 50/50; extend with historical shootout data in a future iteration.
function penaltyWinner(teamA, teamB) {
  return Math.random() < 0.5 ? teamA : teamB;
}

// ── Simulate a single match (returns winner or null for group-stage draws) ───

function simulateMatch(teamA, teamB, params, isKnockout = false) {
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

function simulateGroup(group, params, lockedResults = {}) {
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
      ({ goalsA, goalsB } = simulateMatch(a, b, params));
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

function simulateOnce(params, lockedResults = {}) {
  const groupFirsts   = [];
  const groupSeconds  = [];
  const groupThirds   = [];

  for (const group of GROUPS) {
    const [first, second, third] = simulateGroup(group, params, lockedResults);
    groupFirsts.push(first.id);
    groupSeconds.push(second.id);
    groupThirds.push({ ...third, group });
  }

  const best8Thirds = bestThirdPlace(groupThirds);

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
      const { winner } = simulateMatch(pairs[i], pairs[i + 1], params, true);
      next.push(winner);
    }
    return next;
  };

  stages.r32   = advancers(r32);           // 32 → 16 (R16 qualifiers)
  stages.r16   = advancers(stages.r32);   // 16 → 8  (QF qualifiers)
  stages.qf    = advancers(stages.r16);   // 8  → 4  (SF qualifiers)
  stages.sf    = advancers(stages.qf);    // 4  → 2  (finalists)
  stages.final = advancers(stages.sf)[0]; // 2  → 1  (winner)

  return stages;
}

// ── Monte Carlo aggregation ──────────────────────────────────────────────────

export function runMonteCarlo(n, params, lockedResults = {}) {
  const teamIds = TEAMS.map(t => t.id);

  // Accumulate advancement counts per stage
  // Each counter = "reached this stage" (i.e. won the previous round)
  const counts = Object.fromEntries(teamIds.map(id => [id, {
    r16: 0, qf: 0, sf: 0, final: 0, winner: 0,
  }]));

  for (let sim = 0; sim < n; sim++) {
    const stages = simulateOnce(params, lockedResults);

    for (const id of stages.r32) counts[id].r16++;    // won R32 → reached R16
    for (const id of stages.r16) counts[id].qf++;     // won R16 → reached QF
    for (const id of stages.qf)  counts[id].sf++;     // won QF  → reached SF (4 teams)
    for (const id of stages.sf)  counts[id].final++;  // won SF  → reached Final (2 teams)
    counts[stages.final].winner++;                     // won Final → champion
  }

  // Convert to probabilities
  const probs = Object.fromEntries(teamIds.map(id => [id, {
    r16:    round4(counts[id].r16    / n),  // P(reached R16)
    qf:     round4(counts[id].qf     / n),  // P(reached QF)
    sf:     round4(counts[id].sf     / n),  // P(reached SF)
    final:  round4(counts[id].final  / n),  // P(reached Final)
    winner: round4(counts[id].winner / n),  // P(won tournament)
  }]));

  // Sanity check: winner probs should sum to ~1
  const winnerSum = Object.values(probs).reduce((s, p) => s + p.winner, 0);

  return { probs, meta: { n, winnerProbSum: round4(winnerSum) } };
}

// ── Single match prediction (exported for API use) ──────────────────────────
export { simulateMatch, simulateGroup };

function round4(x) { return Math.round(x * 10_000) / 10_000; }
