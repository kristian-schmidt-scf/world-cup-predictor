import { createAttackDefenseChart, createScoreHistogram } from './charts.js';
import { t, getLang, setLang, teamName } from './i18n.js';
import { drawTournamentFlow } from './sankey.js';

// ── Constants ────────────────────────────────────────────────────────────────
const API = '/api';
// Translated at render time so language switches are reflected immediately
const STAGE_LABELS = () => [
  ['r16', t('roundR16')], ['qf', t('roundQF')], ['sf', t('roundSF')],
  ['final', t('roundFinal')], ['winner', t('roundWinner')],
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
  simGroups:      null,
  simMeta:        null,
  scenarioResults: null,
  lockedResults:  {},   // real match results persisted on server { matchKey: { goalsA, goalsB } }
  scenarioLocks:  {},   // hypothetical scenario locks (Scenario Explorer only)
  selectedTeamId: null,
  compareTeamId:  null,   // second team for Sankey comparison
  sankeyVisible:  false,  // whether the Sankey diagram section is expanded
  matchCache:     {},   // { 'FRA-ARG': prediction }
  expandedMatch:  null,
  matchGroup:     'A',
  scenarioGroup:  'A',
  filter:         '',
  sort:           { col: 'elo', dir: -1 },  // dir: -1 = desc, 1 = asc
  bracketView:    'tree',
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
const getTeamName = id => teamName(id) ?? state.teamById[id]?.name ?? id;
const fmtPct  = v  => v != null ? (v * 100).toFixed(1) + '%' : '—';
const pClass  = v  => v == null ? '' : v >= 0.10 ? 'p-high' : v >= 0.03 ? 'p-med' : 'p-low';
const fmtDate = ds => ds ? new Date(ds).toLocaleDateString(t('dateLocale'), { month:'short', day:'numeric' }) : '—';
const teamProbs = id => state.simResults?.probs?.[id] ?? null;

// Returns the status badge HTML for a fixture based on time and locked state.
function countdownBadge(f) {
  const locked = state.lockedResults[matchKey(f)];
  if (locked) return `<span class="badge badge-done">${t('badgeFTScore', locked.goalsA, locked.goalsB)}</span>`;

  if (!f.kickoff) return `<span class="badge badge-upcoming">${t('badgeUpcoming')}</span>`;

  const now = Date.now();
  const ko  = new Date(f.kickoff).getTime();
  const end = ko + 110 * 60 * 1000; // 90 min + 20 min buffer for stoppages

  if (now >= ko && now < end) {
    return `<span class="badge badge-live">${t('badgeLive')}</span>`;
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

  const kickoffLocal = new Date(f.kickoff).toLocaleString(t('dateLocale'), {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `<span class="badge badge-upcoming" title="${t('kickoffLabel', kickoffLocal)}">${label}</span>`;
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
    ? state.teams.filter(tm => {
        const enName = tm.name.toLowerCase();
        const deName = teamName(tm.id)?.toLowerCase() ?? '';
        return enName.includes(q) || deName.includes(q) || tm.id.toLowerCase().includes(q);
      })
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

  tbody.innerHTML = teams.map(tm => {
    const pr  = teamProbs(tm.id);
    const sel = tm.id === state.selectedTeamId;
    return `
      <tr class="clickable${sel ? ' row-selected' : ''}" data-team="${tm.id}">
        <td><span class="badge badge-group">${tm.group}</span></td>
        <td>${flag(tm.id)}<strong>${tm.id}</strong> <span style="color:var(--muted);font-size:12px">${getTeamName(tm.id)}</span></td>
        <td>${tm.elo ?? '—'}</td>
        <td>${tm.attack  != null ? tm.attack.toFixed(3)  : '—'}</td>
        <td>${tm.defense != null ? tm.defense.toFixed(3) : '—'}</td>
        <td>${tm.formScore != null ? tm.formScore : '—'}</td>
        <td>${tm.marketValueM != null ? '€' + tm.marketValueM + 'M' : '—'}</td>
        <td class="${pClass(pr?.winner)}">${pr ? fmtPct(pr.winner) : (state.simResults ? '—' : '...')}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.dataset.team;
      state.selectedTeamId = state.selectedTeamId === id ? null : id;
      if (state.compareTeamId === state.selectedTeamId) state.compareTeamId = null;
      renderTeamsTable();
      renderTeamDetail();
    });
  });
}

// ── Sankey helpers ─────────────────────────────────────────────────────────────

function buildSankeyStages(teamId) {
  const pr = teamProbs(teamId);
  if (!pr) return null;
  const tm     = state.teamById[teamId];
  const pQual  = state.simGroups?.[tm.group]?.[teamId]?.pQual ?? pr.r16;
  return [
    { label: t('sankeyStageStart'), prob: 1.0 },
    { label: t('sankeyStageGroup'), prob: pQual },
    { label: t('sankeyStageR16'),   prob: pr.r16 },
    { label: t('sankeyStageQF'),    prob: pr.qf },
    { label: t('sankeyStageSF'),    prob: pr.sf },
    { label: t('sankeyStageFinal'), prob: pr.final },
    { label: t('sankeyStageWin'),   prob: pr.winner },
  ];
}

function renderSankeySection() {
  const wrap = document.getElementById('sankey-canvas-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const stages1 = buildSankeyStages(state.selectedTeamId);
  if (!stages1) return;

  const tm1 = state.teamById[state.selectedTeamId];
  const stageClickHandler = (tm) => (idx) => {
    if (idx <= 1) {
      switchTab('matches');
      document.querySelector(`#group-tabs .group-tab[data-group="${tm.group}"]`)?.click();
    } else {
      switchTab('bracket');
    }
  };

  const stages2 = state.compareTeamId ? buildSankeyStages(state.compareTeamId) : null;

  if (!stages2) {
    const slot = document.createElement('div');
    wrap.appendChild(slot);
    drawTournamentFlow(slot, stages1, {
      color: '#3b82f6',
      title: getTeamName(state.selectedTeamId),
      onStageClick: stageClickHandler(tm1),
    });
  } else {
    const tm2  = state.teamById[state.compareTeamId];
    const row  = document.createElement('div');
    row.className = 'sankey-compare-row';
    const h1 = document.createElement('div');
    h1.className = 'sankey-half';
    drawTournamentFlow(h1, stages1, {
      color: '#3b82f6',
      title: getTeamName(state.selectedTeamId),
      onStageClick: stageClickHandler(tm1),
    });
    const h2 = document.createElement('div');
    h2.className = 'sankey-half';
    drawTournamentFlow(h2, stages2, {
      color: '#f59e0b',
      title: getTeamName(state.compareTeamId),
      onStageClick: stageClickHandler(tm2),
    });
    row.appendChild(h1);
    row.appendChild(h2);
    wrap.appendChild(row);
  }
}

function renderTeamDetail() {
  const panel = document.getElementById('team-detail');
  if (!state.selectedTeamId) {
    panel.innerHTML = `<div class="empty-state"><p>${t('selectTeam')}</p></div>`;
    return;
  }
  const tm = state.teamById[state.selectedTeamId];
  if (!tm) return;
  const pr = teamProbs(tm.id);
  const groupTeams = state.teams.filter(g => g.group === tm.group);

  const stagesHtml = pr
    ? STAGE_LABELS().map(([key, label]) => {
        const pv  = pr[key] ?? 0;
        const w   = Math.min(100, Math.round(pv * 100));
        return `
          <div class="stage-row">
            <span class="stage-label">${label}</span>
            <div class="stage-bar"><div class="stage-fill" style="width:${w}%"></div></div>
            <span class="stage-pct">${(pv*100).toFixed(1)}%</span>
          </div>`;
      }).join('')
    : `<p style="color:var(--muted);font-size:13px">${t('runSimForProbs')}</p>`;

  const record = tm.record
    ? `${tm.record.wins}${t('h2hW')} ${tm.record.draws}${t('h2hD')} ${tm.record.losses}${t('h2hL')}`
    : '—';

  // Compare options for Sankey dropdown (all teams except current)
  const compareOptions = state.teams
    .filter(t2 => t2.id !== tm.id)
    .map(t2 => `<option value="${t2.id}"${t2.id === state.compareTeamId ? ' selected' : ''}>${t2.id} — ${getTeamName(t2.id)}</option>`)
    .join('');

  const sankeyBodyHtml = pr ? `
    <div class="sankey-controls">
      <label class="sankey-compare-lbl">${t('sankeyCompare')}</label>
      <select id="sankey-compare-sel" class="sankey-select">
        <option value="">${t('sankeyCompareNone')}</option>
        ${compareOptions}
      </select>
    </div>
    <div id="sankey-canvas-wrap"></div>
  ` : `<p class="sankey-no-sim">${t('sankeyNoSim')}</p>`;

  panel.innerHTML = `
    <div class="team-name">${flag(tm.id)}${getTeamName(tm.id)}</div>
    <div class="team-meta">${t('teamMeta', tm.group, tm.confederation, tm.fifaRank)}</div>

    <div class="team-stats">
      <div class="stat-box">
        <div class="stat-label">${t('statElo')}</div>
        <div class="stat-value">${tm.elo ?? '—'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${t('statLast5')}</div>
        <div class="stat-value" style="font-family:monospace">${tm.last5 ?? '—'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${t('statRecord')}</div>
        <div class="stat-value" style="font-size:13px">${record}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${t('statMarket')}</div>
        <div class="stat-value" style="font-size:13px">${tm.marketValueM ? '€' + tm.marketValueM + 'M' : '—'}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">
      ${t('groupAttackDefense', tm.group)}
    </div>
    <div class="chart-container"><canvas id="atk-chart"></canvas></div>

    <div class="path-title" style="margin-top:16px">${t('pathToFinal')}</div>
    ${stagesHtml}

    <div class="sankey-section">
      <div class="sankey-section-header">
        <span class="path-title">${t('sankeyTitle')}</span>
        <button class="btn-secondary btn-sm" id="sankey-toggle">
          ${state.sankeyVisible ? t('sankeyHide') : t('sankeyToggle')}
        </button>
      </div>
      ${state.sankeyVisible ? sankeyBodyHtml : ''}
    </div>`;

  createAttackDefenseChart('atk-chart', groupTeams);

  document.getElementById('sankey-toggle')?.addEventListener('click', () => {
    state.sankeyVisible = !state.sankeyVisible;
    renderTeamDetail();
  });

  if (state.sankeyVisible && pr) {
    document.getElementById('sankey-compare-sel')?.addEventListener('change', (e) => {
      state.compareTeamId = e.target.value || null;
      renderSankeySection();
    });
    renderSankeySection();
  }
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
    <p class="fixture-section-title">${t('groupMatches', group, fixtures.length)}</p>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('thDate')}</th><th>${t('thHome')}</th><th></th><th>${t('thAway')}</th>
            <th>${t('thXg')}</th><th>${t('thWDL')}</th><th>${t('thStatus')}</th>
          </tr>
        </thead>
        <tbody>${fixtures.map(fixtureRowHtml).join('')}</tbody>
      </table>
    </div>
    <div id="group-standings-container"></div>`;

  fixtures.forEach(f => {
    document.querySelector(`tr[data-match="${f.id}"]`)
      ?.addEventListener('click', () => toggleMatch(f));
  });

  renderGroupStandings(group);

  // Pre-load predictions (all 6 in parallel)
  fixtures.forEach(f => prefetchPrediction(f));
}

function renderGroupStandings(group) {
  const container = document.getElementById('group-standings-container');
  if (!container) return;

  const gs = state.simGroups?.[group];
  if (!gs) {
    container.innerHTML = `<p class="gs-no-sim">${t('gsNoSim')}</p>`;
    return;
  }

  // Sort teams by avgPts desc, then avgGd desc
  const teams = Object.entries(gs)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.avgPts - a.avgPts || b.avgGd - a.avgGd);

  const qualBar = (pQual) => {
    const pct = (pQual * 100).toFixed(0);
    const color = pQual >= 0.7 ? 'var(--win)' : pQual >= 0.4 ? 'var(--draw)' : 'var(--loss)';
    return `<div class="gs-qual-bar-wrap">
      <div class="gs-qual-bar" style="width:${pct}%;background:${color}"></div>
    </div>
    <span class="gs-qual-pct" style="color:${color}">${pct}%</span>`;
  };

  const probCell = (p, isGood) => {
    const pct = (p * 100).toFixed(1);
    const alpha = isGood ? Math.min(0.7, p * 1.4) : Math.min(0.6, p * 1.2);
    const bg = isGood
      ? `rgba(34,197,94,${alpha.toFixed(2)})`
      : `rgba(239,68,68,${alpha.toFixed(2)})`;
    return `<td class="gs-prob-cell" style="background:${bg}">${pct}%</td>`;
  };

  const rows = teams.map((t, i) => {
    const name = getTeamName(t.id);
    const gd   = t.avgGd >= 0 ? `+${t.avgGd.toFixed(1)}` : t.avgGd.toFixed(1);
    return `<tr>
      <td class="gs-pos">${i + 1}</td>
      <td class="gs-team">${flag(t.id)}<strong>${t.id}</strong> <span class="gs-name">${name}</span></td>
      <td class="gs-num">${t.avgPts.toFixed(1)}</td>
      <td class="gs-num ${t.avgGd >= 0 ? 'gs-pos-gd' : 'gs-neg-gd'}">${gd}</td>
      ${probCell(t.p1st, true)}
      ${probCell(t.p2nd, true)}
      ${probCell(t.p4th, false)}
      <td class="gs-qual-cell">${qualBar(t.pQual)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="gs-section">
      <div class="gs-header">
        ${t('simulatedStandings')}
        <span class="gs-sub">${t('gsSimCount', state.simMeta.n)}</span>
      </div>
      <div class="table-wrap">
        <table class="data-table gs-table">
          <thead>
            <tr>
              <th>${t('thPos')}</th>
              <th>${t('thGsTeam')}</th>
              <th title="${t('thAvgPtsTitle')}">${t('thAvgPts')}</th>
              <th title="${t('thAvgGDTitle')}">${t('thAvgGD')}</th>
              <th title="${t('thP1stTitle')}">${t('thP1st')}</th>
              <th title="${t('thP2ndTitle')}">${t('thP2nd')}</th>
              <th title="${t('thOutTitle')}">${t('thOut')}</th>
              <th title="${t('thQualifyTitle')}">${t('thQualify')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function matchKey(f) { return `${f.group}-${f.home}-${f.away}`; }

function lockSectionHtml(f) {
  const key    = matchKey(f);
  const locked = state.lockedResults[key];
  const hn     = getTeamName(f.home);
  const an     = getTeamName(f.away);

  if (locked) {
    return `
      <div class="lock-section lock-section--locked">
        <span class="lock-label">${t('resultLocked')}</span>
        <span class="lock-score">${flag(f.home)} ${hn} <strong>${locked.goalsA} – ${locked.goalsB}</strong> ${an} ${flag(f.away)}</span>
        <button class="lock-btn lock-btn--unlock" data-key="${key}">${t('unlockBtn')}</button>
      </div>`;
  }

  return `
    <div class="lock-section">
      <span class="lock-label">${t('lockResult')}</span>
      <div class="lock-inputs">
        ${flag(f.home)} <span class="lock-team">${f.home}</span>
        <input class="lock-score-input" id="goals-a-${f.id}" type="number" min="0" max="20" value="0">
        <span class="lock-sep">–</span>
        <input class="lock-score-input" id="goals-b-${f.id}" type="number" min="0" max="20" value="0">
        <span class="lock-team">${f.away}</span> ${flag(f.away)}
        <button class="lock-btn lock-btn--lock" data-key="${key}" data-fid="${f.id}">${t('lockBtn')}</button>
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
            <div id="meta-${f.id}" style="color:var(--muted);font-size:13px;margin-top:12px">${t('loading')}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:8px">
              ${t('scoreProbTitle')}
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
  if (xgEl) xgEl.textContent = `${pred.xgA.toFixed(2)}–${pred.xgB.toFixed(2)}`;
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

  const tn = id => getTeamName(id);
  const [w, d, l] = [pred.pWin, pred.pDraw, pred.pLoss];

  const h2hHtml = buildH2HHtml(f, pred);

  metaEl.innerHTML = `
    <div style="font-weight:700;color:var(--text);margin-bottom:10px">${flag(f.home)} ${tn(f.home)} vs ${flag(f.away)} ${tn(f.away)}</div>
    <div class="match-meta-label">${t('expectedGoals')}</div>
    <div class="match-meta-val">${pred.xgA.toFixed(2)} – ${pred.xgB.toFixed(2)}</div>
    <div class="match-meta-label">${t('win', f.home)}</div>
    <div class="match-meta-val" style="color:var(--win)">${(w*100).toFixed(1)}%</div>
    <div class="match-meta-label">${t('draw')}</div>
    <div class="match-meta-val" style="color:var(--draw)">${(d*100).toFixed(1)}%</div>
    <div class="match-meta-label">${t('win', f.away)}</div>
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
      <div class="h2h-title">${t('headToHead')}</div>
      <div class="h2h-none">${t('noMeetings')}</div>
    </div>`;
  }

  const last5Rows = h2h.last5.map(m => {
    const resultClass = m.result === 'W' ? 'h2h-r-win' : m.result === 'D' ? 'h2h-r-draw' : 'h2h-r-loss';
    const resultLabel = m.result === 'W' ? t('resultW') : m.result === 'D' ? t('resultD') : t('resultL');
    return `<div class="h2h-match">
      <span class="h2h-date">${m.date.slice(0, 7)}</span>
      <span class="h2h-teams">${flag(m.home)}${m.home} ${m.homeGoals}–${m.awayGoals} ${flag(m.away)}${m.away}</span>
      <span class="h2h-result ${resultClass}">${resultLabel}</span>
    </div>`;
  }).join('');

  let divergence = '';
  if (h2h.played >= 5) {
    const h2hWinRate = h2h.wins / h2h.played;
    const diff = pred.pWin - h2hWinRate;
    if (Math.abs(diff) > 0.15) {
      divergence = `<div class="h2h-divergence">${diff > 0 ? t('h2hStronger', f.home) : t('h2hWeaker', f.home)}</div>`;
    }
  }

  return `
  <div class="h2h-section">
    <div class="h2h-title">${t('headToHead')}</div>
    <div class="h2h-record">
      <span class="h2h-stat h2h-w">${h2h.wins}${t('h2hW')}</span>
      <span class="h2h-sep">–</span>
      <span class="h2h-stat h2h-d">${h2h.draws}${t('h2hD')}</span>
      <span class="h2h-sep">–</span>
      <span class="h2h-stat h2h-l">${h2h.losses}${t('h2hL')}</span>
      <span class="h2h-played">${t('h2hPlayedGoals', h2h.played, h2h.goalsFor, h2h.goalsAgainst)}</span>
    </div>
    ${divergence}
    <div class="h2h-last5-title">${t('h2hLastN', h2h.last5.length)}</div>
    ${last5Rows}
  </div>`;
}

// Called after any real result is locked or unlocked — re-sims and refreshes all views.
async function afterResultChange(results) {
  state.lockedResults = results;
  await renderMatchesGroup(state.matchGroup);
  setSimStatus(t('statusUpdating'));
  try {
    const data = await simulate(10_000);
    state.simResults = data;
    state.simGroups  = data.groups ?? null;
    state.simMeta    = data.meta;
    setSimStatus(t('statusSims', data.meta.n, data.meta.elapsedMs));
    renderTeamsTable();
    if (state.selectedTeamId) renderTeamDetail();
    renderGroupStandings(state.matchGroup);
    if (document.getElementById('tab-bracket').classList.contains('active')) renderBracket();
  } catch {
    setSimStatus(t('statusFailed'));
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
      lockBtn.textContent = t('lockBtn');
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
// BRACKET TREE VIEW
// ════════════════════════════════════════════════════════════════════════════

// SVG layout constants
const BKT = (() => {
  const slotW = 155, slotH = 30, slotGap = 6, matchGap = 10, colGap = 42, hdrH = 22;
  const blockH = slotH * 2 + slotGap + matchGap;
  const colW   = slotW + colGap;
  const svgH   = 16 * blockH + hdrH;
  const svgW   = 5  * colW + slotW + 8;
  return { slotW, slotH, slotGap, matchGap, colGap, hdrH, blockH, colW, svgH, svgW };
})();

// Match centre Y (no header offset)
function bktMcy(r, i) {
  if (r === 0) return i * BKT.blockH + BKT.slotH + BKT.slotGap / 2;
  return (bktMcy(r - 1, 2 * i) + bktMcy(r - 1, 2 * i + 1)) / 2;
}

function buildBracketData() {
  if (!state.simResults) return null;
  const groups = 'ABCDEFGHIJKL'.split('');
  const probs  = state.simResults.probs;

  // Rank each group by r16 probability to approximate finishing position
  const groupRankings = {};
  for (const g of groups) {
    const ts = state.teams.filter(t => t.group === g);
    ts.sort((a, b) => (probs[b.id]?.r16 ?? 0) - (probs[a.id]?.r16 ?? 0));
    groupRankings[g] = ts;
  }

  const groupFirsts  = groups.map(g => groupRankings[g][0]?.id);
  const groupSeconds = groups.map(g => groupRankings[g][1]?.id);
  const groupThirds  = groups.map(g => groupRankings[g][2]?.id);

  // Best 8 third-place teams
  const best8Thirds = groups
    .map((g, i) => ({ id: groupThirds[i], prob: probs[groupThirds[i]]?.r16 ?? 0, group: g }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 8);

  // R32: 16 matches (matches seeding rules from tournamentSimulation.js)
  const r32 = [];
  for (let i = 0; i < 8; i++) {
    r32.push({ teamA: groupFirsts[i], teamB: best8Thirds[i]?.id });
  }
  for (let i = 0; i < 4; i++) {
    r32.push({ teamA: groupFirsts[8 + i], teamB: groupSeconds[4 + i] });
  }
  for (let i = 0; i < 4; i++) {
    r32.push({ teamA: groupSeconds[i], teamB: groupSeconds[8 + i] });
  }

  const bestOf = (a, b, key) => {
    if (!a) return b; if (!b) return a;
    return (probs[a]?.[key] ?? 0) >= (probs[b]?.[key] ?? 0) ? a : b;
  };

  const r32Winners = r32.map(m => bestOf(m.teamA, m.teamB, 'r16'));
  const r16 = [];
  for (let i = 0; i < 16; i += 2) r16.push({ teamA: r32Winners[i], teamB: r32Winners[i + 1] });

  const r16Winners = r16.map(m => bestOf(m.teamA, m.teamB, 'qf'));
  const qf = [];
  for (let i = 0; i < 8; i += 2) qf.push({ teamA: r16Winners[i], teamB: r16Winners[i + 1] });

  const qfWinners = qf.map(m => bestOf(m.teamA, m.teamB, 'sf'));
  const sf = [];
  for (let i = 0; i < 4; i += 2) sf.push({ teamA: qfWinners[i], teamB: qfWinners[i + 1] });

  const sfWinners = sf.map(m => bestOf(m.teamA, m.teamB, 'final'));
  const final = [{ teamA: sfWinners[0], teamB: sfWinners[1] }];
  const champion = bestOf(final[0].teamA, final[0].teamB, 'winner');

  return { r32, r16, qf, sf, final, champion, groupRankings };
}

function bktSlotBg(prob, isChamp) {
  if (isChamp) return '#1a3a6e';
  if (prob >= 0.4) return '#1e3a5f';
  if (prob >= 0.15) return '#1e2d3d';
  return '#1e293b';
}
function bktSlotBorder(prob, isChamp) {
  if (isChamp) return '#d4af37';
  if (prob >= 0.4) return '#3b82f6';
  if (prob >= 0.15) return '#1d4ed8';
  return '#334155';
}
function bktConnColor(prob) {
  if (prob >= 0.4) return '#3b82f6';
  if (prob >= 0.2) return '#1d4ed8';
  return '#334155';
}
function bktProbColor(prob) {
  if (prob >= 0.4) return '#22c55e';
  if (prob >= 0.15) return '#f59e0b';
  return '#94a3b8';
}

function buildSlotSvg(x, y, teamId, probs, probKey, isChamp = false) {
  const { slotW: w, slotH: h } = BKT;
  const prob = probs[teamId]?.[probKey] ?? 0;
  const pct  = (prob * 100).toFixed(1) + '%';
  const iso  = teamId ? FLAGS[teamId] : null;

  if (!teamId) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#1e293b" stroke="#334155"/>
            <text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-family="system-ui" font-size="11" fill="#475569">${t('bktTbd')}</text>`;
  }

  const bg  = bktSlotBg(prob, isChamp);
  const bdr = bktSlotBorder(prob, isChamp);
  const tc  = bktProbColor(prob);
  const bw  = isChamp ? 1.5 : 1;

  const parts = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${bg}" stroke="${bdr}" stroke-width="${bw}"/>`,
  ];
  if (iso) {
    parts.push(`<image href="https://flagcdn.com/w20/${iso}.png" x="${x+6}" y="${y+(h-13)/2}" width="20" height="13"/>`);
  }
  parts.push(`<text x="${x+31}" y="${y+h/2+4}" font-family="system-ui" font-size="11" font-weight="700" fill="#f1f5f9">${teamId}</text>`);
  parts.push(`<text x="${x+w-5}" y="${y+h/2+4}" text-anchor="end" font-family="system-ui" font-size="10" fill="${tc}">${pct}</text>`);

  return `<g class="bkt-slot" data-team="${teamId}" data-prob-key="${probKey}">
    ${parts.join('\n')}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="transparent" class="bkt-hover-region"/>
  </g>`;
}

function renderBracketTree() {
  const container = document.getElementById('bracket-tree');
  if (!state.simResults) {
    container.innerHTML = `<div class="empty-state"><p>${t('noSimTree')}</p></div>`;
    return;
  }

  const bracket = buildBracketData();
  const probs   = state.simResults.probs;
  const { slotW, slotH, slotGap, colGap, hdrH, blockH, colW, svgH, svgW } = BKT;

  const rounds = [
    { label: t('roundR32'),   probKey: 'r16',    matches: bracket.r32   },
    { label: t('roundR16'),   probKey: 'qf',     matches: bracket.r16   },
    { label: t('roundQF'),    probKey: 'sf',     matches: bracket.qf    },
    { label: t('roundSF'),    probKey: 'final',  matches: bracket.sf    },
    { label: t('roundFinal'), probKey: 'winner', matches: bracket.final },
  ];

  const p = [];

  // Round column headers
  rounds.forEach((rd, r) => {
    p.push(`<text x="${r*colW+slotW/2}" y="${hdrH-5}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="0.06em">${rd.label}</text>`);
  });
  p.push(`<text x="${5*colW+slotW/2}" y="${hdrH-5}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#d4af37" letter-spacing="0.06em">${t('bktWinner')}</text>`);

  // Slots and connectors per round
  rounds.forEach((rd, r) => {
    const sx = r * colW;
    rd.matches.forEach((match, i) => {
      const cy      = bktMcy(r, i) + hdrH;
      const topY    = cy - slotGap / 2 - slotH;
      const botY    = cy + slotGap / 2;
      const gx      = sx + slotW + colGap / 2;
      const teY     = topY + slotH / 2;
      const beY     = botY + slotH / 2;

      // Winner's probability for the outgoing connector colour
      const wProb = Math.max(
        probs[match.teamA]?.[rd.probKey] ?? 0,
        probs[match.teamB]?.[rd.probKey] ?? 0,
      );
      const cc = bktConnColor(wProb);

      // Bracket staple gathering the two input slots
      p.push(`<path d="M${sx+slotW},${teY} H${gx} V${beY} H${sx+slotW}" fill="none" stroke="#334155" stroke-width="1.5"/>`);

      if (r < rounds.length - 1) {
        // L-shaped connector to next round's top or bottom slot
        const ni    = Math.floor(i / 2);
        const ncy   = bktMcy(r + 1, ni) + hdrH;
        const ntopY = ncy - slotGap / 2 - slotH;
        const nbotY = ncy + slotGap / 2;
        const tgtY  = i % 2 === 0 ? ntopY + slotH / 2 : nbotY + slotH / 2;
        p.push(`<path d="M${gx},${cy} V${tgtY} H${(r+1)*colW}" fill="none" stroke="${cc}" stroke-width="1.5"/>`);
      } else {
        // Final → Champion: simple horizontal line
        p.push(`<line x1="${gx}" y1="${cy}" x2="${5*colW}" y2="${cy}" stroke="${cc}" stroke-width="2"/>`);
      }

      // Draw the two team slots
      p.push(buildSlotSvg(sx, topY, match.teamA, probs, rd.probKey));
      p.push(buildSlotSvg(sx, botY, match.teamB, probs, rd.probKey));
    });
  });

  // Champion slot (centered on Final match Y)
  const champCy = bktMcy(4, 0) + hdrH;
  p.push(buildSlotSvg(5 * colW, champCy - slotH / 2, bracket.champion, probs, 'winner', true));

  container.innerHTML = `
    <div class="bracket-scroll">
      <svg id="bracket-svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
        ${p.join('\n')}
      </svg>
    </div>
    <div id="bkt-tooltip" class="bkt-tooltip hidden"></div>`;

  setupBracketTooltip();
}

function setupBracketTooltip() {
  const svg = document.getElementById('bracket-svg');
  const tip = document.getElementById('bkt-tooltip');
  if (!svg || !tip) return;

  const probs  = state.simResults.probs;
  const ROUND_LABELS = {
    r16: t('roundR16'), qf: t('roundQF'), sf: t('roundSF'),
    final: t('roundFinal'), winner: t('roundWinner'),
  };

  svg.addEventListener('mousemove', e => {
    const slot = e.target.closest('.bkt-slot');
    if (!slot) { tip.classList.add('hidden'); return; }

    const teamId  = slot.dataset.team;
    const probKey = slot.dataset.probKey;
    const label   = ROUND_LABELS[probKey] ?? probKey;

    const top5 = [...state.teams]
      .filter(tm => (probs[tm.id]?.[probKey] ?? 0) > 0)
      .sort((a, b) => (probs[b.id]?.[probKey] ?? 0) - (probs[a.id]?.[probKey] ?? 0))
      .slice(0, 5);

    tip.innerHTML = `
      <div class="bkt-tip-title">${t('bktTooltipTitle', label)}</div>
      ${top5.map((tm, i) => {
        const p = ((probs[tm.id]?.[probKey] ?? 0) * 100).toFixed(1);
        return `<div class="bkt-tip-row${tm.id === teamId ? ' bkt-tip-current' : ''}">
          <span class="bkt-tip-rank">${i + 1}</span>
          ${flag(tm.id)}<span class="bkt-tip-team">${tm.id}</span>
          <span class="bkt-tip-prob">${p}%</span>
        </div>`;
      }).join('')}`;

    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top  = (e.clientY - 10) + 'px';
    tip.classList.remove('hidden');
  });

  svg.addEventListener('mouseleave', () => tip.classList.add('hidden'));
}

// ════════════════════════════════════════════════════════════════════════════
// BRACKET VIEW
// ════════════════════════════════════════════════════════════════════════════

function renderBracket() {
  const cards = document.getElementById('champion-cards');
  const info  = document.getElementById('bracket-sim-info');

  if (!state.simResults) {
    cards.innerHTML  = '';
    info.textContent = '';
    // Show empty states in both views
    const tbody = document.getElementById('bracket-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">${t('noSimBracket')}</td></tr>`;
    const tree = document.getElementById('bracket-tree');
    if (tree) tree.innerHTML = `<div class="empty-state"><p>${t('noSimTree')}</p></div>`;
    return;
  }

  info.textContent = t('bracketSimInfo', state.simMeta.n, state.simMeta.elapsedMs);

  // Top-5 champion cards (always shown)
  const top5  = [...state.teams]
    .sort((a, b) => (teamProbs(b.id)?.winner ?? 0) - (teamProbs(a.id)?.winner ?? 0))
    .slice(0, 5);
  const ranks = t('ranks');
  cards.innerHTML = top5.map((tm, i) => {
    const pct = ((teamProbs(tm.id)?.winner ?? 0) * 100).toFixed(1);
    return `
      <div class="champion-card">
        <div class="champion-rank">${ranks[i]}</div>
        <div class="champion-flag">${flag(tm.id)}</div>
        <div class="champion-id">${tm.id}</div>
        <div class="champion-name">${getTeamName(tm.id)}</div>
        <div class="champion-pct">${pct}%</div>
      </div>`;
  }).join('');

  if (state.bracketView === 'tree') {
    renderBracketTree();
  } else {
    renderBracketTable();
  }
}

function renderBracketTable() {
  const tbody  = document.getElementById('bracket-tbody');
  const sorted = [...state.teams].sort((a, b) =>
    (teamProbs(b.id)?.winner ?? 0) - (teamProbs(a.id)?.winner ?? 0)
  );
  const cell = v => {
    if (!v) return `<td style="color:var(--border)">—</td>`;
    const alpha = Math.min(0.65, v * 5);
    const bold  = v >= 0.05 ? 'font-weight:700' : '';
    return `<td style="background:rgba(59,130,246,${alpha.toFixed(2)});${bold}">${(v*100).toFixed(1)}%</td>`;
  };
  tbody.innerHTML = sorted.map(tm => {
    const pr = state.simResults.probs[tm.id] ?? {};
    return `
      <tr>
        <td><span class="badge badge-group">${tm.group}</span></td>
        <td>${flag(tm.id)}<strong>${tm.id}</strong> <span style="color:var(--muted);font-size:12px">${getTeamName(tm.id)}</span></td>
        ${cell(pr.r16)}${cell(pr.qf)}${cell(pr.sf)}${cell(pr.final)}${cell(pr.winner)}
      </tr>`;
  }).join('');
}

function initBracketView() {
  document.getElementById('run-sim-btn').addEventListener('click', async () => {
    const btn = document.getElementById('run-sim-btn');
    btn.disabled = true;
    btn.textContent = t('runningSim');
    setSimStatus(t('statusRunning'));
    try {
      const data = await simulate(10_000);
      state.simResults = data;
      state.simGroups  = data.groups ?? null;
      state.simMeta    = data.meta;
      setSimStatus(t('statusSims', data.meta.n, data.meta.elapsedMs));
      renderBracket();
      renderTeamsTable();
      if (state.selectedTeamId) renderTeamDetail();
    } catch (err) {
      setSimStatus(t('statusFailed'));
    } finally {
      btn.disabled = false;
      btn.textContent = t('runSim');
    }
  });

  // Tree / Table view toggle
  document.querySelectorAll('#bracket-view-toggle .view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (state.bracketView === view) return;
      state.bracketView = view;
      document.querySelectorAll('#bracket-view-toggle .view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('bracket-tree-view').style.display  = view === 'tree'  ? '' : 'none';
      document.getElementById('bracket-table-view').style.display = view === 'table' ? '' : 'none';
      if (state.simResults) {
        if (view === 'tree') renderBracketTree();
        else renderBracketTable();
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SCENARIO URL ENCODING
// ════════════════════════════════════════════════════════════════════════════

// Format: ?s=G-HOME-AWAY-gA-gB,G-HOME-AWAY-gA-gB,...
// e.g.    ?s=J-ARG-AUT-2-0,J-ALG-JOR-0-0

function encodeScenario(locks) {
  const entries = Object.entries(locks);
  if (!entries.length) return '';
  return entries
    .map(([key, { goalsA, goalsB }]) => `${key}-${goalsA}-${goalsB}`)
    .join(',');
}

function decodeScenario(param) {
  const locks = {};
  if (!param) return locks;
  for (const entry of param.split(',')) {
    if (!entry.trim()) continue;
    const parts  = entry.split('-');
    if (parts.length < 5) continue;           // need group-home-away-gA-gB (≥5 segments)
    const goalsB = parseInt(parts[parts.length - 1], 10);
    const goalsA = parseInt(parts[parts.length - 2], 10);
    const key    = parts.slice(0, parts.length - 2).join('-');
    if (!isNaN(goalsA) && !isNaN(goalsB) && key) {
      locks[key] = { goalsA, goalsB };
    }
  }
  return locks;
}

function updateScenarioUrl() {
  const encoded = encodeScenario(state.scenarioLocks);
  const url     = new URL(window.location.href);
  if (encoded) {
    url.searchParams.set('s', encoded);
  } else {
    url.searchParams.delete('s');
  }
  history.replaceState(null, '', url.toString());
}

function getShareText() {
  const entries = Object.entries(state.scenarioLocks);
  if (!entries.length) return null;
  const lines = entries.map(([key, { goalsA, goalsB }]) => {
    const parts = key.split('-');
    const hn = getTeamName(parts[1]);
    const an = getTeamName(parts[2]);
    return `${hn} ${goalsA}–${goalsB} ${an}`;
  });
  return `WC 2026 scenario:\n${lines.join('\n')}\n${window.location.href}`;
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
    container.innerHTML = `<p style="color:var(--muted);font-size:13px;padding:8px 0">${t('allLocked')}</p>`;
    return;
  }

  container.innerHTML = fixtures.map(f => {
    const key    = matchKey(f);
    const locked = state.scenarioLocks[key];
    const hn     = getTeamName(f.home);
    const an     = getTeamName(f.away);
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
          <button class="result-btn${isWin  ? ' active' : ''}" data-key="${key}" data-outcome="win">${t('win', f.home)}</button>
          <button class="result-btn${isDraw ? ' active' : ''}" data-key="${key}" data-outcome="draw">${t('draw')}</button>
          <button class="result-btn${isLoss ? ' active' : ''}" data-key="${key}" data-outcome="loss">${t('win', f.away)}</button>
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
      updateScenarioUrl();
      renderScenarioMatches(group);
    });
  });
}

async function runScenario() {
  const btn = document.getElementById('run-scenario-btn');
  btn.disabled = true;
  btn.textContent = t('runningSim');
  try {
    const data = await simulate(10_000, state.scenarioLocks);
    state.scenarioResults = data;
    renderScenarioResults();
  } catch (err) {
    document.getElementById('scenario-results').innerHTML =
      `<div class="empty-state"><p>${t('scenarioFailed', err.message)}</p></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = t('runScenario');
  }
}

function renderScenarioResults() {
  const container = document.getElementById('scenario-results');
  const base = state.simResults?.probs;
  const scen = state.scenarioResults?.probs;
  if (!scen) {
    container.innerHTML = `<div class="empty-state"><p>${t('scenarioNoSim')}</p></div>`;
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
      ${t('scenarioVsBaseline')}
      <span style="font-size:12px;color:var(--muted);margin-left:8px">${t('matchesLocked', n)}</span>
    </h3>
    <div class="table-wrap" style="margin-top:14px">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('thGsTeam')}</th>
            <th>${t('thR16BaseScen')}</th>
            <th>${t('thFinalBaseScen')}</th>
            <th>${t('thWinnerBaseScen')}</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map(tm => {
            const bp = base?.[tm.id] ?? {};
            const sp = scen?.[tm.id]  ?? {};
            const col = k => `<td>${fmtPct(bp[k])} → <strong>${fmtPct(sp[k])}</strong>${delta(bp[k], sp[k])}</td>`;
            return `
              <tr>
                <td>${flag(tm.id)}<strong>${tm.id}</strong> <span style="color:var(--muted);font-size:12px">${getTeamName(tm.id)}</span></td>
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
    updateScenarioUrl();
    renderScenarioMatches(state.scenarioGroup);
    document.getElementById('scenario-results').innerHTML =
      `<div class="empty-state"><p>${t('scenarioNoSim')}</p></div>`;
  });

  document.getElementById('copy-link-btn').addEventListener('click', async () => {
    const btn = document.getElementById('copy-link-btn');
    updateScenarioUrl();
    try {
      await navigator.clipboard.writeText(window.location.href);
      btn.textContent = t('copied');
    } catch {
      btn.textContent = t('copyFailed');
    }
    setTimeout(() => { btn.textContent = t('copyLink'); }, 1500);
  });

  document.getElementById('share-text-btn').addEventListener('click', async () => {
    const btn  = document.getElementById('share-text-btn');
    const text = getShareText();
    if (!text) {
      btn.textContent = t('shareNoLocks');
      setTimeout(() => { btn.textContent = t('shareScenario'); }, 1500);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = t('copied');
    } catch {
      btn.textContent = t('copyFailed');
    }
    setTimeout(() => { btn.textContent = t('shareScenario'); }, 1500);
  });

  renderScenarioMatches('A');
}

// ════════════════════════════════════════════════════════════════════════════
// I18N HELPERS
// ════════════════════════════════════════════════════════════════════════════

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function rerenderAll() {
  applyStaticTranslations();
  renderTeamsTable();
  if (state.selectedTeamId) renderTeamDetail();
  state.expandedMatch = null;
  renderMatchesGroup(state.matchGroup);
  renderGroupStandings(state.matchGroup);
  renderScenarioMatches(state.scenarioGroup);
  if (state.scenarioResults) renderScenarioResults();
  const bracketTab = document.getElementById('tab-bracket');
  if (bracketTab?.classList.contains('active') && state.simResults) renderBracket();
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
    state.teamById      = Object.fromEntries(state.teams.map(tm => [tm.id, tm]));
    state.lockedResults = resultsData;

    // Restore scenario locks from URL ?s= param (before initScenarioView renders)
    const _sParam = new URLSearchParams(window.location.search).get('s');
    if (_sParam) {
      const decoded   = decodeScenario(_sParam);
      const validKeys = new Set(state.fixtures.map(f => matchKey(f)));
      state.scenarioLocks = Object.fromEntries(
        Object.entries(decoded).filter(([k]) => validKeys.has(k))
      );
    }

    document.getElementById('loading').classList.add('hidden');
    applyStaticTranslations();

    // Wire up tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    initTeamsView();
    initMatchesView();
    initBracketView();
    initScenarioView();
    renderTeamsTable();

    // Auto-navigate to Scenario tab and correct group if URL had locks
    if (_sParam && Object.keys(state.scenarioLocks).length) {
      switchTab('scenario');
      const firstGroup = Object.keys(state.scenarioLocks)[0].split('-')[0];
      document.querySelector(`#scenario-group-tabs .group-tab[data-group="${firstGroup}"]`)?.click();
    }

    // Wire up language toggle button
    const langBtn = document.getElementById('lang-btn');
    langBtn.textContent = getLang() === 'en' ? 'DE' : 'EN';
    langBtn.addEventListener('click', () => {
      const newLang = getLang() === 'en' ? 'de' : 'en';
      setLang(newLang);
      langBtn.textContent = newLang === 'en' ? 'DE' : 'EN';
      rerenderAll();
    });

    // Run initial simulation in background
    setSimStatus(t('statusInitial'));
    try {
      const data = await simulate(10_000);
      state.simResults = data;
      state.simGroups  = data.groups ?? null;
      state.simMeta    = data.meta;
      setSimStatus(t('statusSims', data.meta.n, data.meta.elapsedMs));
      renderTeamsTable();
      if (state.selectedTeamId) renderTeamDetail();
      renderGroupStandings(state.matchGroup);
      if (document.getElementById('tab-bracket').classList.contains('active')) renderBracket();
    } catch {
      setSimStatus(t('statusUnavailable'));
    }

  } catch (err) {
    document.getElementById('loading').innerHTML = `
      <div style="text-align:center">
        <p style="color:var(--loss);margin-bottom:8px">${t('serverError', err.message)}</p>
        <p style="color:var(--muted)">${t('serverHint')}<code>npm start</code></p>
      </div>`;
  }
}

init();
