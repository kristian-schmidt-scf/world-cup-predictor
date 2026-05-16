// Static WC 2026 fixture data. Groups confirmed from December 5, 2025 draw.
// Dates are approximate (official FIFA schedule; group stage June 11–27).
// Matchday 3 matches within each group kick off simultaneously.

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// Each group: [seed1, seed2, seed3, seed4] (seed1 = host or top-pot team)
export const GROUP_TEAMS = {
  A: ['MEX','KOR','CZE','RSA'],
  B: ['CAN','SUI','BIH','QAT'],
  C: ['BRA','MAR','SCO','HAI'],
  D: ['USA','AUS','TUR','PRY'],
  E: ['GER','ECU','CIV','CUW'],
  F: ['NED','JPN','SWE','TUN'],
  G: ['BEL','IRN','EGY','NZL'],
  H: ['ESP','URU','KSA','CPV'],
  I: ['FRA','SEN','NOR','IRQ'],
  J: ['ARG','JOR','AUT','ALG'],
  K: ['POR','COL','COD','UZB'],
  L: ['ENG','CRO','GHA','PAN'],
};

// Matchday schedules (approximate dates, UTC)
// Pattern: MD1 June 11-17, MD2 June 17-22, MD3 June 24-27 (simultaneous pairs)
const GROUP_DATES = {
  A: { md1: '2026-06-11', md2: '2026-06-15', md3: '2026-06-19' },
  B: { md1: '2026-06-12', md2: '2026-06-16', md3: '2026-06-20' },
  C: { md1: '2026-06-12', md2: '2026-06-16', md3: '2026-06-20' },
  D: { md1: '2026-06-13', md2: '2026-06-17', md3: '2026-06-21' },
  E: { md1: '2026-06-13', md2: '2026-06-17', md3: '2026-06-21' },
  F: { md1: '2026-06-14', md2: '2026-06-18', md3: '2026-06-22' },
  G: { md1: '2026-06-14', md2: '2026-06-18', md3: '2026-06-22' },
  H: { md1: '2026-06-15', md2: '2026-06-19', md3: '2026-06-23' },
  I: { md1: '2026-06-15', md2: '2026-06-19', md3: '2026-06-23' },
  J: { md1: '2026-06-16', md2: '2026-06-20', md3: '2026-06-24' },
  K: { md1: '2026-06-16', md2: '2026-06-20', md3: '2026-06-24' },
  L: { md1: '2026-06-17', md2: '2026-06-21', md3: '2026-06-25' },
};

function groupMatches(group) {
  const [t1, t2, t3, t4] = GROUP_TEAMS[group];
  const d = GROUP_DATES[group];
  return [
    // Matchday 1
    { id: `${group}-MD1-A`, group, matchday: 1, home: t1, away: t2, date: d.md1, stage: 'group' },
    { id: `${group}-MD1-B`, group, matchday: 1, home: t3, away: t4, date: d.md1, stage: 'group' },
    // Matchday 2
    { id: `${group}-MD2-A`, group, matchday: 2, home: t1, away: t3, date: d.md2, stage: 'group' },
    { id: `${group}-MD2-B`, group, matchday: 2, home: t2, away: t4, date: d.md2, stage: 'group' },
    // Matchday 3 (simultaneous)
    { id: `${group}-MD3-A`, group, matchday: 3, home: t1, away: t4, date: d.md3, stage: 'group' },
    { id: `${group}-MD3-B`, group, matchday: 3, home: t2, away: t3, date: d.md3, stage: 'group' },
  ];
}

export const GROUP_FIXTURES = GROUPS.flatMap(groupMatches);

// Knockout slots — teams resolved after group stage simulation
export const KNOCKOUT_SLOTS = [
  // Round of 32 (June 29 – July 2)
  { id: 'R32-1',  stage: 'r32', date: '2026-06-29', slotA: '1A', slotB: '2B' },
  { id: 'R32-2',  stage: 'r32', date: '2026-06-29', slotA: '1C', slotB: '2D' },
  { id: 'R32-3',  stage: 'r32', date: '2026-06-30', slotA: '1E', slotB: '2F' },
  { id: 'R32-4',  stage: 'r32', date: '2026-06-30', slotA: '1G', slotB: '2H' },
  { id: 'R32-5',  stage: 'r32', date: '2026-07-01', slotA: '1I', slotB: '2J' },
  { id: 'R32-6',  stage: 'r32', date: '2026-07-01', slotA: '1K', slotB: '2L' },
  { id: 'R32-7',  stage: 'r32', date: '2026-07-02', slotA: '1B', slotB: '2A' },
  { id: 'R32-8',  stage: 'r32', date: '2026-07-02', slotA: '1D', slotB: '2C' },
  { id: 'R32-9',  stage: 'r32', date: '2026-07-01', slotA: '1F', slotB: '2E' },
  { id: 'R32-10', stage: 'r32', date: '2026-07-01', slotA: '1H', slotB: '2G' },
  { id: 'R32-11', stage: 'r32', date: '2026-07-02', slotA: '1J', slotB: '2I' },
  { id: 'R32-12', stage: 'r32', date: '2026-07-02', slotA: '1L', slotB: '2K' },
  // 8 best 3rd-place slots
  { id: 'R32-13', stage: 'r32', date: '2026-06-29', slotA: '3rd-1', slotB: '3rd-2' },
  { id: 'R32-14', stage: 'r32', date: '2026-06-30', slotA: '3rd-3', slotB: '3rd-4' },
  { id: 'R32-15', stage: 'r32', date: '2026-07-01', slotA: '3rd-5', slotB: '3rd-6' },
  { id: 'R32-16', stage: 'r32', date: '2026-07-02', slotA: '3rd-7', slotB: '3rd-8' },

  // Round of 16 (July 5–8)
  { id: 'R16-1',  stage: 'r16', date: '2026-07-05', slotA: 'W-R32-1',  slotB: 'W-R32-2'  },
  { id: 'R16-2',  stage: 'r16', date: '2026-07-05', slotA: 'W-R32-3',  slotB: 'W-R32-4'  },
  { id: 'R16-3',  stage: 'r16', date: '2026-07-06', slotA: 'W-R32-5',  slotB: 'W-R32-6'  },
  { id: 'R16-4',  stage: 'r16', date: '2026-07-06', slotA: 'W-R32-7',  slotB: 'W-R32-8'  },
  { id: 'R16-5',  stage: 'r16', date: '2026-07-07', slotA: 'W-R32-9',  slotB: 'W-R32-10' },
  { id: 'R16-6',  stage: 'r16', date: '2026-07-07', slotA: 'W-R32-11', slotB: 'W-R32-12' },
  { id: 'R16-7',  stage: 'r16', date: '2026-07-08', slotA: 'W-R32-13', slotB: 'W-R32-14' },
  { id: 'R16-8',  stage: 'r16', date: '2026-07-08', slotA: 'W-R32-15', slotB: 'W-R32-16' },

  // Quarterfinals (July 11–12)
  { id: 'QF-1',   stage: 'qf',  date: '2026-07-11', slotA: 'W-R16-1', slotB: 'W-R16-2' },
  { id: 'QF-2',   stage: 'qf',  date: '2026-07-11', slotA: 'W-R16-3', slotB: 'W-R16-4' },
  { id: 'QF-3',   stage: 'qf',  date: '2026-07-12', slotA: 'W-R16-5', slotB: 'W-R16-6' },
  { id: 'QF-4',   stage: 'qf',  date: '2026-07-12', slotA: 'W-R16-7', slotB: 'W-R16-8' },

  // Semifinals (July 15–16)
  { id: 'SF-1',   stage: 'sf',  date: '2026-07-15', slotA: 'W-QF-1', slotB: 'W-QF-2' },
  { id: 'SF-2',   stage: 'sf',  date: '2026-07-16', slotA: 'W-QF-3', slotB: 'W-QF-4' },

  // Third place (July 19)
  { id: '3PL',    stage: '3pl', date: '2026-07-19', slotA: 'L-SF-1', slotB: 'L-SF-2' },

  // Final (July 19)
  { id: 'FIN',    stage: 'final', date: '2026-07-19', slotA: 'W-SF-1', slotB: 'W-SF-2' },
];

export function getAllFixtures() {
  return [...GROUP_FIXTURES, ...KNOCKOUT_SLOTS];
}
