// Computes head-to-head record between two teams from the historical match dataset.
// All stats are from teamA's perspective.

export function computeH2H(teamA, teamB, matches) {
  const meetings = matches
    .filter(m =>
      (m.home === teamA && m.away === teamB) ||
      (m.home === teamB && m.away === teamA)
    )
    .sort((a, b) => b.date.localeCompare(a.date)); // most recent first

  if (!meetings.length) {
    return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, last5: [] };
  }

  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

  for (const m of meetings) {
    const gf = m.home === teamA ? m.homeGoals : m.awayGoals;
    const ga = m.home === teamA ? m.awayGoals : m.homeGoals;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) wins++;
    else if (gf < ga) losses++;
    else draws++;
  }

  const last5 = meetings.slice(0, 5).map(m => ({
    date:       m.date,
    home:       m.home,
    away:       m.away,
    homeGoals:  m.homeGoals,
    awayGoals:  m.awayGoals,
    tournament: m.tournament,
    result:     (m.home === teamA ? m.homeGoals > m.awayGoals : m.awayGoals > m.homeGoals) ? 'W'
              : m.homeGoals === m.awayGoals ? 'D' : 'L',
  }));

  return { played: meetings.length, wins, draws, losses, goalsFor, goalsAgainst, last5 };
}
