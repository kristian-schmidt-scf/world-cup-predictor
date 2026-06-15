// Fetches today's + tomorrow's WC 2026 live match data.
// Scores/status: football-data.org (free tier).
// Goal scorers + assists: api-football.com (free tier, date-only query).
// All date boundaries use Eastern Time (America/New_York).

const FD_BASE  = 'https://api.football-data.org/v4';
const AF_BASE  = 'https://v3.football.api-sports.io';
const WC_COMP  = process.env.FOOTBALL_DATA_COMP ?? 'WC';
const WC_LEAGUE_AF = 1;   // api-football league ID for FIFA World Cup

// In-memory caches — survive the process lifetime but no disk I/O.
const _fdCache    = {};   // football-data.org responses, keyed by ET date
const _afFixtures = {};   // api-football fixture list, keyed by UTC date
const _afEvents   = {};   // api-football events, keyed by fixture ID

// ── Eastern Time helpers ──────────────────────────────────────────────────────

const ET_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

function etDateString(date) {
  const p = ET_FMT.formatToParts(date);
  const v = type => p.find(x => x.type === type).value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}

function etDateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return etDateString(d);
}

function matchEtDate(utcDateStr) {
  return etDateString(new Date(utcDateStr));
}

// ── Cache TTL ─────────────────────────────────────────────────────────────────

function fdTtlMs(todayMatches) {
  const s = new Set(todayMatches.map(m => m.status));
  if (['IN_PLAY', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].some(x => s.has(x))) return 60_000;
  if (s.has('PAUSED')) return 30_000;
  if (todayMatches.length && todayMatches.every(m => m.status === 'FINISHED')) return 10 * 60_000;
  return 5 * 60_000;
}

// ── football-data.org normalisation ──────────────────────────────────────────

function normalizeGoal(g) {
  return {
    minute:     g.minute ?? null,
    injuryTime: g.injuryTime ?? null,
    type:       g.type,
    scorer:     g.scorer?.name ?? 'Unknown',
    assist:     g.assist?.name ?? null,
    teamTla:    g.team?.tla ?? null,
  };
}

function normalizeMatch(m) {
  const live     = ['IN_PLAY', 'EXTRA_TIME', 'PENALTY_SHOOTOUT', 'PAUSED'].includes(m.status);
  const finished = m.status === 'FINISHED';
  const hasScore = live || finished;

  return {
    id:         m.id,
    utcDate:    m.utcDate,
    status:     m.status,
    minute:     m.minute      ?? null,
    injuryTime: m.injuryTime  ?? null,
    stage:      m.stage       ?? null,
    group:      m.group       ?? null,
    homeTeam: {
      name: m.homeTeam.shortName ?? m.homeTeam.name,
      tla:  m.homeTeam.tla,
    },
    awayTeam: {
      name: m.awayTeam.shortName ?? m.awayTeam.name,
      tla:  m.awayTeam.tla,
    },
    score: hasScore ? {
      home:     m.score?.fullTime?.home ?? null,
      away:     m.score?.fullTime?.away ?? null,
      halfTime: (m.score?.halfTime?.home != null) ? m.score.halfTime : null,
    } : null,
    goals: (m.goals ?? []).map(normalizeGoal),
  };
}

// ── api-football.com team name matching ──────────────────────────────────────

// Normalise for fuzzy comparison: strip accents, lowercase, keep only letters.
function normName(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

// Cross-API name mismatches (normalised form → alternative normalised form).
const NAME_ALIASES = new Map([
  ['turkiye',       'turkey'],
  ['turkey',        'turkiye'],
  ['ivorycoast',    'cotedivoire'],
  ['cotedivoire',   'ivorycoast'],
  ['southkorea',    'korearepublic'],
  ['korearepublic', 'southkorea'],
  ['drcongo',       'congodr'],
  ['congodr',       'drcongo'],
  // football-data.org ↔ api-football name differences
  ['usa',           'unitedstates'],
  ['unitedstates',  'usa'],
  ['iran',          'iriran'],
  ['iriran',        'iran'],
  ['czechia',       'czechrepublic'],
  ['czechrepublic', 'czechia'],
  ['northmacedonia','macedonia'],
  ['macedonia',     'northmacedonia'],
]);

function teamsMatch(a, b) {
  const na = normName(a), nb = normName(b);
  if (na === nb) return true;
  return NAME_ALIASES.get(na) === nb || NAME_ALIASES.get(nb) === na;
}

// ── api-football.com: fixture list ───────────────────────────────────────────

// dateStr is a UTC calendar date "YYYY-MM-DD" — what api-football uses for its ?date= param.
async function fetchAfFixtures(dateStr) {
  const entry = _afFixtures[dateStr];
  if (entry && Date.now() < entry.expiresAt) return entry.data;

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return [];

  try {
    // Omit &season= — free plan only supports seasons up to 2024 with that param.
    const res = await fetch(`${AF_BASE}/fixtures?date=${dateStr}`, {
      headers: { 'x-apisports-key': apiKey },
    });
    if (!res.ok) {
      console.warn(`[ticker] api-football fixtures HTTP ${res.status} for ${dateStr}`);
      return [];
    }
    const body = await res.json();
    if (body.errors && Object.keys(body.errors).length) {
      console.warn(`[ticker] api-football fixtures error for ${dateStr}:`, body.errors);
      return [];
    }
    const allFixtures = body.response ?? [];
    const fixtures = allFixtures
      .filter(f => f.league.id === WC_LEAGUE_AF)
      .map(f => ({
        id:       f.fixture.id,
        date:     f.fixture.date,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
      }));
    if (!fixtures.length) {
      const ids = allFixtures.map(f => `${f.league.id}:${f.teams?.home?.name} v ${f.teams?.away?.name}`).join(', ');
      console.warn(`[ticker] api-football: no WC fixtures (league ${WC_LEAGUE_AF}) for ${dateStr}. Got: [${ids || 'none'}]`);
      // Never cache an empty list — next request will retry.
      return [];
    }
    // Past dates are immutable — cache 24 h. Current/future: 4 h.
    const todayUtc = new Date().toISOString().slice(0, 10);
    const ttl = dateStr < todayUtc ? 24 * 60 * 60_000 : 4 * 60 * 60_000;
    _afFixtures[dateStr] = { data: fixtures, expiresAt: Date.now() + ttl };
    return fixtures;
  } catch (err) {
    console.warn(`[ticker] api-football fixtures fetch failed for ${dateStr}:`, err.message);
    return [];
  }
}

// ── api-football.com: goal events for a single fixture ───────────────────────

async function fetchAfEvents(fixtureId, fdoStatus) {
  const live     = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(fdoStatus);
  const finished = fdoStatus === 'FINISHED';
  if (!live && !finished) return [];

  const ttl = finished ? 24 * 60 * 60_000 : 5 * 60_000;
  const entry = _afEvents[fixtureId];
  if (entry && Date.now() < entry.expiresAt) return entry.data;

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(`${AF_BASE}/fixtures/events?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': apiKey },
    });
    if (!res.ok) {
      console.warn(`[ticker] api-football events HTTP ${res.status} for fixture ${fixtureId}`);
      return [];
    }
    const body = await res.json();
    if (body.errors && Object.keys(body.errors).length) {
      console.warn(`[ticker] api-football events error for fixture ${fixtureId}:`, body.errors);
      return [];
    }
    const events = (body.response ?? [])
      .filter(e => e.type === 'Goal')
      .map(e => ({
        minute:     e.time.elapsed ?? null,
        injuryTime: e.time.extra   ?? null,
        type: e.detail === 'Own Goal' ? 'OWN_GOAL'
            : e.detail === 'Penalty'  ? 'PENALTY'
            : 'NORMAL',
        scorer:   e.player?.name ?? 'Unknown',
        assist:   e.assist?.name  ?? null,
        teamName: e.team?.name    ?? null,
        teamTla:  null,   // filled in during enrichment
      }));
    // Don't cache empty events for finished matches — a 5-1 result with 0 events
    // means the data isn't ready yet; retry on next request.
    if (events.length > 0 || !finished) {
      _afEvents[fixtureId] = { data: events, expiresAt: Date.now() + ttl };
    }
    return events;
  } catch (err) {
    console.warn(`[ticker] api-football events fetch failed for fixture ${fixtureId}:`, err.message);
    return [];
  }
}

// ── Enrich matches with goal/assist data ──────────────────────────────────────

function findAfFixture(fdoMatch, afFixtures) {
  const ms = new Date(fdoMatch.utcDate).getTime();
  // Primary: kickoff within 20 min (wider window for minor timestamp differences).
  const byTime = afFixtures.filter(f => Math.abs(new Date(f.date).getTime() - ms) < 20 * 60_000);
  if (byTime.length === 1) return byTime[0];
  if (byTime.length > 1) {
    return byTime.find(f => teamsMatch(f.homeTeam, fdoMatch.homeTeam.name)) ?? byTime[0];
  }
  // Fallback: match by both team names regardless of time — handles cases where
  // api-football stores kickoff in a different timezone or with an offset we can't parse.
  return afFixtures.find(f =>
    teamsMatch(f.homeTeam, fdoMatch.homeTeam.name) &&
    teamsMatch(f.awayTeam, fdoMatch.awayTeam.name)
  ) ?? null;
}

async function enrichMatches(matches) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return matches;

  return Promise.all(matches.map(async m => {
    // Use the UTC calendar date of each match's kickoff — api-football stores
    // fixtures by UTC date, not ET date. A match at 00:00 UTC is June 15 UTC
    // but June 14 ET; fetching by ET would miss it entirely.
    const utcDate = m.utcDate.slice(0, 10);
    const afFixtures = await fetchAfFixtures(utcDate);
    if (!afFixtures.length) return m;

    const af = findAfFixture(m, afFixtures);
    if (!af) {
      console.warn(`[ticker] no api-football fixture match for ${m.homeTeam.name} v ${m.awayTeam.name} (${utcDate}). Available:`, afFixtures.map(f => `${f.homeTeam} v ${f.awayTeam} @ ${f.date}`));
      return m;
    }

    const rawGoals = await fetchAfEvents(af.id, m.status);
    if (!rawGoals.length) return m;

    // Resolve teamTla from our football-data.org team data.
    const goals = rawGoals.map(g => ({
      ...g,
      teamTla: teamsMatch(g.teamName, m.homeTeam.name) ? m.homeTeam.tla
             : teamsMatch(g.teamName, m.awayTeam.name) ? m.awayTeam.tla
             : null,
    }));
    return { ...m, goals };
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchTodayMatches() {
  const fdKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!fdKey) throw new Error('FOOTBALL_DATA_API_KEY is not set');

  const yesterdayET = etDateOffset(-1);
  const todayET     = etDateOffset(0);
  const tomorrowET  = etDateOffset(1);

  const entry = _fdCache[todayET];
  if (entry && Date.now() < entry.expiresAt) return entry.data;

  // Fetch a 4-day UTC window: yesterday through day-after-tomorrow.
  // Late-night ET kickoffs can cross into the next UTC calendar date.
  const windowEnd = etDateOffset(2);
  const url = `${FD_BASE}/competitions/${WC_COMP}/matches?dateFrom=${yesterdayET}&dateTo=${windowEnd}`;

  let raw;
  try {
    const res = await fetch(url, { headers: { 'X-Auth-Token': fdKey } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`football-data.org ${res.status}: ${body.slice(0, 300)}`);
    }
    raw = await res.json();
  } catch (err) {
    if (entry) return entry.data;
    throw err;
  }

  const all          = (raw.matches ?? []).map(normalizeMatch);
  const yesterdayRaw = all.filter(m => matchEtDate(m.utcDate) === yesterdayET);
  const todayRaw     = all.filter(m => matchEtDate(m.utcDate) === todayET);
  const tomorrow     = all.filter(m => matchEtDate(m.utcDate) === tomorrowET);

  // Enrich yesterday + today with goal scorers + assists (parallel fetch).
  const [yesterday, today] = await Promise.all([
    enrichMatches(yesterdayRaw),
    enrichMatches(todayRaw),
  ]);

  const result = { yesterday, today, tomorrow, yesterdayET, todayET, tomorrowET, fetchedAt: new Date().toISOString() };
  _fdCache[todayET] = { data: result, expiresAt: Date.now() + fdTtlMs(today) };
  return result;
}
