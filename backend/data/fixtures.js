// Static WC 2026 fixture data. Groups confirmed from December 5, 2025 draw.
// Full match schedule confirmed December 6, 2025 (official FIFA release).
// Kickoff times are UTC, derived from official local times per venue.
// Matchday 3 matches within each group kick off simultaneously.
// Source: en.wikipedia.org/wiki/2026_FIFA_World_Cup (per-group pages)

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

// Official per-group match data. home/away reflect the listed fixture order.
// date = local calendar date at venue; kickoff = UTC timestamp.
const GROUP_FIXTURES_DATA = {
  A: [
    { id: 'A-MD1-A', matchday: 1, home: 'MEX', away: 'RSA', date: '2026-06-11', kickoff: '2026-06-11T19:00:00Z' },
    { id: 'A-MD1-B', matchday: 1, home: 'KOR', away: 'CZE', date: '2026-06-11', kickoff: '2026-06-12T02:00:00Z' },
    { id: 'A-MD2-A', matchday: 2, home: 'CZE', away: 'RSA', date: '2026-06-18', kickoff: '2026-06-18T16:00:00Z' },
    { id: 'A-MD2-B', matchday: 2, home: 'MEX', away: 'KOR', date: '2026-06-18', kickoff: '2026-06-19T01:00:00Z' },
    { id: 'A-MD3-A', matchday: 3, home: 'CZE', away: 'MEX', date: '2026-06-24', kickoff: '2026-06-25T01:00:00Z' },
    { id: 'A-MD3-B', matchday: 3, home: 'RSA', away: 'KOR', date: '2026-06-24', kickoff: '2026-06-25T01:00:00Z' },
  ],
  B: [
    { id: 'B-MD1-A', matchday: 1, home: 'CAN', away: 'BIH', date: '2026-06-12', kickoff: '2026-06-12T19:00:00Z' },
    { id: 'B-MD1-B', matchday: 1, home: 'QAT', away: 'SUI', date: '2026-06-13', kickoff: '2026-06-13T19:00:00Z' },
    { id: 'B-MD2-A', matchday: 2, home: 'SUI', away: 'BIH', date: '2026-06-18', kickoff: '2026-06-18T19:00:00Z' },
    { id: 'B-MD2-B', matchday: 2, home: 'CAN', away: 'QAT', date: '2026-06-18', kickoff: '2026-06-18T22:00:00Z' },
    { id: 'B-MD3-A', matchday: 3, home: 'SUI', away: 'CAN', date: '2026-06-24', kickoff: '2026-06-24T19:00:00Z' },
    { id: 'B-MD3-B', matchday: 3, home: 'BIH', away: 'QAT', date: '2026-06-24', kickoff: '2026-06-24T19:00:00Z' },
  ],
  C: [
    { id: 'C-MD1-A', matchday: 1, home: 'BRA', away: 'MAR', date: '2026-06-13', kickoff: '2026-06-13T22:00:00Z' },
    { id: 'C-MD1-B', matchday: 1, home: 'HAI', away: 'SCO', date: '2026-06-13', kickoff: '2026-06-14T01:00:00Z' },
    { id: 'C-MD2-A', matchday: 2, home: 'SCO', away: 'MAR', date: '2026-06-19', kickoff: '2026-06-19T22:00:00Z' },
    { id: 'C-MD2-B', matchday: 2, home: 'BRA', away: 'HAI', date: '2026-06-19', kickoff: '2026-06-20T00:30:00Z' },
    { id: 'C-MD3-A', matchday: 3, home: 'SCO', away: 'BRA', date: '2026-06-24', kickoff: '2026-06-24T22:00:00Z' },
    { id: 'C-MD3-B', matchday: 3, home: 'MAR', away: 'HAI', date: '2026-06-24', kickoff: '2026-06-24T22:00:00Z' },
  ],
  D: [
    { id: 'D-MD1-A', matchday: 1, home: 'USA', away: 'PRY', date: '2026-06-12', kickoff: '2026-06-13T01:00:00Z' },
    { id: 'D-MD1-B', matchday: 1, home: 'AUS', away: 'TUR', date: '2026-06-13', kickoff: '2026-06-14T04:00:00Z' },
    { id: 'D-MD2-A', matchday: 2, home: 'USA', away: 'AUS', date: '2026-06-19', kickoff: '2026-06-19T19:00:00Z' },
    { id: 'D-MD2-B', matchday: 2, home: 'TUR', away: 'PRY', date: '2026-06-19', kickoff: '2026-06-20T03:00:00Z' },
    { id: 'D-MD3-A', matchday: 3, home: 'TUR', away: 'USA', date: '2026-06-25', kickoff: '2026-06-26T02:00:00Z' },
    { id: 'D-MD3-B', matchday: 3, home: 'PRY', away: 'AUS', date: '2026-06-25', kickoff: '2026-06-26T02:00:00Z' },
  ],
  E: [
    { id: 'E-MD1-A', matchday: 1, home: 'GER', away: 'CUW', date: '2026-06-14', kickoff: '2026-06-14T17:00:00Z' },
    { id: 'E-MD1-B', matchday: 1, home: 'CIV', away: 'ECU', date: '2026-06-14', kickoff: '2026-06-14T23:00:00Z' },
    { id: 'E-MD2-A', matchday: 2, home: 'GER', away: 'CIV', date: '2026-06-20', kickoff: '2026-06-20T20:00:00Z' },
    { id: 'E-MD2-B', matchday: 2, home: 'ECU', away: 'CUW', date: '2026-06-20', kickoff: '2026-06-21T00:00:00Z' },
    { id: 'E-MD3-A', matchday: 3, home: 'CUW', away: 'CIV', date: '2026-06-25', kickoff: '2026-06-25T20:00:00Z' },
    { id: 'E-MD3-B', matchday: 3, home: 'ECU', away: 'GER', date: '2026-06-25', kickoff: '2026-06-25T20:00:00Z' },
  ],
  F: [
    { id: 'F-MD1-A', matchday: 1, home: 'NED', away: 'JPN', date: '2026-06-14', kickoff: '2026-06-14T20:00:00Z' },
    { id: 'F-MD1-B', matchday: 1, home: 'SWE', away: 'TUN', date: '2026-06-14', kickoff: '2026-06-15T02:00:00Z' },
    { id: 'F-MD2-A', matchday: 2, home: 'NED', away: 'SWE', date: '2026-06-20', kickoff: '2026-06-20T17:00:00Z' },
    { id: 'F-MD2-B', matchday: 2, home: 'TUN', away: 'JPN', date: '2026-06-20', kickoff: '2026-06-21T04:00:00Z' },
    { id: 'F-MD3-A', matchday: 3, home: 'JPN', away: 'SWE', date: '2026-06-25', kickoff: '2026-06-25T23:00:00Z' },
    { id: 'F-MD3-B', matchday: 3, home: 'TUN', away: 'NED', date: '2026-06-25', kickoff: '2026-06-25T23:00:00Z' },
  ],
  G: [
    { id: 'G-MD1-A', matchday: 1, home: 'BEL', away: 'EGY', date: '2026-06-15', kickoff: '2026-06-15T19:00:00Z' },
    { id: 'G-MD1-B', matchday: 1, home: 'IRN', away: 'NZL', date: '2026-06-15', kickoff: '2026-06-16T01:00:00Z' },
    { id: 'G-MD2-A', matchday: 2, home: 'BEL', away: 'IRN', date: '2026-06-21', kickoff: '2026-06-21T19:00:00Z' },
    { id: 'G-MD2-B', matchday: 2, home: 'NZL', away: 'EGY', date: '2026-06-21', kickoff: '2026-06-22T01:00:00Z' },
    { id: 'G-MD3-A', matchday: 3, home: 'EGY', away: 'IRN', date: '2026-06-26', kickoff: '2026-06-27T03:00:00Z' },
    { id: 'G-MD3-B', matchday: 3, home: 'NZL', away: 'BEL', date: '2026-06-26', kickoff: '2026-06-27T03:00:00Z' },
  ],
  H: [
    { id: 'H-MD1-A', matchday: 1, home: 'ESP', away: 'CPV', date: '2026-06-15', kickoff: '2026-06-15T16:00:00Z' },
    { id: 'H-MD1-B', matchday: 1, home: 'KSA', away: 'URU', date: '2026-06-15', kickoff: '2026-06-15T22:00:00Z' },
    { id: 'H-MD2-A', matchday: 2, home: 'ESP', away: 'KSA', date: '2026-06-21', kickoff: '2026-06-21T16:00:00Z' },
    { id: 'H-MD2-B', matchday: 2, home: 'URU', away: 'CPV', date: '2026-06-21', kickoff: '2026-06-21T22:00:00Z' },
    { id: 'H-MD3-A', matchday: 3, home: 'CPV', away: 'KSA', date: '2026-06-26', kickoff: '2026-06-27T00:00:00Z' },
    { id: 'H-MD3-B', matchday: 3, home: 'URU', away: 'ESP', date: '2026-06-26', kickoff: '2026-06-27T00:00:00Z' },
  ],
  I: [
    { id: 'I-MD1-A', matchday: 1, home: 'FRA', away: 'SEN', date: '2026-06-16', kickoff: '2026-06-16T19:00:00Z' },
    { id: 'I-MD1-B', matchday: 1, home: 'IRQ', away: 'NOR', date: '2026-06-16', kickoff: '2026-06-16T22:00:00Z' },
    { id: 'I-MD2-A', matchday: 2, home: 'FRA', away: 'IRQ', date: '2026-06-22', kickoff: '2026-06-22T21:00:00Z' },
    { id: 'I-MD2-B', matchday: 2, home: 'NOR', away: 'SEN', date: '2026-06-22', kickoff: '2026-06-23T00:00:00Z' },
    { id: 'I-MD3-A', matchday: 3, home: 'NOR', away: 'FRA', date: '2026-06-26', kickoff: '2026-06-26T19:00:00Z' },
    { id: 'I-MD3-B', matchday: 3, home: 'SEN', away: 'IRQ', date: '2026-06-26', kickoff: '2026-06-26T19:00:00Z' },
  ],
  J: [
    { id: 'J-MD1-A', matchday: 1, home: 'ARG', away: 'ALG', date: '2026-06-16', kickoff: '2026-06-17T01:00:00Z' },
    { id: 'J-MD1-B', matchday: 1, home: 'AUT', away: 'JOR', date: '2026-06-16', kickoff: '2026-06-17T04:00:00Z' },
    { id: 'J-MD2-A', matchday: 2, home: 'ARG', away: 'AUT', date: '2026-06-22', kickoff: '2026-06-22T17:00:00Z' },
    { id: 'J-MD2-B', matchday: 2, home: 'JOR', away: 'ALG', date: '2026-06-22', kickoff: '2026-06-23T03:00:00Z' },
    { id: 'J-MD3-A', matchday: 3, home: 'ALG', away: 'AUT', date: '2026-06-27', kickoff: '2026-06-28T02:00:00Z' },
    { id: 'J-MD3-B', matchday: 3, home: 'JOR', away: 'ARG', date: '2026-06-27', kickoff: '2026-06-28T02:00:00Z' },
  ],
  K: [
    { id: 'K-MD1-A', matchday: 1, home: 'POR', away: 'COD', date: '2026-06-17', kickoff: '2026-06-17T17:00:00Z' },
    { id: 'K-MD1-B', matchday: 1, home: 'UZB', away: 'COL', date: '2026-06-17', kickoff: '2026-06-18T02:00:00Z' },
    { id: 'K-MD2-A', matchday: 2, home: 'POR', away: 'UZB', date: '2026-06-23', kickoff: '2026-06-23T17:00:00Z' },
    { id: 'K-MD2-B', matchday: 2, home: 'COL', away: 'COD', date: '2026-06-23', kickoff: '2026-06-24T02:00:00Z' },
    { id: 'K-MD3-A', matchday: 3, home: 'COL', away: 'POR', date: '2026-06-27', kickoff: '2026-06-27T23:30:00Z' },
    { id: 'K-MD3-B', matchday: 3, home: 'COD', away: 'UZB', date: '2026-06-27', kickoff: '2026-06-27T23:30:00Z' },
  ],
  L: [
    { id: 'L-MD1-A', matchday: 1, home: 'ENG', away: 'CRO', date: '2026-06-17', kickoff: '2026-06-17T20:00:00Z' },
    { id: 'L-MD1-B', matchday: 1, home: 'GHA', away: 'PAN', date: '2026-06-17', kickoff: '2026-06-17T23:00:00Z' },
    { id: 'L-MD2-A', matchday: 2, home: 'ENG', away: 'GHA', date: '2026-06-23', kickoff: '2026-06-23T20:00:00Z' },
    { id: 'L-MD2-B', matchday: 2, home: 'PAN', away: 'CRO', date: '2026-06-23', kickoff: '2026-06-23T23:00:00Z' },
    { id: 'L-MD3-A', matchday: 3, home: 'PAN', away: 'ENG', date: '2026-06-27', kickoff: '2026-06-27T21:00:00Z' },
    { id: 'L-MD3-B', matchday: 3, home: 'CRO', away: 'GHA', date: '2026-06-27', kickoff: '2026-06-27T21:00:00Z' },
  ],
};

export const GROUP_FIXTURES = GROUPS.flatMap(group =>
  GROUP_FIXTURES_DATA[group].map(m => ({ ...m, group, stage: 'group' }))
);

// Knockout slots — teams resolved after group stage simulation
export const KNOCKOUT_SLOTS = [
  // Round of 32 (June 28 – July 3)
  { id: 'R32-1',  stage: 'r32', date: '2026-06-28', slotA: '1A', slotB: '2B' },
  { id: 'R32-2',  stage: 'r32', date: '2026-06-29', slotA: '1C', slotB: '2D' },
  { id: 'R32-3',  stage: 'r32', date: '2026-06-29', slotA: '1E', slotB: '2F' },
  { id: 'R32-13', stage: 'r32', date: '2026-06-29', slotA: '3rd-1', slotB: '3rd-2' },
  { id: 'R32-4',  stage: 'r32', date: '2026-06-30', slotA: '1G', slotB: '2H' },
  { id: 'R32-5',  stage: 'r32', date: '2026-06-30', slotA: '1I', slotB: '2J' },
  { id: 'R32-14', stage: 'r32', date: '2026-06-30', slotA: '3rd-3', slotB: '3rd-4' },
  { id: 'R32-6',  stage: 'r32', date: '2026-07-01', slotA: '1K', slotB: '2L' },
  { id: 'R32-7',  stage: 'r32', date: '2026-07-01', slotA: '1B', slotB: '2A' },
  { id: 'R32-15', stage: 'r32', date: '2026-07-01', slotA: '3rd-5', slotB: '3rd-6' },
  { id: 'R32-8',  stage: 'r32', date: '2026-07-02', slotA: '1D', slotB: '2C' },
  { id: 'R32-9',  stage: 'r32', date: '2026-07-02', slotA: '1F', slotB: '2E' },
  { id: 'R32-10', stage: 'r32', date: '2026-07-02', slotA: '1H', slotB: '2G' },
  { id: 'R32-11', stage: 'r32', date: '2026-07-03', slotA: '1J', slotB: '2I' },
  { id: 'R32-12', stage: 'r32', date: '2026-07-03', slotA: '1L', slotB: '2K' },
  { id: 'R32-16', stage: 'r32', date: '2026-07-03', slotA: '3rd-7', slotB: '3rd-8' },

  // Round of 16 (July 4–7)
  { id: 'R16-1',  stage: 'r16', date: '2026-07-04', slotA: 'W-R32-1',  slotB: 'W-R32-2'  },
  { id: 'R16-2',  stage: 'r16', date: '2026-07-04', slotA: 'W-R32-3',  slotB: 'W-R32-4'  },
  { id: 'R16-3',  stage: 'r16', date: '2026-07-05', slotA: 'W-R32-5',  slotB: 'W-R32-6'  },
  { id: 'R16-4',  stage: 'r16', date: '2026-07-05', slotA: 'W-R32-7',  slotB: 'W-R32-8'  },
  { id: 'R16-5',  stage: 'r16', date: '2026-07-06', slotA: 'W-R32-9',  slotB: 'W-R32-10' },
  { id: 'R16-6',  stage: 'r16', date: '2026-07-06', slotA: 'W-R32-11', slotB: 'W-R32-12' },
  { id: 'R16-7',  stage: 'r16', date: '2026-07-07', slotA: 'W-R32-13', slotB: 'W-R32-14' },
  { id: 'R16-8',  stage: 'r16', date: '2026-07-07', slotA: 'W-R32-15', slotB: 'W-R32-16' },

  // Quarterfinals (July 9–11)
  { id: 'QF-1',   stage: 'qf',  date: '2026-07-09', slotA: 'W-R16-1', slotB: 'W-R16-2' },
  { id: 'QF-2',   stage: 'qf',  date: '2026-07-10', slotA: 'W-R16-3', slotB: 'W-R16-4' },
  { id: 'QF-3',   stage: 'qf',  date: '2026-07-11', slotA: 'W-R16-5', slotB: 'W-R16-6' },
  { id: 'QF-4',   stage: 'qf',  date: '2026-07-11', slotA: 'W-R16-7', slotB: 'W-R16-8' },

  // Semifinals (July 14–15)
  { id: 'SF-1',   stage: 'sf',  date: '2026-07-14', slotA: 'W-QF-1', slotB: 'W-QF-2' },
  { id: 'SF-2',   stage: 'sf',  date: '2026-07-15', slotA: 'W-QF-3', slotB: 'W-QF-4' },

  // Third place (July 18)
  { id: '3PL',    stage: '3pl', date: '2026-07-18', slotA: 'L-SF-1', slotB: 'L-SF-2' },

  // Final (July 19)
  { id: 'FIN',    stage: 'final', date: '2026-07-19', slotA: 'W-SF-1', slotB: 'W-SF-2' },
];

export function getAllFixtures() {
  return [...GROUP_FIXTURES, ...KNOCKOUT_SLOTS];
}
