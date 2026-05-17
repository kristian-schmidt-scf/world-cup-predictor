import { createAttackDefenseChart, createScoreHistogram } from './charts.js';

// ── Constants ────────────────────────────────────────────────────────────────
const API = '/api';
const STAGE_LABELS = [
  ['r16', 'R16'], ['qf', 'QF'], ['sf', 'SF'], ['final', 'Final'], ['winner', 'Winner'],
];

const FLAGS = {
  MEX:'mx',  RSA:'za',     KOR:'kr', CZE:'cz',
  CAN:'ca',  BIH:'ba',     QAT:'qa', SUI:'ch',
  BRA:'br',  MAR:'ma',     HAI:'ht', SCO:'gb-sct',
  USA:'us',  PRY:'py',     AUS:'au', TUR:'tr',
  GER:'de',  CUW:'cw',     CIV:'ci', ECU:'ec',
  NED:'nl',  JPN:'jp',     SWE:'se', TUN:'tn',
  BEL:'be',  EGY:'eg',     IRN:'ir', NZL:'nz',
  ESP:'es',  CPV:'cv',     KSA:'sa', URU:'uy',
  FRA:'fr',  SEN:'sn',     IRQ:'iq', NOR:'no',
  ARG:'ar',  ALG:'dz',     AUT:'at', JOR:'jo',
  POR:'pt',  COD:'cd',     UZB:'uz', COL:'co',
  ENG:'gb-eng', CRO:'hr',  GHA:'gh', PAN:'pa',
};
const flag = id => {
  const iso = FLAGS[id];
  return iso ? `<img src="https://flagcdn.com/w40/${iso}.png" class="flag-img" alt="${id}">` : '';
};

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  teams:          [],
  fixtures:       [],
  teamById:       {},
  simResults:     null,
  simMeta:        null,
  scenarioResults: null,
  lockedResults:  {},   // real match results persisted on server { matchKey: { goalsA, goalsB } }
  scenarioLocks:  {},   // hypothetical scenario locks (Scenario Explorer only)
  selectedTeamId: null,
  matchCache:     {},   // { 'FRA-ARG': prediction }
  expandedMatch:  null,
  matchGroup:     'A',
  scenarioGroup:  'A',
  filter:         '',
  sort:           { col: 'elo', dir: -1 },  // dir: -1 = desc, 1 = asc
};

// ── API ───────────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function simulate(numSims, scenarioLocks = {}) {
  return api('/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numSims, lockedResults: scenarioLocks }),
  });
}

async function fetchResults() {
  const data = await api('/results');
  return data.results;
}

async function lockResult(matchId, goalsA, goalsB) {
  const data = await api('/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, goalsA, goalsB }),
  });
  return data.results;
}

async function unlockResult(matchId) {
  const data = await api(`/results/${encodeURIComponent(matchId)}`, { method: 'DELETE' });
  return data.results;
}

async function fetchMatchPrediction(a, b) {
  const key = `${a}-${b}`;
  if (!state.matchCache[key]) {
    state.matchCache[key] = await api(`/match/${a}/${b}`);
  }
  return state.matchCache[key];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtPct  = v  => v != null ? (v * 100).toFixed(1) + '%' : '—';
const pClass  = v  => v == null ? '' : v >= 0.10 ? 'p-high' : v >= 0.03 ? 'p-med' : 'p-low';
const fmtDate = ds => ds ? new Date(ds).toLocaleDateString('en-GB', { month:'short', day:'numeric' }) : '—';
const teamProbs = id => state.simResults?.probs?.[id] ?? null;

// Returns the status badge HTML for a fixture based on time and locked state.
function countdownBadge(f) {
  const locked = state.lockedResults[matchKey(f)];
  if (locked) return `<span class="badge badge-done">FT ${locked.goalsA}–${locked.goalsB}</span>`;

  if (!f.kickoff) return `<span class="badge badge-upcoming">Upcoming</span>`;

  const now = Date.now();
  const ko  = new Date(f.kickoff).getTime();
  const end = ko + 110 * 60 * 1000; // 90 min + 20 min buffer for stoppages

  if (now >= ko && now < end) {
    return `<span class="badge badge-live">LIVE</span>`;
  }
  if (now >= end) {
    return `<span class="badge badge-done">FT</span>`;
  }

  // Upcoming — show countdown
  const diff  = ko - now;
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000)  / 60_000);

  const label = days > 0 ? `${days}d ${hours}h`
              : hours > 0 ? `${hours}h ${mins}m`
              : `${mins}m`;

  const kickoffLocal = new Date(f.kickoff).toLocaleString('en-GB', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `<span class="badge badge-upcoming" title="Kick-off: ${kickoffLocal}">${label}</span>`;
}

function setSimStatus(msg) {
  document.getElementById('sim-status').textContent = msg;
}

// ── Navigation ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p  => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b   => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  if (tab === 'bracket') renderBracket();
}

// ════════════════════════════════════════════════════════════════════════════
// TEAMS VIEW
// ════════════════════════════════════════════════════════════════════════════

function sortedFilteredTeams() {
  const { col, dir } = state.sort;
  const q = state.filter.toLowerCase();
  const teams = q
    ? state.teams.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    : [...state.teams];

  return teams.sort((a, b) => {
    const va = col === 'winner' ? (teamProbs(a.id)?.winner ?? -1) : (a[col] ?? 0);
    const vb = col === 'winner' ? (teamProbs(b.id)?.winner ?? -1) : (b[col] ?? 0);
    if (typeof va === 'string') return dir * va.localeCompare(vb);
    return dir * (va - vb);
  });
}

function renderTeamsTable() {
  const tbody = document.getElementById('teams-tbody');
  const teams = sortedFilteredTeams();

  tbody.innerHTML = teams.map(t => {
    const pr  = teamProbs(t.id);
    const sel = t.id === state.selectedTeamId;
    return `
      <tr class="clickable${sel ? ' row-selected' : ''}" data-team="${t.id}">
        <td><span class="badge badge-group">${t.group}</span></td>
        <td>${flag(t.id)}<strong>${t.id}</strong> <span style="color:var(--muted);font-size:12px">${t.name}</span></td>
        <td>${t.elo ?? '—'}</td>
        <td>${t.attack  != null ? t.attack.toFixed(3)  : '—'}</td>
        <td>${t.defense != null ? t.defense.toFixed(3) : '—'}</td>
        <td>${t.formScore != null ? t.formScore : '—'}</td>
        <td>${t.marketValueM != null ? '€' + t.marketValueM + 'M' : '—'}</td>
        <td class="${pClass(pr?.winner)}">${pr ? fmtPct(pr.winner) : (state.simResults ? '—' : '...')}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.dataset.team;
      state.selectedTeamId = state.selectedTeamId === id ? null : id;
      renderTeamsTable();
      renderTeamDetail();
    });
  });
}

function renderTeamDetail() {
  const panel = document.getElementById('team-detail');
  if (!state.selectedTeamId) {
    panel.innerHTML = '<div class="empty-state"><p>Select a team to see details</p></div>';
    return;
  }
  const t  = state.teamById[state.selectedTeamId];
  if (!t) return;
  const pr = teamProbs(t.id);
  const groupTeams = state.teams.filter(g => g.group === t.group);

  const stagesHtml = pr
    ? STAGE_LABELS.map(([key, label]) => {
        const pv  = pr[key] ?? 0;
        const w   = Math.min(100, Math.round(pv * 100));
        return `
          <div class="stage-row">
            <span class="stage-label">${label}</span>
            <div class="stage-bar"><div class="stage-fill" style="width:${w}%"></div></div>
            <span class="stage-pct">${(pv*100).toFixed(1)}%</span>
          </div>`;
      }).join('')
    : '<p style="color:var(--muted);font-size:13px">Run a simulation to see probabilities</p>';

  const record = t.record ? `${t.record.wins}W ${t.record.draws}D ${t.record.losses}L` : '—';

  panel.innerHTML = `
    <div class="team-name">${flag(t.id)}${t.name}</div>
    <div class="team-meta">Group ${t.group} &middot; ${t.confederation} &middot; FIFA #${t.fifaRank}</div>

    <div class="team-stats">
      <div class="stat-box">
        <div class="stat-label">Elo</div>
        <div class="stat-value">${t.elo ?? '—'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Last 5</div>
        <div class="stat-value" style="font-family:monospace">${t.last5 ?? '—'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Record (10 games)</div>
        <div class="stat-value" style="font-size:13px">${record}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Market Value</div>
        <div class="stat-value" style="font-size:13px">${t.marketValueM ? '€' + t.marketValueM + 'M' : '—'}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">
      Group ${t.group} — Attack &amp; Defense
    </div>
    <div class="chart-container"><canvas id="atk-chart"></canvas></div>

    <div class="path-title" style="margin-top:16px">Path to Final</div>
    ${stagesHtml}`;

  createAttackDefenseChart('atk-chart', groupTeams);
}

function initTeamsView() {
  document.querySelectorAll('#teams-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      state.sort.dir = state.sort.col === col ? state.sort.dir * -1 : -1;
      state.sort.col = col;
      // Update header styles
      document.querySelectorAll('#teams-table th').forEach(h => {
        h.classList.remove('col-active');
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
      });
      th.classList.add('col-active');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = state.sort.dir === -1 ? '↓' : '↑';
      renderTeamsTable();
    });
  });

  document.getElementById('team-search').addEventListener('input', e => {
    state.filter = e.target.value;
    renderTeamsTable();
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MATCHES VIEW
// ════════════════════════════════════════════════════════════════════════════

async function renderMatchesGroup(group) {
  state.matchGroup = group;
  const fixtures = state.fixtures.filter(f => f.stage === 'group' && f.group === group);
  const container = document.getElementById('matches-content');

  container.innerHTML = `
    <p class="fixture-section-title">Group ${group} — 6 matches</p>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Home</th><th></th><th>Away</th>
            <th>xG</th><th>W&nbsp;/&nbsp;D&nbsp;/&nbsp;L</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${fixtures.map(fixtureRowHtml).join('')}</tbody>
      </table>
    </div>`;

  fixtures.forEach(f => {
    document.querySelector(`tr[data-match="${f.id}"]`)
      ?.addEventListener('click', () => toggleMatch(f));
  });

  // Pre-load predictions (all 6 in parallel)
  fixtures.forEach(f => prefetchPrediction(f));
}

function matchKey(f) { return `${f.group}-${f.home}-${f.away}`; }

function lockSectionHtml(f) {
  const key    = matchKey(f);
  const locked = state.lockedResults[key];
  const hn     = state.teamById[f.home]?.name ?? f.home;
  const an     = state.teamById[f.away]?.name ?? f.away;

  if (locked) {
    return `
      <div class="lock-section lock-section--locked">
        <span class="lock-label">Result locked</span>
        <span class="lock-score">${flag(f.home)} ${hn} <strong>${locked.goalsA} – ${locked.goalsB}</strong> ${an} ${flag(f.away)}</span>
        <button class="lock-btn lock-btn--unlock" data-key="${key}">Unlock</button>
      </div>`;
  }

  return `
    <div class="lock-section">
      <span class="lock-label">Lock result</span>
      <div class="lock-inputs">
        ${flag(f.home)} <span class="lock-team">${f.home}</span>
        <input class="lock-score-input" id="goals-a-${f.id}" type="number" min="0" max="20" value="0">
        <span class="lock-sep">–</span>
        <input class="lock-score-input" id="goals-b-${f.id}" type="number" min="0" max="20" value="0">
        <span class="lock-team">${f.away}</span> ${flag(f.away)}
        <button class="lock-btn lock-btn--lock" data-key="${key}" data-fid="${f.id}">Lock</button>
      </div>
    </div>`;
}

function fixtureRowHtml(f) {
  const locked = state.lockedResults[matchKey(f)];
  return `
    <tr class="fixture-row${locked ? ' row-locked' : ''}" data-match="${f.id}">
      <td>${fmtDate(f.date)}</td>
      <td>${flag(f.home)}<strong>${f.home}</strong></td>
      <td style="color:var(--muted)">vs</td>
      <td>${flag(f.away)}<strong>${f.away}</strong></td>
      <td id="xg-${f.id}">—</td>
      <td id="wdl-${f.id}">—</td>
      <td id="badge-${f.id}">${countdownBadge(f)}</td>
    </tr>
    <tr class="fixture-detail-row" id="detail-${f.id}">
      <td colspan="7">
        <div class="match-detail-inner">
          <div>
            <div id="lock-${f.id}">${lockSectionHtml(f)}</div>
            <div id="meta-${f.id}" style="color:var(--muted);font-size:13px;margin-top:12px">Loading...</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:8px">
              Score probabilities — top 10 most likely scorelines
            </div>
            <div class="score-chart-wrap"><canvas id="hist-${f.id}"></canvas></div>
          </div>
        </div>
      </td>
    </tr>`;
}

async function prefetchPrediction(f) {
  try {
    const pred = await fetchMatchPrediction(f.home, f.away);
    updateFixtureInline(f, pred);
    // Render chart if this match is currently expanded
    if (state.expandedMatch === f.id) renderMatchDetailPanel(f, pred);
  } catch {}
}

function updateFixtureInline(f, pred) {
  const xgEl  = document.getElementById(`xg-${f.id}`);
  const wdlEl = document.getElementById(`wdl-${f.id}`);
  if (xgEl) xgEl.textContent = `${pred.xgA}–${pred.xgB}`;
  if (wdlEl) {
    const [w, d, l] = [pred.pWin, pred.pDraw, pred.pLoss].map(v => (v*100).toFixed(0) + '%');
    wdlEl.innerHTML = `<span style="color:var(--win)">${w}</span>&nbsp;/&nbsp;<span style="color:var(--draw)">${d}</span>&nbsp;/&nbsp;<span style="color:var(--loss)">${l}</span>`;
  }
}

function toggleMatch(f) {
  const detailRow  = document.getElementById(`detail-${f.id}`);
  const fixtureRow = document.querySelector(`tr[data-match="${f.id}"]`);
  if (!detailRow) return;

  const isOpen = detailRow.classList.contains('visible');

  // Close all
  document.querySelectorAll('.fixture-detail-row.visible').forEach(r => r.classList.remove('visible'));
  document.querySelectorAll('.fixture-row.row-expanded').forEach(r => r.classList.remove('row-expanded'));
  state.expandedMatch = null;

  if (!isOpen) {
    detailRow.classList.add('visible');
    fixtureRow.classList.add('row-expanded');
    state.expandedMatch = f.id;
    const pred = state.matchCache[`${f.home}-${f.away}`];
    if (pred) renderMatchDetailPanel(f, pred);
  }
}

function renderMatchDetailPanel(f, pred) {
  const metaEl = document.getElementById(`meta-${f.id}`);
  if (!metaEl) return;

  const tn = id => state.teamById[id]?.name ?? id;
  const [w, d, l] = [pred.pWin, pred.pDraw, pred.pLoss];

  const h2hHtml = buildH2HHtml(f, pred);

  metaEl.innerHTML = `
    <div style="font-weight:700;color:var(--text);margin-bottom:10px">${flag(f.home)} ${tn(f.home)} vs ${flag(f.away)} ${tn(f.away)}</div>
    <div class="match-meta-label">Expected goals</div>
    <div class="match-meta-val">${pred.xgA} – ${pred.xgB}</div>
    <div class="match-meta-label">${f.home} win</div>
    <div class="match-meta-val" style="color:var(--win)">${(w*100).toFixed(1)}%</div>
    <div class="match-meta-label">Draw</div>
    <div class="match-meta-val" style="color:var(--draw)">${(d*100).toFixed(1)}%</div>
    <div class="match-meta-label">${f.away} win</div>
    <div class="match-meta-val" style="color:var(--loss)">${(l*100).toFixed(1)}%</div>
    <div class="prob-bar">
      <div class="prob-win"  style="width:${(w*100).toFixed(0)}%"></div>
      <div class="prob-draw" style="width:${(d*100).toFixed(0)}%"></div>
      <div class="prob-loss" style="flex:1"></div>
    </div>
    <div class="prob-labels">
      <span>${f.home}</span><span>Draw</span><span>${f.away}</span>
    </div>
    ${h2hHtml}`;

  createScoreHistogram(`hist-${f.id}`, pred.topScores);
}

function buildH2HHtml(f, pred) {
  const h2h = pred.h2h;
  if (!h2h) return '';

  if (h2h.played === 0) {
    return `
    <div class="h2h-section">
      <div class="h2h-title">Head-to-Head</div>
      <div class="h2h-none">No previous meetings</div>
    </div>`;
  }

  const last5Rows = h2h.last5.map(m => {
    const resultClass = m.result === 'W' ? 'h2h-r-win' : m.result === 'D' ? 'h2h-r-draw' : 'h2h-r-loss';
    return `<div class="h2h-match">
      <span class="h2h-date">${m.date.slice(0, 7)}</span>
      <span class="h2h-teams">${flag(m.home)}${m.home} ${m.homeGoals}–${m.awayGoals} ${flag(m.away)}${m.away}</span>
      <span class="h2h-result ${resultClass}">${m.result}</span>
    </div>`;
  }).join('');

  let divergence = '';
  if (h2h.played >= 5) {
    const h2hWinRate = h2h.wins / h2h.played;
    const diff = pred.pWin - h2hWinRate;
    if (Math.abs(diff) > 0.15) {
      const dir = diff > 0 ? 'stronger' : 'weaker';
      divergence = `<div class="h2h-divergence">Model rates ${f.home} ${dir} than H2H suggests</div>`;
    }
  }

  return `
  <div class="h2h-section">
    <div class="h2h-title">Head-to-Head</div>
    <div class="h2h-record">
      <span class="h2h-stat h2h-w">${h2h.wins}W</span>
      <span class="h2h-sep">–</span>
      <span class="h2h-stat h2h-d">${h2h.draws}D</span>
      <span class="h2h-sep">–</span>
      <span class="h2h-stat h2h-l">${h2h.losses}L</span>
      <span class="h2h-played">${h2h.played} played · ${h2h.goalsFor}–${h2h.goalsAgainst} goals</span>
    </div>
    ${divergence}
    <div class="h2h-last5-title">Last ${h2h.last5.length} meeting${h2h.last5.length !== 1 ? 's' : ''}</div>
    ${last5Rows}
  </div>`;
}

// Called after any real result is locked or unlocked — re-sims and refreshes all views.
async function afterResultChange(results) {
  state.lockedResults = results;
  await renderMatchesGroup(state.matchGroup);
  setSimStatus('Updating simulation...');
  try {
    const data = await simulate(10_000);
    state.simResults = data;
    state.simMeta    = data.meta;
    setSimStatus(`${data.meta.n.toLocaleString()} sims · ${data.meta.elapsedMs}ms`);
    renderTeamsTable();
    if (state.selectedTeamId) renderTeamDetail();
    if (document.getElementById('tab-bracket').classList.contains('active')) renderBracket();
  } catch {
    setSimStatus('Simulation failed');
  }
}

let countdownTimer = null;

function startCountdownTicker() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const group = state.matchGroup;
    state.fixtures
      .filter(f => f.stage === 'group' && f.group === group)
      .forEach(f => {
        const el = document.getElementById(`badge-${f.id}`);
        if (el) el.innerHTML = countdownBadge(f);
      });
  }, 30_000); // refresh every 30 seconds
}

function initMatchesView() {
  document.querySelectorAll('#group-tabs .group-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#group-tabs .group-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.expandedMatch = null;
      renderMatchesGroup(btn.dataset.group);
    });
  });
  renderMatchesGroup('A');
  startCountdownTicker();
}

// Delegate lock/unlock button clicks for the matches view.
document.addEventListener('click', async e => {
  const lockBtn   = e.target.closest('.lock-btn--lock');
  const unlockBtn = e.target.closest('.lock-btn--unlock');

  if (lockBtn) {
    e.stopPropagation();
    const key  = lockBtn.dataset.key;
    const fid  = lockBtn.dataset.fid;
    const a    = parseInt(document.getElementById(`goals-a-${fid}`)?.value ?? 0, 10);
    const b    = parseInt(document.getElementById(`goals-b-${fid}`)?.value ?? 0, 10);
    lockBtn.disabled = true;
    lockBtn.textContent = '...';
    try {
      const results = await lockResult(key, a, b);
      await afterResultChange(results);
    } catch (err) {
      lockBtn.disabled = false;
      lockBtn.textContent = 'Lock';
      alert(`Failed to lock result: ${err.message}`);
    }
  }

  if (unlockBtn) {
    e.stopPropagation();
    const key = unlockBtn.dataset.key;
    unlockBtn.disabled = true;
    try {
      const results = await unlockResult(key);
      await afterResultChange(results);
    } catch (err) {
      unlockBtn.disabled = false;
      alert(`Failed to unlock: ${err.message}`);
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// BRACKET VIEW
// ════════════════════════════════════════════════════════════════════════════

function renderBracket() {
  const tbody  = document.getElementById('bracket-tbody');
  const cards  = document.getElementById('champion-cards');
  const info   = document.getElementById('bracket-sim-info');

  if (!state.simResults) {
    tbody.innerHTML  = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">Run a simulation to see tournament odds</td></tr>`;
    cards.innerHTML  = '';
    info.textContent = '';
    return;
  }

  const meta = state.simMeta;
  info.textContent = `${meta.n.toLocaleString()} simulations · ${meta.elapsedMs}ms`;

  // Top-5 champion cards
  const top5 = [...state.teams]
    .sort((a, b) => (teamProbs(b.id)?.winner ?? 0) - (teamProbs(a.id)?.winner ?? 0))
    .slice(0, 5);

  const ranks = ['1st', '2nd', '3rd', '4th', '5th'];
  cards.innerHTML = top5.map((t, i) => {
    const pct = ((teamProbs(t.id)?.winner ?? 0) * 100).toFixed(1);
    return `
      <div class="champion-card">
        <div class="champion-rank">${ranks[i]}</div>
        <div class="champion-flag">${flag(t.id)}</div>
        <div class="champion-id">${t.id}</div>
        <div class="champion-name">${t.name}</div>
        <div class="champion-pct">${pct}%</div>
      </div>`;
  }).join('');

  // Full probability table sorted by winner%
  const sorted = [...state.teams].sort((a, b) =>
    (teamProbs(b.id)?.winner ?? 0) - (teamProbs(a.id)?.winner ?? 0)
  );

  const cell = v => {
    if (!v) return `<td style="color:var(--border)">—</td>`;
    const alpha = Math.min(0.65, v * 5);
    const bold  = v >= 0.05 ? 'font-weight:700' : '';
    return `<td style="background:rgba(59,130,246,${alpha.toFixed(2)});${bold}">${(v*100).toFixed(1)}%</td>`;
  };

  tbody.innerHTML = sorted.map(t => {
    const pr = state.simResults.probs[t.id] ?? {};
    return `
      <tr>
        <td><span class="badge badge-group">${t.group}</span></td>
        <td>${flag(t.id)}<strong>${t.id}</strong> <span style="color:var(--muted);font-size:12px">${t.name}</span></td>
        ${cell(pr.r16)}${cell(pr.qf)}${cell(pr.sf)}${cell(pr.final)}${cell(pr.winner)}
      </tr>`;
  }).join('');
}

function initBracketView() {
  document.getElementById('run-sim-btn').addEventListener('click', async () => {
    const btn = document.getElementById('run-sim-btn');
    btn.disabled = true;
    btn.textContent = 'Running...';
    setSimStatus('Running 10,000 simulations...');
    try {
      const data = await simulate(10_000);
      state.simResults = data;
      state.simMeta    = data.meta;
      setSimStatus(`${data.meta.n.toLocaleString()} sims · ${data.meta.elapsedMs}ms`);
      renderBracket();
      renderTeamsTable();
      if (state.selectedTeamId) renderTeamDetail();
    } catch (err) {
      setSimStatus('Simulation failed');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Run 10,000 Simulations';
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SCENARIO VIEW
// ════════════════════════════════════════════════════════════════════════════

function renderScenarioMatches(group) {
  state.scenarioGroup = group;
  const container = document.getElementById('scenario-matches');

  // Only show matches not already locked with a real result
  const fixtures = state.fixtures.filter(
    f => f.stage === 'group' && f.group === group && !state.lockedResults[matchKey(f)]
  );

  if (!fixtures.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:8px 0">All matches in this group have real results locked.</p>';
    return;
  }

  container.innerHTML = fixtures.map(f => {
    const key    = matchKey(f);
    const locked = state.scenarioLocks[key];
    const hn     = state.teamById[f.home]?.name ?? f.home;
    const an     = state.teamById[f.away]?.name ?? f.away;
    const isWin  = locked && locked.goalsA > locked.goalsB;
    const isDraw = locked && locked.goalsA === locked.goalsB;
    const isLoss = locked && locked.goalsA < locked.goalsB;

    return `
      <div class="scenario-match">
        <div class="scenario-teams">
          ${flag(f.home)} ${hn} vs ${flag(f.away)} ${an}
          <span class="md-label">MD${f.matchday}</span>
        </div>
        <div class="result-btns">
          <button class="result-btn${isWin  ? ' active' : ''}" data-key="${key}" data-outcome="win">${f.home} Win</button>
          <button class="result-btn${isDraw ? ' active' : ''}" data-key="${key}" data-outcome="draw">Draw</button>
          <button class="result-btn${isLoss ? ' active' : ''}" data-key="${key}" data-outcome="loss">${f.away} Win</button>
          ${locked ? `<button class="result-btn btn-clear" data-key="${key}" data-outcome="clear">×</button>` : ''}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.result-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key     = btn.dataset.key;
      const outcome = btn.dataset.outcome;
      if (outcome === 'clear') {
        delete state.scenarioLocks[key];
      } else {
        const scores = { win: { goalsA:2, goalsB:0 }, draw: { goalsA:0, goalsB:0 }, loss: { goalsA:0, goalsB:2 } };
        state.scenarioLocks[key] = scores[outcome];
      }
      renderScenarioMatches(group);
    });
  });
}

async function runScenario() {
  const btn = document.getElementById('run-scenario-btn');
  btn.disabled = true;
  btn.textContent = 'Running...';
  try {
    const data = await simulate(10_000, state.scenarioLocks);
    state.scenarioResults = data;
    renderScenarioResults();
  } catch (err) {
    document.getElementById('scenario-results').innerHTML =
      `<div class="empty-state"><p>Scenario failed: ${err.message}</p></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Scenario';
  }
}

function renderScenarioResults() {
  const container = document.getElementById('scenario-results');
  const base = state.simResults?.probs;
  const scen = state.scenarioResults?.probs;
  if (!scen) {
    container.innerHTML = '<div class="empty-state"><p>Lock a match result and run the scenario.</p></div>';
    return;
  }

  const n = Object.keys(state.scenarioLocks).length;

  const delta = (bv, sv) => {
    if (bv == null || sv == null) return '';
    const d = (sv - bv) * 100;
    if (Math.abs(d) < 0.05) return '';
    return d > 0
      ? `<span class="delta-pos"> +${d.toFixed(1)}%</span>`
      : `<span class="delta-neg"> ${d.toFixed(1)}%</span>`;
  };

  const teams = [...state.teams]
    .sort((a, b) => (base?.[b.id]?.winner ?? 0) - (base?.[a.id]?.winner ?? 0))
    .slice(0, 24);

  container.innerHTML = `
    <h3>
      Scenario vs Baseline
      <span style="font-size:12px;color:var(--muted);margin-left:8px">${n} match${n !== 1 ? 'es' : ''} locked</span>
    </h3>
    <div class="table-wrap" style="margin-top:14px">
      <table class="data-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>R16 base → scen</th>
            <th>Final base → scen</th>
            <th>Winner base → scen</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map(t => {
            const bp = base?.[t.id] ?? {};
            const sp = scen?.[t.id]  ?? {};
            const col = k => `<td>${fmtPct(bp[k])} → <strong>${fmtPct(sp[k])}</strong>${delta(bp[k], sp[k])}</td>`;
            return `
              <tr>
                <td>${flag(t.id)}<strong>${t.id}</strong> <span style="color:var(--muted);font-size:12px">${t.name}</span></td>
                ${col('r16')}${col('final')}${col('winner')}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function initScenarioView() {
  document.querySelectorAll('#scenario-group-tabs .group-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scenario-group-tabs .group-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderScenarioMatches(btn.dataset.group);
    });
  });

  document.getElementById('run-scenario-btn').addEventListener('click', runScenario);

  document.getElementById('clear-scenario-btn').addEventListener('click', () => {
    state.scenarioLocks = {};
    state.scenarioResults = null;
    renderScenarioMatches(state.scenarioGroup);
    document.getElementById('scenario-results').innerHTML =
      '<div class="empty-state"><p>Lock a match result and run the scenario.</p></div>';
  });

  renderScenarioMatches('A');
}

// ════════════════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════════════════

async function init() {
  try {
    const [teamsData, fixturesData, resultsData] = await Promise.all([
      api('/teams'),
      api('/fixtures'),
      fetchResults(),
    ]);
    state.teams         = teamsData.teams;
    state.fixtures      = fixturesData.fixtures;
    state.teamById      = Object.fromEntries(state.teams.map(t => [t.id, t]));
    state.lockedResults = resultsData;

    document.getElementById('loading').classList.add('hidden');

    // Wire up tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    initTeamsView();
    initMatchesView();
    initBracketView();
    initScenarioView();
    renderTeamsTable();

    // Run initial simulation in background
    setSimStatus('Running initial simulation...');
    try {
      const data = await simulate(10_000);
      state.simResults = data;
      state.simMeta    = data.meta;
      setSimStatus(`${data.meta.n.toLocaleString()} sims · ${data.meta.elapsedMs}ms`);
      renderTeamsTable();
      if (state.selectedTeamId) renderTeamDetail();
      if (document.getElementById('tab-bracket').classList.contains('active')) renderBracket();
    } catch {
      setSimStatus('Simulation unavailable');
    }

  } catch (err) {
    document.getElementById('loading').innerHTML = `
      <div style="text-align:center">
        <p style="color:var(--loss);margin-bottom:8px">Failed to load: ${err.message}</p>
        <p style="color:var(--muted)">Is the server running? Try: <code>npm start</code></p>
      </div>`;
  }
}

init();
