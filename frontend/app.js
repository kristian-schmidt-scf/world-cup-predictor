import { createAttackDefenseChart, createScoreHistogram } from './charts.js';

// ── Constants ────────────────────────────────────────────────────────────────
const API = '/api';
const STAGE_LABELS = [
  ['r16', 'R16'], ['qf', 'QF'], ['sf', 'SF'], ['final', 'Final'], ['winner', 'Winner'],
];

const FLAGS = {
  MEX:'🇲🇽', RSA:'🇿🇦', KOR:'🇰🇷', CZE:'🇨🇿',
  CAN:'🇨🇦', BIH:'🇧🇦', QAT:'🇶🇦', SUI:'🇨🇭',
  BRA:'🇧🇷', MAR:'🇲🇦', HAI:'🇭🇹', SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA:'🇺🇸', PRY:'🇵🇾', AUS:'🇦🇺', TUR:'🇹🇷',
  GER:'🇩🇪', CUW:'🇨🇼', CIV:'🇨🇮', ECU:'🇪🇨',
  NED:'🇳🇱', JPN:'🇯🇵', SWE:'🇸🇪', TUN:'🇹🇳',
  BEL:'🇧🇪', EGY:'🇪🇬', IRN:'🇮🇷', NZL:'🇳🇿',
  ESP:'🇪🇸', CPV:'🇨🇻', KSA:'🇸🇦', URU:'🇺🇾',
  FRA:'🇫🇷', SEN:'🇸🇳', IRQ:'🇮🇶', NOR:'🇳🇴',
  ARG:'🇦🇷', ALG:'🇩🇿', AUT:'🇦🇹', JOR:'🇯🇴',
  POR:'🇵🇹', COD:'🇨🇩', UZB:'🇺🇿', COL:'🇨🇴',
  ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO:'🇭🇷', GHA:'🇬🇭', PAN:'🇵🇦',
};
const flag = id => FLAGS[id] ?? '';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  teams:          [],
  fixtures:       [],
  teamById:       {},
  simResults:     null,
  simMeta:        null,
  scenarioResults: null,
  lockedResults:  {},          // { matchKey: { goalsA, goalsB } }
  selectedTeamId: null,
  matchCache:     {},          // { 'FRA-ARG': prediction }
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

async function simulate(numSims, lockedResults = {}) {
  return api('/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numSims, lockedResults }),
  });
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
        <td><span class="flag">${flag(t.id)}</span> <strong>${t.id}</strong> <span style="color:var(--muted);font-size:12px">${t.name}</span></td>
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
    <div class="team-name"><span class="flag">${flag(t.id)}</span> ${t.name}</div>
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

function fixtureRowHtml(f) {
  const name = id => state.teamById[id]?.name ?? id;
  return `
    <tr class="fixture-row" data-match="${f.id}">
      <td>${fmtDate(f.date)}</td>
      <td><span class="flag">${flag(f.home)}</span> <strong>${f.home}</strong></td>
      <td style="color:var(--muted)">vs</td>
      <td><span class="flag">${flag(f.away)}</span> <strong>${f.away}</strong></td>
      <td id="xg-${f.id}">—</td>
      <td id="wdl-${f.id}">—</td>
      <td><span class="badge badge-upcoming">Upcoming</span></td>
    </tr>
    <tr class="fixture-detail-row" id="detail-${f.id}">
      <td colspan="7">
        <div class="match-detail-inner">
          <div id="meta-${f.id}" style="color:var(--muted);font-size:13px">Loading...</div>
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
    </div>`;

  createScoreHistogram(`hist-${f.id}`, pred.topScores);
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
}

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
        <td><span class="flag">${flag(t.id)}</span> <strong>${t.id}</strong> <span style="color:var(--muted);font-size:12px">${t.name}</span></td>
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

function matchKey(f) { return `${f.group}-${f.home}-${f.away}`; }

function renderScenarioMatches(group) {
  state.scenarioGroup = group;
  const container = document.getElementById('scenario-matches');
  const fixtures  = state.fixtures.filter(f => f.stage === 'group' && f.group === group);

  container.innerHTML = fixtures.map(f => {
    const key    = matchKey(f);
    const locked = state.lockedResults[key];
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
        delete state.lockedResults[key];
      } else {
        const scores = { win: { goalsA:2, goalsB:0 }, draw: { goalsA:0, goalsB:0 }, loss: { goalsA:0, goalsB:2 } };
        state.lockedResults[key] = scores[outcome];
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
    const data = await simulate(10_000, state.lockedResults);
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

  const n = Object.keys(state.lockedResults).length;

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
                <td><span class="flag">${flag(t.id)}</span> <strong>${t.id}</strong> <span style="color:var(--muted);font-size:12px">${t.name}</span></td>
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
    state.lockedResults = {};
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
    const [teamsData, fixturesData] = await Promise.all([
      api('/teams'),
      api('/fixtures'),
    ]);
    state.teams    = teamsData.teams;
    state.fixtures = fixturesData.fixtures;
    state.teamById = Object.fromEntries(state.teams.map(t => [t.id, t]));

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
