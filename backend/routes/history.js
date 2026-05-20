import { Router } from 'express';
import { fetchAllMatches, fetchMatches, computeEloRatings } from '../data/index.js';

const router = Router();
const PAGE_SIZE = 50;
const EXPORT_CAP = 2000;

function tournamentCategory(tournament) {
  const t = tournament.toLowerCase();
  if (t === 'fifa world cup') return 'wc';
  if (t.includes('world cup qual') || t.includes('qualification')) return 'qual';
  if (t.includes('friendly')) return 'friendly';
  return 'other';
}

// GET /api/history
router.get('/history', async (req, res, next) => {
  try {
    const all = (await fetchAllMatches()).filter(m => m.home && m.away);

    const { team, opponent, tournament, year_from, year_to, result, page, page_size } = req.query;

    let filtered = all;

    if (team)     filtered = filtered.filter(m => m.home === team || m.away === team);
    if (opponent && team)
                  filtered = filtered.filter(m => (m.home === team ? m.away : m.home) === opponent);
    if (tournament && tournament !== 'all')
                  filtered = filtered.filter(m => tournamentCategory(m.tournament) === tournament);
    if (year_from) filtered = filtered.filter(m => m.date >= `${year_from}-01-01`);
    if (year_to)   filtered = filtered.filter(m => m.date <= `${year_to}-12-31`);
    if (result && result !== 'all' && team) {
      filtered = filtered.filter(m => {
        const isHome = m.home === team;
        const gF = isHome ? m.homeGoals : m.awayGoals;
        const gA = isHome ? m.awayGoals : m.homeGoals;
        if (result === 'W') return gF > gA;
        if (result === 'D') return gF === gA;
        if (result === 'L') return gF < gA;
        return true;
      });
    }

    filtered = filtered.slice().sort((a, b) => b.date.localeCompare(a.date));

    const total = filtered.length;

    // Summary stats always computed on full dataset
    const dates = all.map(m => m.date).sort();
    const stats = {
      total:     all.length,
      dateFrom:  dates[0]?.slice(0, 4) ?? '—',
      dateTo:    dates[dates.length - 1]?.slice(0, 4) ?? '—',
      wcMatches: all.filter(m => tournamentCategory(m.tournament) === 'wc').length,
    };

    // Export mode: return up to EXPORT_CAP rows, no pagination wrapper
    if (page_size === 'all') {
      return res.json({ matches: filtered.slice(0, EXPORT_CAP), total, stats });
    }

    const pageNum    = Math.max(1, parseInt(page, 10) || 1);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const matches    = filtered.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

    res.json({ matches, total, page: pageNum, totalPages, stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/history/curated
router.get('/history/curated', async (req, res, next) => {
  try {
    const [allMatches, modelMatches] = await Promise.all([
      fetchAllMatches(),
      fetchMatches(),
    ]);
    const elo = computeEloRatings(modelMatches);

    const both = allMatches.filter(m => m.home && m.away);

    // Top 5 highest-scoring matches
    const highestScoring = both
      .slice()
      .sort((a, b) => (b.homeGoals + b.awayGoals) - (a.homeGoals + a.awayGoals))
      .slice(0, 5);

    // Top 5 biggest upsets by current-Elo gap (lower-Elo team won)
    const biggestUpsets = both
      .filter(m => {
        if (m.homeGoals === m.awayGoals) return false;
        const winner = m.homeGoals > m.awayGoals ? m.home : m.away;
        const loser  = m.homeGoals > m.awayGoals ? m.away : m.home;
        return elo[winner] && elo[loser] && elo[winner] < elo[loser];
      })
      .map(m => {
        const homeWon = m.homeGoals > m.awayGoals;
        const winner  = homeWon ? m.home : m.away;
        const loser   = homeWon ? m.away : m.home;
        return { ...m, eloDiff: (elo[loser] ?? 0) - (elo[winner] ?? 0) };
      })
      .sort((a, b) => b.eloDiff - a.eloDiff)
      .slice(0, 5);

    res.json({ highestScoring, biggestUpsets });
  } catch (err) {
    next(err);
  }
});

export default router;
