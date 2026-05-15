// Static team data: 48 WC 2026 teams with FIFA ranking baseline.
// Rankings are approximate as of November 2025 (draw date).
// Attack/defense ratings are seeded here; the Bayesian model overwrites
// them once calibrated against historical match results.

export const TEAMS = [
  // Group A
  { id: 'MEX', name: 'Mexico',             group: 'A', fifaRank: 13, fifaPts: 1605, confederation: 'CONCACAF' },
  { id: 'RSA', name: 'South Africa',        group: 'A', fifaRank: 37, fifaPts: 1430, confederation: 'CAF' },
  { id: 'KOR', name: 'South Korea',         group: 'A', fifaRank: 21, fifaPts: 1540, confederation: 'AFC' },
  { id: 'CZE', name: 'Czechia',             group: 'A', fifaRank: 28, fifaPts: 1485, confederation: 'UEFA' },

  // Group B
  { id: 'CAN', name: 'Canada',              group: 'B', fifaRank: 27, fifaPts: 1495, confederation: 'CONCACAF' },
  { id: 'BIH', name: 'Bosnia-Herzegovina',  group: 'B', fifaRank: 35, fifaPts: 1445, confederation: 'UEFA' },
  { id: 'QAT', name: 'Qatar',               group: 'B', fifaRank: 33, fifaPts: 1455, confederation: 'AFC' },
  { id: 'SUI', name: 'Switzerland',         group: 'B', fifaRank: 18, fifaPts: 1565, confederation: 'UEFA' },

  // Group C
  { id: 'BRA', name: 'Brazil',              group: 'C', fifaRank: 5,  fifaPts: 1715, confederation: 'CONMEBOL' },
  { id: 'MAR', name: 'Morocco',             group: 'C', fifaRank: 14, fifaPts: 1598, confederation: 'CAF' },
  { id: 'HAI', name: 'Haiti',               group: 'C', fifaRank: 40, fifaPts: 1390, confederation: 'CONCACAF' },
  { id: 'SCO', name: 'Scotland',            group: 'C', fifaRank: 29, fifaPts: 1480, confederation: 'UEFA' },

  // Group D
  { id: 'USA', name: 'United States',       group: 'D', fifaRank: 12, fifaPts: 1610, confederation: 'CONCACAF' },
  { id: 'PRY', name: 'Paraguay',            group: 'D', fifaRank: 36, fifaPts: 1440, confederation: 'CONMEBOL' },
  { id: 'AUS', name: 'Australia',           group: 'D', fifaRank: 22, fifaPts: 1570, confederation: 'AFC' },
  { id: 'TUR', name: 'Türkiye',             group: 'D', fifaRank: 25, fifaPts: 1518, confederation: 'UEFA' },

  // Group E
  { id: 'GER', name: 'Germany',             group: 'E', fifaRank: 7,  fifaPts: 1671, confederation: 'UEFA' },
  { id: 'CUW', name: 'Curaçao',             group: 'E', fifaRank: 48, fifaPts: 1270, confederation: 'CONCACAF' },
  { id: 'CIV', name: 'Ivory Coast',         group: 'E', fifaRank: 26, fifaPts: 1510, confederation: 'CAF' },
  { id: 'ECU', name: 'Ecuador',             group: 'E', fifaRank: 20, fifaPts: 1545, confederation: 'CONMEBOL' },

  // Group F
  { id: 'NED', name: 'Netherlands',         group: 'F', fifaRank: 8,  fifaPts: 1655, confederation: 'UEFA' },
  { id: 'JPN', name: 'Japan',               group: 'F', fifaRank: 15, fifaPts: 1590, confederation: 'AFC' },
  { id: 'SWE', name: 'Sweden',              group: 'F', fifaRank: 24, fifaPts: 1520, confederation: 'UEFA' },
  { id: 'TUN', name: 'Tunisia',             group: 'F', fifaRank: 27, fifaPts: 1490, confederation: 'CAF' },

  // Group G
  { id: 'BEL', name: 'Belgium',             group: 'G', fifaRank: 9,  fifaPts: 1642, confederation: 'UEFA' },
  { id: 'EGY', name: 'Egypt',               group: 'G', fifaRank: 34, fifaPts: 1450, confederation: 'CAF' },
  { id: 'IRN', name: 'Iran',                group: 'G', fifaRank: 31, fifaPts: 1470, confederation: 'AFC' },
  { id: 'NZL', name: 'New Zealand',         group: 'G', fifaRank: 46, fifaPts: 1340, confederation: 'OFC' },

  // Group H
  { id: 'ESP', name: 'Spain',               group: 'H', fifaRank: 3,  fifaPts: 1765, confederation: 'UEFA' },
  { id: 'CPV', name: 'Cape Verde',          group: 'H', fifaRank: 44, fifaPts: 1360, confederation: 'CAF' },
  { id: 'KSA', name: 'Saudi Arabia',        group: 'H', fifaRank: 38, fifaPts: 1420, confederation: 'AFC' },
  { id: 'URU', name: 'Uruguay',             group: 'H', fifaRank: 10, fifaPts: 1630, confederation: 'CONMEBOL' },

  // Group I
  { id: 'FRA', name: 'France',              group: 'I', fifaRank: 1,  fifaPts: 1840, confederation: 'UEFA' },
  { id: 'SEN', name: 'Senegal',             group: 'I', fifaRank: 14, fifaPts: 1585, confederation: 'CAF' },
  { id: 'IRQ', name: 'Iraq',                group: 'I', fifaRank: 47, fifaPts: 1330, confederation: 'AFC' },
  { id: 'NOR', name: 'Norway',              group: 'I', fifaRank: 23, fifaPts: 1535, confederation: 'UEFA' },

  // Group J
  { id: 'ARG', name: 'Argentina',           group: 'J', fifaRank: 2,  fifaPts: 1780, confederation: 'CONMEBOL' },
  { id: 'ALG', name: 'Algeria',             group: 'J', fifaRank: 32, fifaPts: 1465, confederation: 'CAF' },
  { id: 'AUT', name: 'Austria',             group: 'J', fifaRank: 23, fifaPts: 1528, confederation: 'UEFA' },
  { id: 'JOR', name: 'Jordan',              group: 'J', fifaRank: 43, fifaPts: 1375, confederation: 'AFC' },

  // Group K
  { id: 'POR', name: 'Portugal',            group: 'K', fifaRank: 6,  fifaPts: 1699, confederation: 'UEFA' },
  { id: 'COD', name: 'Congo DR',            group: 'K', fifaRank: 43, fifaPts: 1370, confederation: 'CAF' },
  { id: 'UZB', name: 'Uzbekistan',          group: 'K', fifaRank: 45, fifaPts: 1350, confederation: 'AFC' },
  { id: 'COL', name: 'Colombia',            group: 'K', fifaRank: 11, fifaPts: 1618, confederation: 'CONMEBOL' },

  // Group L
  { id: 'ENG', name: 'England',             group: 'L', fifaRank: 4,  fifaPts: 1724, confederation: 'UEFA' },
  { id: 'CRO', name: 'Croatia',             group: 'L', fifaRank: 17, fifaPts: 1558, confederation: 'UEFA' },
  { id: 'GHA', name: 'Ghana',               group: 'L', fifaRank: 39, fifaPts: 1410, confederation: 'CAF' },
  { id: 'PAN', name: 'Panama',              group: 'L', fifaRank: 41, fifaPts: 1385, confederation: 'CONCACAF' },
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));
export const TEAM_BY_NAME = Object.fromEntries(TEAMS.map(t => [t.name.toLowerCase(), t]));

// Resolve a team by id, name, or common alias
export function resolveTeam(query) {
  const q = query.trim().toLowerCase();
  return TEAMS.find(t =>
    t.id.toLowerCase() === q ||
    t.name.toLowerCase() === q
  ) ?? null;
}
