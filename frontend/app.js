import { createAttackDefenseChart, createScoreHistogram, createScoreHeatmap } from './charts.js';
import { t, getLang, setLang, teamName } from './i18n.js';
import { drawTournamentFlow } from './sankey.js';
import { drawShareCard } from './sharecard.js';

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
  upsets:         [],   // upset records in reverse-chronological order
  chaosScore:     0,    // cumulative upset magnitude
  histFilters:    { team: '', opponent: '', tournament: 'all', yearFrom: '', yearTo: '', result: 'all' },
  histPage:       1,
  histData:       null,
  histCurated:    null,
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
  simModel:         'full',  // 'full' | 'dc' | 'elo'
  modelComparison:  null,   // result of /api/simulate/compare
  bktSelectedTeam:    null,   // team currently highlighted in the bracket tree
  unavailablePlayers: new Set(), // player IDs marked as injured/suspended
  availFilter:        '',        // search text in player availability panel
  shareFormat:    'landscape',
  lbToken:        (() => { try { return localStorage.getItem('wc26-lb-token'); } catch { return null; } })(),
  lbUser:         null,
  lbData:         null,
  myGroupPicks:   null,   // { A:[id,id,id,id], ... }
  myThirdPicks:   null,   // array of 8 group letters whose 3rd-place team advances
  myR32Pairs:     null,   // [[teamA,teamB], ...] 16 pairs
  bracketPicks:   null,   // { r32:[...16], r16:[...8], qf:[...4], sf:[...2], champion:null }
  bcStep:         null,   // null|'groups'|'thirds'|'r32'|'r16'|'qf'|'sf'|'final'
  fantasy: {
    players:   null,      // enriched player array from API (loaded once)
    squad:     [],        // selected Player objects (max 15)
    captainId: null,
    view:      'builder', // 'builder' | 'myteam' | 'optimise'
    filter:    { pos: '', nameQuery: '', maxPrice: 15 },
    sortBy:    'xpts',
  },
};

// ── API ───────────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function simulate(numSims, scenarioLocks = {}, model = state.simModel, playerModifiers = {}) {
  return api('/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numSims, lockedResults: scenarioLocks, model, playerModifiers }),
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

function setSimStatus(msg, refining = false) {
  const el = document.getElementById('sim-status');
  el.textContent = msg;
  el.classList.toggle('sim-refining', refining);
}

function flashSimUpdate() {
  ['champion-cards', 'bracket-tree', 'bracket-tbody'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('sim-refreshed');
    void el.offsetWidth; // force reflow so animation re-triggers
    el.classList.add('sim-refreshed');
    el.addEventListener('animationend', () => el.classList.remove('sim-refreshed'), { once: true });
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p  => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b   => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  if (tab === 'bracket')     { renderBracket(); renderShareSection(); }
  if (tab === 'groups')      renderGroupsTab();
  if (tab === 'history')     renderHistoryTab();
  if (tab === 'leaderboard') renderLeaderboardTab();
  if (tab === 'fantasy')     renderFantasyTab();
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
            <div class="score-chart-header">
              <span style="font-size:11px;color:var(--muted)">${t('scoreProbTitle')}</span>
              <div class="score-view-toggle">
                <button class="score-view-btn active" data-view="heatmap" data-fid="${f.id}">${t('hmViewHeatmap')}</button>
                <button class="score-view-btn" data-view="bar" data-fid="${f.id}">${t('hmViewBar')}</button>
              </div>
            </div>
            <div class="score-chart-wrap">
              <div id="heat-${f.id}" class="hm-outer"></div>
              <canvas id="hist-${f.id}" style="display:none"></canvas>
            </div>
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

  createScoreHeatmap(`heat-${f.id}`, pred.scoreMatrix, {
    homeLabel: t('hmHomeGoals'),
    awayLabel: t('hmAwayGoals'),
    winLabel:  t('hmWin'),
    drawLabel: t('hmDraw'),
    lossLabel: t('hmLoss'),
  });

  const detailRow = document.getElementById(`detail-${f.id}`);
  detailRow?.querySelectorAll('.score-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      detailRow.querySelectorAll('.score-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const heatEl = document.getElementById(`heat-${f.id}`);
      const histEl = document.getElementById(`hist-${f.id}`);
      if (btn.dataset.view === 'heatmap') {
        heatEl.style.display = '';
        histEl.style.display = 'none';
      } else {
        heatEl.style.display = 'none';
        histEl.style.display = '';
        createScoreHistogram(`hist-${f.id}`, pred.topScores);
      }
    });
  });
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
  // detect newly locked match key (present in results but absent/changed in current state)
  const newlyLockedKey = Object.keys(results).find(k => {
    const prev = state.lockedResults[k];
    const next = results[k];
    return !prev || prev.goalsA !== next.goalsA || prev.goalsB !== next.goalsB;
  }) ?? null;

  // snapshot title probabilities before re-simulation
  const prevProbs = state.simResults?.probs
    ? Object.fromEntries(Object.entries(state.simResults.probs).map(([id, p]) => [id, { ...p }]))
    : null;

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

    if (newlyLockedKey && prevProbs) {
      processUpset(newlyLockedKey, results[newlyLockedKey], prevProbs);
    }
  } catch {
    setSimStatus(t('statusFailed'));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// UPSET DETECTOR
// ════════════════════════════════════════════════════════════════════════════

const UPSET_THRESHOLD = 0.40; // winner had < 40% win probability

function processUpset(lockedKey, result, prevProbs) {
  const f = state.fixtures.find(fix => matchKey(fix) === lockedKey);
  if (!f) return;

  const { goalsA, goalsB } = result;
  if (goalsA === goalsB) return; // draws have no winner

  const homeWon  = goalsA > goalsB;
  const winner   = homeWon ? f.home : f.away;
  const loser    = homeWon ? f.away : f.home;
  const pred     = state.matchCache[`${f.home}-${f.away}`];
  if (!pred) return;

  const pWin = homeWon ? pred.pWin : pred.pLoss;
  if (pWin >= UPSET_THRESHOLD) return; // not an upset

  const magnitude = +(1 - pWin).toFixed(3);

  // top 5 movers by absolute change in title win probability
  const newProbs = state.simResults.probs;
  const movers = Object.keys(newProbs)
    .map(id => {
      const before = (prevProbs[id]?.winner ?? 0) * 100;
      const after  = (newProbs[id]?.winner ?? 0) * 100;
      return { teamId: id, before, after, delta: after - before };
    })
    .filter(m => Math.abs(m.delta) >= 0.1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const upsetRecord = {
    fixture: f,
    winner,
    loser,
    goalsWinner: homeWon ? goalsA : goalsB,
    goalsLoser:  homeWon ? goalsB : goalsA,
    pWin,
    magnitude,
    movers,
  };

  state.upsets.unshift(upsetRecord);
  state.chaosScore = +((state.chaosScore + magnitude).toFixed(3));

  showUpsetToast(upsetRecord);
  renderUpsetsFeed();
}

let upsetToastTimer = null;

function showUpsetToast(upset) {
  const toast = document.getElementById('upset-toast');
  if (!toast) return;

  const top3 = upset.movers.slice(0, 3);
  const moversHtml = top3.map(m => {
    const arrow = m.delta > 0 ? '↑' : '↓';
    const cls   = m.delta > 0 ? 'ut-up' : 'ut-down';
    return `<div class="ut-mover ${cls}">${flag(m.teamId)} ${m.teamId} ${arrow}${Math.abs(m.delta).toFixed(1)}pp</div>`;
  }).join('');

  toast.innerHTML = `
    <div class="ut-header">
      <span class="ut-badge" data-i18n="upsetBadge">${t('upsetBadge')}</span>
      <button class="ut-close" onclick="document.getElementById('upset-toast').classList.remove('ut-visible')">×</button>
    </div>
    <div class="ut-result">${flag(upset.winner)} <strong>${upset.winner}</strong> ${upset.goalsWinner}–${upset.goalsLoser} <strong>${upset.loser}</strong> ${flag(upset.loser)}</div>
    <div class="ut-prob">${t('upsetFavored', (upset.pWin * 100).toFixed(0))}</div>
    ${moversHtml ? `<div class="ut-movers-label">${t('upsetImpact')}</div>${moversHtml}` : ''}
  `;

  toast.classList.add('ut-visible');
  if (upsetToastTimer) clearTimeout(upsetToastTimer);
  upsetToastTimer = setTimeout(() => toast.classList.remove('ut-visible'), 9000);
}

function chaosLabel(score) {
  if (score < 1.5) return t('chaosLow');
  if (score < 3.0) return t('chaosMedium');
  if (score < 5.0) return t('chaosHigh');
  return t('chaosChaotic');
}

function renderUpsetsFeed() {
  const section = document.getElementById('upsets-section');
  const feed    = document.getElementById('upsets-feed');
  const display = document.getElementById('chaos-score-display');
  if (!section || !feed) return;

  if (state.upsets.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  if (display) {
    display.textContent = `${t('chaosScore')}: ${state.chaosScore.toFixed(2)} — ${chaosLabel(state.chaosScore)}`;
  }

  feed.innerHTML = state.upsets.map(u => {
    const moversHtml = u.movers.slice(0, 3).map(m => {
      const arrow = m.delta > 0 ? '↑' : '↓';
      const cls   = m.delta > 0 ? 'uf-up' : 'uf-down';
      return `<span class="uf-mover ${cls}">${flag(m.teamId)} ${m.teamId} ${m.before.toFixed(1)}%→${m.after.toFixed(1)}% (${arrow}${Math.abs(m.delta).toFixed(1)}pp)</span>`;
    }).join('');

    return `
      <div class="uf-card">
        <div class="uf-card-header">
          <span class="uf-badge">${t('upsetBadge')}</span>
          <span class="uf-result">${flag(u.winner)} <strong>${u.winner}</strong> ${u.goalsWinner}–${u.goalsLoser} <strong>${u.loser}</strong> ${flag(u.loser)}</span>
          <span class="uf-prob">${t('upsetFavored', (u.pWin * 100).toFixed(0))}</span>
          <span class="uf-mag">${t('upsetMag', (u.magnitude * 100).toFixed(0))}</span>
        </div>
        ${moversHtml ? `<div class="uf-movers">${t('upsetImpact')}: ${moversHtml}</div>` : ''}
      </div>`;
  }).join('');
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
  setupBracketClicks();

  // Restore selection if a team was highlighted before this re-render
  if (state.bktSelectedTeam) {
    const svg = document.getElementById('bracket-svg');
    if (svg?.querySelector(`.bkt-slot[data-team="${state.bktSelectedTeam}"]`)) {
      applyBracketSelection(svg, state.bktSelectedTeam);
      renderBktTeamPanel(state.bktSelectedTeam);
    } else {
      state.bktSelectedTeam = null;
    }
  }
}

function clearBracketSelection() {
  const svg = document.getElementById('bracket-svg');
  if (svg) {
    svg.classList.remove('has-selection');
    svg.querySelectorAll('.bkt-slot.selected').forEach(el => el.classList.remove('selected'));
  }
  document.getElementById('bkt-team-panel')?.classList.add('hidden');
  state.bktSelectedTeam = null;
}

function renderBktTeamPanel(teamId) {
  const panel = document.getElementById('bkt-team-panel');
  if (!panel || !state.simResults) return;

  const probs = state.simResults.probs[teamId];
  if (!probs) return;

  const fmt = v => (v * 100).toFixed(1) + '%';
  const probColor = v => v >= 0.4 ? '#22c55e' : v >= 0.15 ? '#f59e0b' : '#94a3b8';
  const stages = [
    { key: 'r16',    label: t('roundR16') },
    { key: 'qf',     label: t('roundQF') },
    { key: 'sf',     label: t('roundSF') },
    { key: 'final',  label: t('roundFinal') },
    { key: 'winner', label: t('roundWinner') },
  ];

  panel.innerHTML = `
    <div class="bkt-panel-inner">
      <div class="bkt-panel-header">
        <span class="bkt-panel-flag">${flag(teamId)}</span>
        <span class="bkt-panel-name">${getTeamName(teamId)}</span>
      </div>
      <div class="bkt-panel-probs">
        ${stages.map(s => {
          const v = probs[s.key] ?? 0;
          return `<div class="bkt-panel-stage">
            <span class="bkt-panel-stage-label">${s.label}</span>
            <span class="bkt-panel-stage-prob" style="color:${probColor(v)}">${fmt(v)}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="bkt-panel-actions">
        <button class="btn-secondary btn-sm bkt-panel-detail">${t('bktTeamProfile')}</button>
        <button class="bkt-panel-close" aria-label="${t('bktClearSel')}">✕</button>
      </div>
    </div>`;

  panel.classList.remove('hidden');

  panel.querySelector('.bkt-panel-close').addEventListener('click', clearBracketSelection);

  panel.querySelector('.bkt-panel-detail').addEventListener('click', () => {
    switchTab('teams');
    state.selectedTeamId = teamId;
    renderTeamDetail();
    document.querySelector(`tr[data-team="${teamId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function applyBracketSelection(svg, teamId) {
  svg.classList.add('has-selection');
  svg.querySelectorAll(`.bkt-slot[data-team="${teamId}"]`)
    .forEach(el => el.classList.add('selected'));
}

function setupBracketClicks() {
  const svg = document.getElementById('bracket-svg');
  if (!svg) return;

  svg.addEventListener('click', e => {
    const slot   = e.target.closest('.bkt-slot');
    const teamId = slot?.dataset.team;

    if (!teamId || teamId === state.bktSelectedTeam) {
      clearBracketSelection();
      return;
    }

    // Clear previous, then highlight the new team
    svg.classList.remove('has-selection');
    svg.querySelectorAll('.bkt-slot.selected').forEach(el => el.classList.remove('selected'));
    state.bktSelectedTeam = teamId;
    applyBracketSelection(svg, teamId);
    renderBktTeamPanel(teamId);
  });
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

// ── Share card helpers ─────────────────────────────────────────────────────────

function generateTopTeams(n) {
  if (!state.simResults) return [];
  return [...state.teams]
    .map(tm => ({
      id:   tm.id,
      name: getTeamName(tm.id),
      prob: teamProbs(tm.id)?.winner ?? 0,
      iso2: FLAGS[tm.id] ?? '',
    }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, n);
}

function renderShareSection() {
  const wrap = document.getElementById('share-section');
  if (!wrap) return;

  if (!state.simResults) {
    wrap.innerHTML = `<div class="share-no-sim"><p>${t('shareNoSim')}</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="share-header">
      <h3 class="share-title">${t('shareCardTitle')}</h3>
      <div class="share-format-toggle">
        <button class="share-fmt-btn${state.shareFormat === 'landscape' ? ' active' : ''}" data-fmt="landscape">${t('shareFormatLandscape')}</button>
        <button class="share-fmt-btn${state.shareFormat === 'square'    ? ' active' : ''}" data-fmt="square">${t('shareFormatSquare')}</button>
      </div>
    </div>
    <div class="share-preview">
      <canvas id="share-canvas"></canvas>
    </div>
    <div class="share-actions">
      <button class="btn-primary"   id="share-x-btn">${t('shareOnX')}</button>
      <button class="btn-secondary" id="share-copy-btn">${t('shareCopyImage')}</button>
      <button class="btn-secondary" id="share-dl-btn">${t('shareDownload')}</button>
    </div>`;

  const canvas   = document.getElementById('share-canvas');
  const topTeams = generateTopTeams(10);
  drawShareCard(canvas, state.shareFormat, topTeams, { n: state.simMeta?.n ?? 10_000 });

  wrap.querySelectorAll('.share-fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shareFormat = btn.dataset.fmt;
      renderShareSection();
    });
  });

  document.getElementById('share-x-btn').addEventListener('click', () => {
    const top3 = generateTopTeams(3)
      .map(tm => `${tm.name} ${(tm.prob * 100).toFixed(1)}%`)
      .join(', ');
    const simN = (state.simMeta?.n ?? 10_000).toLocaleString();
    const text = encodeURIComponent(`WC 2026 winner odds (${simN} sims): ${top3}`);
    const url  = encodeURIComponent('https://wc2026predictor.com');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  });

  document.getElementById('share-copy-btn').addEventListener('click', async () => {
    const btn = document.getElementById('share-copy-btn');
    try {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btn.textContent = t('copied');
    } catch {
      btn.textContent = t('copyFailed');
    }
    setTimeout(() => { btn.textContent = t('shareCopyImage'); }, 1500);
  });

  document.getElementById('share-dl-btn').addEventListener('click', () => {
    const a = Object.assign(document.createElement('a'), {
      href:     canvas.toDataURL('image/png'),
      download: `wc2026-predictions-${state.shareFormat}.png`,
    });
    a.click();
  });
}

function renderDivergencePanel() {
  const panel = document.getElementById('model-divergence-panel');
  if (!panel) return;
  const cmp = state.modelComparison;
  if (!cmp) { panel.style.display = 'none'; return; }

  const top15 = cmp.divergence.slice(0, 15);
  const fmt   = v => (v * 100).toFixed(1) + '%';
  const bar   = (spread) => {
    const w = Math.min(100, (spread / 0.15) * 100).toFixed(0);
    return `<div class="div-bar"><div class="div-bar-fill" style="width:${w}%"></div></div>`;
  };

  panel.style.display = '';
  panel.innerHTML = `
    <div class="divergence-header">
      <h3>${t('modelDivergenceTitle')}</h3>
      <p class="divergence-desc">${t('modelDivergenceDesc')} (${cmp.meta.n.toLocaleString()} sims/model)</p>
    </div>
    <div class="table-wrap">
      <table class="data-table divergence-table">
        <thead><tr>
          <th>${t('thTeam')}</th>
          <th>${t('modelFull')}</th>
          <th>${t('modelDC')}</th>
          <th>${t('modelElo')}</th>
          <th>${t('colSpread')}</th>
        </tr></thead>
        <tbody>
          ${top15.map(d => `<tr>
            <td><strong>${d.id}</strong></td>
            <td>${fmt(d.full)}</td>
            <td>${fmt(d.dc)}</td>
            <td>${fmt(d.elo)}</td>
            <td class="div-spread-cell">${bar(d.spread)} ${fmt(d.spread)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function initBracketView() {
  document.getElementById('run-sim-btn').addEventListener('click', async () => {
    const btn = document.getElementById('run-sim-btn');
    btn.disabled = true;
    btn.textContent = t('runningSim');
    setSimStatus(t('statusRunning'));
    try {
      const data = await simulate(50_000);
      state.simResults = data;
      state.simGroups  = data.groups ?? null;
      state.simMeta    = data.meta;
      setSimStatus(t('statusSims', data.meta.n, data.meta.elapsedMs));
      flashSimUpdate();
      renderBracket();
      renderShareSection();
      renderTeamsTable();
      if (state.selectedTeamId) renderTeamDetail();
    } catch (err) {
      setSimStatus(t('statusFailed'));
    } finally {
      btn.disabled = false;
      btn.textContent = t('runSim');
    }
  });

  // Model selector
  document.querySelectorAll('#model-selector .model-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.simModel = btn.dataset.model;
      document.querySelectorAll('#model-selector .model-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Compare models button
  document.getElementById('compare-models-btn').addEventListener('click', async () => {
    const btn = document.getElementById('compare-models-btn');
    btn.disabled = true;
    btn.textContent = t('comparingModels');
    try {
      const data = await api('/simulate/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numSims: 3000 }),
      });
      state.modelComparison = data;
      renderDivergencePanel();
    } catch (err) {
      console.error('Compare failed', err);
    } finally {
      btn.disabled = false;
      btn.textContent = t('compareModels');
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
// GROUPS OF DEATH TAB
// ════════════════════════════════════════════════════════════════════════════

// Elo-based head-to-head win probability
const _eloPwin = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));

function computeGroupStats() {
  const GROUPS = 'ABCDEFGHIJKL'.split('');

  const raw = GROUPS.map(g => {
    const teams = state.teams.filter(tm => tm.group === g);
    const elos  = teams.map(tm => tm.elo ?? 1500);
    const avgElo   = elos.reduce((s, v) => s + v, 0) / elos.length;
    const maxElo   = Math.max(...elos);
    const minElo   = Math.min(...elos);
    const eloRange = maxElo - minElo;
    const compet   = maxElo > 0 ? 1 - eloRange / maxElo : 0;

    const mkts    = teams.map(tm => tm.marketValueM ?? 0).filter(v => v > 0);
    const avgMkt  = mkts.length ? Math.round(mkts.reduce((s, v) => s + v, 0) / mkts.length) : 0;

    // Count pairwise matchups within 10% of 50/50 (close game)
    let closeMatches = 0;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        if (Math.abs(_eloPwin(elos[i], elos[j]) - 0.5) < 0.10) closeMatches++;
      }
    }

    // Sim-dependent metrics
    let likelyQualifiers = [], upsetRisk = null, avgWinnerPts = null, p3rdChance = null;
    const gs = state.simGroups?.[g];
    if (gs) {
      const withSim = teams.map(tm => ({ ...tm, ...gs[tm.id] }));
      likelyQualifiers = [...withSim].sort((a, b) => b.pQual - a.pQual).slice(0, 2);

      // Upset risk: avg(1 - pQual) for the 2 highest-Elo teams
      const topTwo = [...withSim].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0)).slice(0, 2);
      upsetRisk = topTwo.reduce((s, tm) => s + (1 - (tm.pQual ?? 1)), 0) / 2;

      // Avg winner points weighted by p1st
      const totalP1st = withSim.reduce((s, tm) => s + (tm.p1st ?? 0), 0);
      avgWinnerPts = totalP1st > 0
        ? withSim.reduce((s, tm) => s + (tm.p1st ?? 0) * (tm.avgPts ?? 0), 0) / totalP1st
        : null;

      // Prob this group sends a best-3rd qualifier = sum(pQual - p1st - p2nd) across teams
      p3rdChance = withSim.reduce((s, tm) => s + Math.max(0, (tm.pQual ?? 0) - (tm.p1st ?? 0) - (tm.p2nd ?? 0)), 0);
    }

    return { group: g, teams, avgElo, maxElo, minElo, eloRange, compet, avgMkt, closeMatches,
             likelyQualifiers, upsetRisk, avgWinnerPts, p3rdChance };
  });

  // Normalise avgElo to [0,1] for composite + bar widths
  const avgElos   = raw.map(s => s.avgElo);
  const minAE     = Math.min(...avgElos);
  const maxAE     = Math.max(...avgElos);
  const aeRange   = maxAE - minAE || 1;

  raw.forEach(s => {
    s.strengthPct = Math.round((s.avgElo - minAE) / aeRange * 100);
    s.composite   = 0.6 * (s.avgElo - minAE) / aeRange + 0.4 * s.compet;
  });

  return raw.sort((a, b) => b.composite - a.composite);
}

function renderGroupCard(s, rank) {
  const isTop    = rank === 0;
  const scorePct = (s.composite * 100).toFixed(1);
  const teamRows = s.teams
    .sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0))
    .map(tm => `
      <div class="gc-team">
        ${flag(tm.id)}<span class="gc-team-id">${tm.id}</span>
        <span class="gc-team-elo">${tm.elo != null ? Math.round(tm.elo) : '—'}</span>
      </div>`).join('');

  let breakdownHtml;
  if (!state.simGroups) {
    breakdownHtml = `<p class="gc-nosim">${t('gcNoSim')}</p>`;
  } else {
    const q = s.likelyQualifiers;
    const qualStr = q.length
      ? q.map(tm => `${flag(tm.id)}<strong>${tm.id}</strong> ${fmtPct(tm.pQual)}`).join('&nbsp;&nbsp;')
      : '—';
    breakdownHtml = `
      <div class="gc-detail-grid">
        <span class="gc-dl">${t('gcLikelyQual')}</span>
        <span class="gc-dv">${qualStr}</span>
        <span class="gc-dl">${t('gcUpsetRisk')}</span>
        <span class="gc-dv${s.upsetRisk > 0.15 ? ' gc-dv--warn' : ''}">${s.upsetRisk != null ? fmtPct(s.upsetRisk) : '—'}</span>
        <span class="gc-dl">${t('gcWinnerPts')}</span>
        <span class="gc-dv">${s.avgWinnerPts != null ? s.avgWinnerPts.toFixed(1) : '—'}</span>
        <span class="gc-dl">${t('gc3rdChance')}</span>
        <span class="gc-dv">${s.p3rdChance != null ? fmtPct(s.p3rdChance) : '—'}</span>
      </div>`;
  }

  return `
    <div class="group-card${isTop ? ' group-card--top' : ''}" data-group="${s.group}">
      <div class="gc-header">
        <div class="gc-rank">#${rank + 1}</div>
        <div class="gc-identity">
          <div class="gc-name-row">
            <span class="gc-name">${t('thGrp')} ${s.group}</span>
            ${isTop ? `<span class="badge badge-god">${t('godBadge')}</span>` : ''}
          </div>
          <div class="gc-flags">${s.teams.map(tm => flag(tm.id)).join('')}</div>
        </div>
        <div class="gc-bars">
          <div class="gc-bar-row">
            <span class="gc-bar-lbl">${t('gcStrength')}</span>
            <div class="gc-bar"><div class="gc-bar-fill" style="width:${Math.max(4, s.strengthPct)}%"></div></div>
            <span class="gc-bar-val">${t('gcAvgElo', Math.round(s.avgElo))}</span>
          </div>
          <div class="gc-bar-row">
            <span class="gc-bar-lbl">${t('gcBalance')}</span>
            <div class="gc-bar"><div class="gc-bar-fill gc-bar-fill--bal" style="width:${Math.max(4, Math.round(s.compet * 100))}%"></div></div>
            <span class="gc-bar-val">${t('gcSpread', Math.round(s.eloRange))}</span>
          </div>
        </div>
        <div class="gc-score-col">
          <div class="gc-score">${scorePct}</div>
          <div class="gc-score-lbl">${t('gcScore')}</div>
        </div>
      </div>
      <div class="gc-teams-grid">${teamRows}</div>
      <details class="gc-details">
        <summary class="gc-summary">${t('gcBreakdown')}</summary>
        ${breakdownHtml}
      </details>
    </div>`;
}

function renderGroupsTab() {
  const content = document.getElementById('groups-content');
  if (!content) return;

  const stats = computeGroupStats();
  content.innerHTML = stats.map((s, i) => renderGroupCard(s, i)).join('');

  // Update methodology tooltip text reactively (language may have changed)
  const tip = document.getElementById('groups-method-tip');
  if (tip) tip.title = t('groupsMethodTip');
}

function initGroupsTab() {
  const tip = document.getElementById('groups-method-tip');
  if (tip) tip.title = t('groupsMethodTip');
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

// ── Player availability modifiers ────────────────────────────────────────────

function computePlayerModifiers() {
  if (!state.unavailablePlayers.size) return {};
  const players = state.fantasy.players ?? [];
  if (!players.length) return {};

  // Group by team
  const byTeam = {};
  for (const p of players) {
    (byTeam[p.team] ??= []).push(p);
  }

  const modifiers = {};
  const DAMP = 0.65; // max fraction any single player can reduce a rating

  for (const [team, teamPlayers] of Object.entries(byTeam)) {
    const unavail = teamPlayers.filter(p => state.unavailablePlayers.has(p.id));
    if (!unavail.length) continue;

    // Offensive score: goals/match + 0.5×assists/match (with price fallback)
    const offScore = p => (p.stats?.goalsPerMatch ?? 0) + 0.5 * (p.stats?.assistsPerMatch ?? 0)
                        + p.price * 0.01;
    const attPlayers = teamPlayers.filter(p => p.pos === 'FWD' || p.pos === 'MID');
    const totalOff   = attPlayers.reduce((s, p) => s + offScore(p), 0) || 1;

    // Defensive: price share
    const defPlayers = teamPlayers.filter(p => p.pos === 'DEF' || p.pos === 'GK');
    const totalDef   = defPlayers.reduce((s, p) => s + p.price, 0) || 1;

    let attRed = 0, defRed = 0;
    for (const p of unavail) {
      if (p.pos === 'FWD' || p.pos === 'MID') attRed += (offScore(p) / totalOff) * DAMP;
      else                                     defRed += (p.price / totalDef) * DAMP;
    }

    modifiers[team] = {
      attackMult:  Math.max(0.4, 1 - attRed),
      defenseMult: Math.max(0.4, 1 - defRed),
    };
  }
  return modifiers;
}

function renderPlayerAvailability() {
  const el = document.getElementById('player-availability');
  if (!el) return;

  const players = state.fantasy.players ?? [];
  const query   = state.availFilter.toLowerCase().trim();
  const unavail = state.unavailablePlayers;

  // Chips for currently unavailable players
  const chips = [...unavail].map(id => {
    const p = players.find(x => x.id === id);
    if (!p) return '';
    return `<span class="avail-chip">
      ${flag(p.team)} <strong>${p.name}</strong>
      <button class="avail-chip-remove" data-id="${id}">✕</button>
    </span>`;
  }).join('');

  // Filtered player list (max 8, excluding already-unavailable)
  let rows = '';
  if (query.length >= 2) {
    const matches = players
      .filter(p => !unavail.has(p.id) &&
        (p.name.toLowerCase().includes(query) || p.team.toLowerCase().includes(query)))
      .slice(0, 8);
    rows = matches.map(p => `
      <div class="avail-result-row" data-id="${p.id}">
        ${flag(p.team)}
        <span class="avail-result-name">${p.name}</span>
        <span class="avail-result-meta">${p.team} · ${p.pos} · $${p.price}M</span>
        <button class="avail-add-btn btn-sm" data-id="${p.id}">${t('availMark')}</button>
      </div>`).join('');
    if (!rows) rows = `<div class="avail-no-results">${t('availNoResults')}</div>`;
  }

  el.innerHTML = `
    <div class="avail-header">
      <span class="avail-title">${t('availTitle')}</span>
      ${unavail.size ? `<span class="avail-count">${unavail.size} ${t('availCount')}</span>` : ''}
    </div>
    ${chips ? `<div class="avail-chips">${chips}</div>` : ''}
    <input class="avail-search" type="text" placeholder="${t('availSearch')}"
           value="${state.availFilter}">
    ${rows ? `<div class="avail-results">${rows}</div>` : ''}`;

  // Wire search
  el.querySelector('.avail-search').addEventListener('input', e => {
    state.availFilter = e.target.value;
    renderPlayerAvailability();
  });

  // Wire chip removes
  el.querySelectorAll('.avail-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.unavailablePlayers.delete(btn.dataset.id);
      renderPlayerAvailability();
    });
  });

  // Wire add buttons
  el.querySelectorAll('.avail-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.unavailablePlayers.add(btn.dataset.id);
      state.availFilter = '';
      renderPlayerAvailability();
    });
  });
}

async function runScenario() {
  const btn = document.getElementById('run-scenario-btn');
  btn.disabled = true;
  btn.textContent = t('runningSim');
  try {
    const modifiers = computePlayerModifiers();
    const data = await simulate(50_000, state.scenarioLocks, state.simModel, modifiers);
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

  // Load fantasy players for the availability panel (if not already loaded)
  if (!state.fantasy.players) {
    loadFantasyPlayers().then(() => renderPlayerAvailability());
  } else {
    renderPlayerAvailability();
  }

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
// HISTORY TAB
// ════════════════════════════════════════════════════════════════════════════

function matchTournCat(tournament) {
  const s = tournament.toLowerCase();
  if (s === 'fifa world cup') return 'wc';
  if (s.includes('world cup qual') || s.includes('qualification')) return 'qual';
  if (s.includes('friendly')) return 'friendly';
  return 'other';
}

async function fetchHistory() {
  const p = new URLSearchParams();
  const f = state.histFilters;
  if (f.team)                  p.set('team', f.team);
  if (f.opponent)              p.set('opponent', f.opponent);
  if (f.tournament !== 'all')  p.set('tournament', f.tournament);
  if (f.yearFrom)              p.set('year_from', f.yearFrom);
  if (f.yearTo)                p.set('year_to', f.yearTo);
  if (f.result !== 'all')      p.set('result', f.result);
  p.set('page', state.histPage);
  const res = await fetch(`/api/history?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderHistoryStatsBar(stats) {
  const el = document.getElementById('history-stats-bar');
  if (!el || !stats) return;
  el.innerHTML = t('histStats', stats.total, stats.dateFrom, stats.dateTo, stats.wcMatches);
}

function buildHistoryTable(matches) {
  const rows = matches.map(m => {
    const cat  = matchTournCat(m.tournament);
    const catLabel = { wc: t('histBadgeWC'), qual: t('histBadgeQual'), friendly: t('histBadgeFriendly'), other: t('histBadgeOther') }[cat] ?? '';
    const scoreNote = m.penaltyWinner
      ? `<span class="hist-pens">${t('histPens', m.penaltyWinner)}</span>`
      : '';
    return `<tr>
      <td class="hist-td-date">${m.date}</td>
      <td>${flag(m.home)} ${m.home}</td>
      <td class="hist-score">${m.homeGoals}–${m.awayGoals}${scoreNote}</td>
      <td>${flag(m.away)} ${m.away}</td>
      <td><span class="hist-badge hist-badge--${cat}">${catLabel}</span> <span class="hist-tourn-name">${m.tournament}</span></td>
    </tr>`;
  }).join('');

  return `<table class="data-table hist-table">
    <thead><tr>
      <th>${t('histThDate')}</th>
      <th>${t('histThHome')}</th>
      <th>${t('histThScore')}</th>
      <th>${t('histThAway')}</th>
      <th>${t('histThTournament')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildHistoryPagination(page, totalPages) {
  if (totalPages <= 1) return '';
  const prev  = page > 1 ? `<button class="hist-page-btn" data-page="${page - 1}">←</button>` : `<button class="hist-page-btn" disabled>←</button>`;
  const next  = page < totalPages ? `<button class="hist-page-btn" data-page="${page + 1}">→</button>` : `<button class="hist-page-btn" disabled>→</button>`;
  const start = Math.max(1, page - 3);
  const end   = Math.min(totalPages, start + 6);
  const nums  = [];
  for (let p = start; p <= end; p++)
    nums.push(`<button class="hist-page-btn${p === page ? ' active' : ''}" data-page="${p}">${p}</button>`);
  return `<div class="hist-pagination">${prev}${nums.join('')}${next}<span class="hist-page-info">${t('histPage', page, totalPages)}</span></div>`;
}

async function renderHistoryResults() {
  const tableWrap = document.getElementById('history-table-wrap');
  const pagEl     = document.getElementById('history-pagination');
  if (!tableWrap) return;

  tableWrap.innerHTML = `<div style="padding:20px;color:var(--muted)">${t('loading')}</div>`;
  if (pagEl) pagEl.innerHTML = '';

  try {
    const data = await fetchHistory();
    state.histData = data;
    renderHistoryStatsBar(data.stats);

    if (!data.matches.length) {
      tableWrap.innerHTML = `<div class="empty-state"><p>${t('histNoResults')}</p></div>`;
      return;
    }
    tableWrap.innerHTML = `<div class="table-wrap">${buildHistoryTable(data.matches)}</div>`;
    if (pagEl) pagEl.innerHTML = buildHistoryPagination(data.page, data.totalPages);
  } catch {
    tableWrap.innerHTML = `<div class="empty-state"><p>${t('statusFailed')}</p></div>`;
  }
}

async function renderHistoryCurated() {
  const el = document.getElementById('history-curated');
  if (!el) return;
  try {
    if (!state.histCurated) {
      const res = await fetch('/api/history/curated');
      if (!res.ok) return;
      state.histCurated = await res.json();
    }
    const { highestScoring, biggestUpsets } = state.histCurated;

    const highRows = highestScoring.map(m => `
      <div class="hist-curated-row">
        <span class="hist-curated-year">${m.date.slice(0, 4)}</span>
        <span>${flag(m.home)} ${m.home} <strong>${m.homeGoals}–${m.awayGoals}</strong> ${flag(m.away)} ${m.away}</span>
        <span class="hist-curated-meta">${m.homeGoals + m.awayGoals} ${t('histGoals')}</span>
      </div>`).join('');

    const upsetRows = biggestUpsets.map(m => {
      const pensNote = m.penaltyWinner ? ` <span class="hist-pens">${t('histPens', m.penaltyWinner)}</span>` : '';
      return `
      <div class="hist-curated-row">
        <span class="hist-curated-year">${m.date.slice(0, 4)}</span>
        <span>${flag(m.home)} ${m.home} <strong>${m.homeGoals}–${m.awayGoals}</strong>${pensNote} ${flag(m.away)} ${m.away}</span>
        <span class="hist-curated-meta">+${Math.round(m.eloDiff)} Elo</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <h3 class="hist-curated-title">${t('histCuratedTitle')}</h3>
      <div class="hist-curated-grid">
        <div class="hist-curated-section">
          <div class="hist-curated-subtitle">${t('histHighScoring')}</div>
          ${highRows}
        </div>
        <div class="hist-curated-section">
          <div class="hist-curated-subtitle">${t('histBiggestUpsets')}</div>
          ${upsetRows}
        </div>
      </div>`;
  } catch { /* curated is optional */ }
}

async function exportHistoryCsv() {
  const btn = document.getElementById('hist-export');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const p = new URLSearchParams();
    const f = state.histFilters;
    if (f.team)               p.set('team', f.team);
    if (f.opponent)           p.set('opponent', f.opponent);
    if (f.tournament !== 'all') p.set('tournament', f.tournament);
    if (f.yearFrom)           p.set('year_from', f.yearFrom);
    if (f.yearTo)             p.set('year_to', f.yearTo);
    if (f.result !== 'all')   p.set('result', f.result);
    p.set('page_size', 'all');
    const res  = await fetch(`/api/history?${p}`);
    const data = await res.json();
    const header = 'date,home,home_goals,away_goals,away,tournament';
    const rows   = data.matches.map(m =>
      `${m.date},${m.home},${m.homeGoals},${m.awayGoals},${m.away},"${m.tournament}"`
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'wc2026_history.csv' });
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('histExportCsv'); }
  }
}

async function renderHistoryTab() {
  await renderHistoryResults();
  renderHistoryCurated();
}

function initHistoryView() {
  const filtersEl = document.getElementById('history-filters');
  if (!filtersEl) return;

  const sorted = [...state.teams].sort((a, b) => a.id.localeCompare(b.id));
  const teamOpts = sorted.map(tm => `<option value="${tm.id}">${tm.id}</option>`).join('');

  filtersEl.innerHTML = `
    <select id="hist-team" class="hist-select">
      <option value="">${t('histFilterTeamAll')}</option>
      ${teamOpts}
    </select>
    <span class="hist-vs">vs.</span>
    <select id="hist-opponent" class="hist-select">
      <option value="">${t('histFilterOppAll')}</option>
      ${teamOpts}
    </select>
    <select id="hist-tournament" class="hist-select">
      <option value="all">${t('histTournAll')}</option>
      <option value="wc">${t('histTournWC')}</option>
      <option value="qual">${t('histTournQual')}</option>
      <option value="friendly">${t('histTournFriendly')}</option>
      <option value="other">${t('histTournOther')}</option>
    </select>
    <input type="number" id="hist-year-from" class="hist-input" placeholder="${t('histYearFrom')}" min="1872" max="2026">
    <span class="hist-vs">–</span>
    <input type="number" id="hist-year-to"   class="hist-input" placeholder="${t('histYearTo')}"   min="1872" max="2026">
    <select id="hist-result" class="hist-select">
      <option value="all">${t('histResultAll')}</option>
      <option value="W">${t('histResultW')}</option>
      <option value="D">${t('histResultD')}</option>
      <option value="L">${t('histResultL')}</option>
    </select>
    <button class="btn-primary btn-sm" id="hist-apply">${t('histApply')}</button>
    <button class="btn-secondary btn-sm" id="hist-reset">${t('histReset')}</button>
    <button class="btn-secondary btn-sm" id="hist-export">${t('histExportCsv')}</button>
  `;

  document.getElementById('hist-apply').addEventListener('click', () => {
    state.histFilters = {
      team:       document.getElementById('hist-team').value,
      opponent:   document.getElementById('hist-opponent').value,
      tournament: document.getElementById('hist-tournament').value,
      yearFrom:   document.getElementById('hist-year-from').value,
      yearTo:     document.getElementById('hist-year-to').value,
      result:     document.getElementById('hist-result').value,
    };
    state.histPage = 1;
    renderHistoryResults();
  });

  document.getElementById('hist-reset').addEventListener('click', () => {
    state.histFilters = { team: '', opponent: '', tournament: 'all', yearFrom: '', yearTo: '', result: 'all' };
    state.histPage = 1;
    document.getElementById('hist-team').value       = '';
    document.getElementById('hist-opponent').value   = '';
    document.getElementById('hist-tournament').value = 'all';
    document.getElementById('hist-year-from').value  = '';
    document.getElementById('hist-year-to').value    = '';
    document.getElementById('hist-result').value     = 'all';
    renderHistoryResults();
  });

  document.getElementById('hist-export').addEventListener('click', exportHistoryCsv);

  document.getElementById('history-pagination')?.addEventListener('click', e => {
    const btn = e.target.closest('.hist-page-btn[data-page]');
    if (!btn || btn.disabled) return;
    state.histPage = parseInt(btn.dataset.page, 10);
    renderHistoryResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// BRACKET CREATOR
// ════════════════════════════════════════════════════════════════════════════

// ── Official WC 2026 R32 bracket structure ────────────────────────────────

const R32_DEFS = [
  { id:73, aType:'runner-up', aGroup:'A', bType:'runner-up', bGroup:'B' },
  { id:74, aType:'winner',    aGroup:'E', bType:'third',     bSlot:0 },
  { id:75, aType:'winner',    aGroup:'F', bType:'runner-up', bGroup:'C' },
  { id:76, aType:'winner',    aGroup:'C', bType:'runner-up', bGroup:'F' },
  { id:77, aType:'winner',    aGroup:'I', bType:'third',     bSlot:1 },
  { id:78, aType:'runner-up', aGroup:'E', bType:'runner-up', bGroup:'I' },
  { id:79, aType:'winner',    aGroup:'A', bType:'third',     bSlot:2 },
  { id:80, aType:'winner',    aGroup:'L', bType:'third',     bSlot:3 },
  { id:81, aType:'winner',    aGroup:'D', bType:'third',     bSlot:4 },
  { id:82, aType:'winner',    aGroup:'G', bType:'third',     bSlot:5 },
  { id:83, aType:'runner-up', aGroup:'K', bType:'runner-up', bGroup:'L' },
  { id:84, aType:'winner',    aGroup:'H', bType:'runner-up', bGroup:'J' },
  { id:85, aType:'winner',    aGroup:'B', bType:'third',     bSlot:6 },
  { id:86, aType:'winner',    aGroup:'J', bType:'runner-up', bGroup:'H' },
  { id:87, aType:'winner',    aGroup:'K', bType:'third',     bSlot:7 },
  { id:88, aType:'runner-up', aGroup:'D', bType:'runner-up', bGroup:'G' },
];

// 3rd-place slot → eligible groups (from FIFA official bracket / Annex C cluster rules)
const THIRD_SLOTS = [
  { matchId:74, eligible:['A','B','C','D','F'] },
  { matchId:77, eligible:['C','D','F','G','H'] },
  { matchId:79, eligible:['C','E','F','H','I'] },
  { matchId:80, eligible:['E','H','I','J','K'] },
  { matchId:81, eligible:['B','E','F','I','J'] },
  { matchId:82, eligible:['A','E','H','I','J'] },
  { matchId:85, eligible:['E','F','G','I','J'] },
  { matchId:87, eligible:['D','E','I','J','L'] },
];

// Subsequent round pairings (indices into previous round's winner array)
const R16_FROM_R32 = [[1,4],[0,2],[3,5],[6,7],[10,11],[8,9],[13,15],[12,14]];
const QF_FROM_R16  = [[0,1],[4,5],[2,3],[6,7]];
const SF_FROM_QF   = [[0,2],[1,3]];

const BC_ROUNDS    = ['r32','r16','qf','sf','final'];
const BC_ROUND_LABELS = () => ({
  r32:   t('bcStepR32'),
  r16:   t('bcStepR16'),
  qf:    t('bcStepQF'),
  sf:    t('bcStepSF'),
  final: t('bcStepFinal'),
});

// ── Constraint-based 3rd-place assignment ─────────────────────────────────
// Backtracking bipartite matching respecting Annex C cluster eligibility.
function thirdPlaceAssign(qualifyingGroups) {
  const qSet    = new Set(qualifyingGroups);
  const options = THIRD_SLOTS.map(s => s.eligible.filter(g => qSet.has(g)));
  const result  = new Array(8).fill(null);
  const used    = new Set();
  // Process most-constrained slots first
  const order   = options.map((o, i) => ({ i, n: o.length }))
    .sort((a, b) => a.n - b.n).map(x => x.i);

  function bt(step) {
    if (step === 8) return true;
    const si = order[step];
    for (const g of options[si]) {
      if (!used.has(g)) {
        result[si] = g; used.add(g);
        if (bt(step + 1)) return true;
        used.delete(g); result[si] = null;
      }
    }
    return false;
  }
  bt(0);
  return result; // result[slotIndex] = group letter
}

function defaultGroupPicks() {
  const picks = {};
  for (const group of 'ABCDEFGHIJKL'.split('')) {
    const teams = state.teams.filter(tm => tm.group === group);
    if (state.simResults?.groups?.[group]) {
      const gd = state.simResults.groups[group];
      picks[group] = [...teams]
        .sort((a, b) => (gd[b.id]?.p1st ?? 0) - (gd[a.id]?.p1st ?? 0))
        .map(tm => tm.id);
    } else {
      picks[group] = [...teams]
        .sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0))
        .map(tm => tm.id);
    }
  }
  return picks;
}

function buildR32Pairs(groupPicks) {
  const pos = (group, idx) => groupPicks[group]?.[idx] ?? null; // 0=1st 1=2nd 2=3rd

  const thirdByGroup = Object.fromEntries(
    'ABCDEFGHIJKL'.split('').map(g => [g, pos(g, 2)])
  );

  // Use user's explicit third-place picks; fall back to model ranking if not set
  const chosen8 = state.myThirdPicks?.length === 8
    ? state.myThirdPicks
    : (() => {
        const thirds = 'ABCDEFGHIJKL'.split('').map(g => ({
          group: g, prob: teamProbs(pos(g, 2))?.winner ?? 0,
        }));
        return [...thirds].sort((a, b) => b.prob - a.prob).slice(0, 8).map(t => t.group);
      })();

  const slotAssign = thirdPlaceAssign(chosen8);

  return R32_DEFS.map(def => {
    const a = def.aType === 'winner'    ? pos(def.aGroup, 0)
            : def.aType === 'runner-up' ? pos(def.aGroup, 1)
            : null;
    const b = def.bType === 'winner'    ? pos(def.bGroup, 0)
            : def.bType === 'runner-up' ? pos(def.bGroup, 1)
            : def.bType === 'third'     ? (thirdByGroup[slotAssign[def.bSlot]] ?? null)
            : null;
    return [a, b];
  });
}

function getRoundPairs(round) {
  const bp = state.bracketPicks;
  if (round === 'r32')   return state.myR32Pairs ?? [];
  if (round === 'r16')   return R16_FROM_R32.map(([a,b]) => [bp.r32[a], bp.r32[b]]);
  if (round === 'qf')    return QF_FROM_R16.map(([a,b])  => [bp.r16[a], bp.r16[b]]);
  if (round === 'sf')    return SF_FROM_QF.map(([a,b])   => [bp.qf[a],  bp.qf[b]]);
  if (round === 'final') return [[bp.sf[0], bp.sf[1]]];
  return [];
}

function bcShowNormal(show) {
  document.getElementById('lb-normal').style.display       = show ? '' : 'none';
  document.getElementById('bracket-creator').style.display = show ? 'none' : '';
}

// ── Step: Group Picker ────────────────────────────────────────────────────

function renderGroupPickerStep() {
  bcShowNormal(false);
  const wrap = document.getElementById('bracket-creator');

  const posLabels = [t('bcGroupWinner'), t('bcGroupRunnerUp'), t('bcGroupThird'), t('bcGroupFourth')];
  const posClass  = ['bc-pos-1st','bc-pos-2nd','bc-pos-3rd','bc-pos-4th'];

  const groupCards = 'ABCDEFGHIJKL'.split('').map(group => {
    const teams = state.myGroupPicks[group];
    const rows = teams.map((id, idx) => `
      <div class="bc-group-row" data-group="${group}" data-idx="${idx}">
        <span class="bc-pos ${posClass[idx]}">${posLabels[idx]}</span>
        ${flag(id)}
        <span class="bc-team-name">${getTeamName(id)}</span>
        <div class="bc-row-btns">
          <button class="bc-arr" data-dir="-1" data-group="${group}" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="bc-arr" data-dir="1"  data-group="${group}" data-idx="${idx}" ${idx === 3 ? 'disabled' : ''}>↓</button>
        </div>
      </div>`).join('');

    return `
      <div class="bc-group-card">
        <div class="bc-group-header">
          <span class="bc-group-label">${t('thGrp')} ${group}</span>
          <button class="bc-reset-group btn-secondary btn-sm" data-group="${group}">${t('bcResetModel')}</button>
        </div>
        ${rows}
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="bc-header">
      ${bcStepBar('groups')}
    </div>
    <h2 class="bc-title">${t('bcGroupsTitle')}</h2>
    <p class="bc-desc">${t('bcGroupsDesc')}</p>
    <div class="bc-groups-grid">${groupCards}</div>
    <div class="bc-footer">
      <button class="btn-secondary" id="bc-cancel">${t('lbSignOut').replace('Sign out','Cancel')}</button>
      <button class="btn-primary"   id="bc-gen-bracket">${t('bcGenBracket')}</button>
    </div>`;

  // Arrow button clicks
  wrap.querySelectorAll('.bc-arr').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const idx   = parseInt(btn.dataset.idx);
      const dir   = parseInt(btn.dataset.dir);
      const arr   = state.myGroupPicks[group];
      const swap  = idx + dir;
      if (swap < 0 || swap > 3) return;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      renderGroupPickerStep();
    });
  });

  // Reset group to model
  wrap.querySelectorAll('.bc-reset-group').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      state.myGroupPicks[group] = defaultGroupPicks()[group];
      renderGroupPickerStep();
    });
  });

  document.getElementById('bc-cancel').addEventListener('click', () => {
    state.bcStep = null;
    bcShowNormal(true);
    renderLeaderboardTab();
  });

  document.getElementById('bc-gen-bracket').addEventListener('click', () => {
    state.myThirdPicks = null; // reset so thirds step starts fresh
    state.bcStep = 'thirds';
    renderThirdPickerStep();
  });
}

// ── Step: Third-Place Picker ──────────────────────────────────────────────

function renderThirdPickerStep() {
  bcShowNormal(false);
  const wrap = document.getElementById('bracket-creator');

  // Pre-populate with model's best 8 on first visit
  if (!state.myThirdPicks) {
    const thirds = 'ABCDEFGHIJKL'.split('').map(g => ({
      group: g, prob: teamProbs(state.myGroupPicks[g]?.[2])?.winner ?? 0,
    }));
    state.myThirdPicks = [...thirds].sort((a, b) => b.prob - a.prob)
      .slice(0, 8).map(t => t.group);
  }

  const picked   = new Set(state.myThirdPicks);
  const n        = picked.size;
  const allDone  = n === 8;

  const teamCards = 'ABCDEFGHIJKL'.split('').map(group => {
    const id       = state.myGroupPicks[group]?.[2];
    const isPicked = picked.has(group);
    const disabled = !isPicked && n >= 8;
    return `<button class="bc-third-btn${isPicked ? ' bc-third-picked' : ''}"
                    data-group="${group}" ${disabled ? 'disabled' : ''}>
      <span class="bc-group-badge">${t('bcGroupThird')} ${t('thGrp')} ${group}</span>
      <div class="bc-third-team">${flag(id)}<span>${getTeamName(id)}</span></div>
    </button>`;
  }).join('');

  wrap.innerHTML = `
    <div class="bc-header">${bcStepBar('thirds')}</div>
    <h2 class="bc-title">${t('bcThirdsTitle')}</h2>
    <p class="bc-desc">${t('bcThirdsDesc', n)}</p>
    <div class="bc-thirds-grid">${teamCards}</div>
    <div class="bc-footer">
      <button class="btn-secondary" id="bc-back">${t('bcBackRound')}</button>
      <button class="btn-primary" id="bc-gen-r32" ${!allDone ? 'disabled' : ''}>${t('bcGenBracket')}</button>
    </div>`;

  wrap.querySelectorAll('.bc-third-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      if (picked.has(group)) {
        picked.delete(group);
      } else if (picked.size < 8) {
        picked.add(group);
      }
      state.myThirdPicks = [...picked];
      renderThirdPickerStep();
    });
  });

  document.getElementById('bc-back').addEventListener('click', () => {
    state.bcStep = 'groups';
    renderGroupPickerStep();
  });

  document.getElementById('bc-gen-r32').addEventListener('click', () => {
    state.myR32Pairs   = buildR32Pairs(state.myGroupPicks);
    state.bracketPicks = {
      r32:   Array(16).fill(null), r16: Array(8).fill(null),
      qf:    Array(4).fill(null),  sf:  Array(2).fill(null),
      final: Array(1).fill(null),
      champion: null, r32Pairs: state.myR32Pairs, myThirdPicks: state.myThirdPicks,
    };
    state.bcStep = 'r32';
    renderBracketRoundStep();
  });
}

// ── Step bar ──────────────────────────────────────────────────────────────

function bcStepBar(current) {
  const steps = [
    ['groups', t('bcStepGroups')],
    ['thirds', t('bcStepThirds')],
    ['r32',    t('bcStepR32')],
    ['r16',    t('bcStepR16')],
    ['qf',     t('bcStepQF')],
    ['sf',     t('bcStepSF')],
    ['final',  t('bcStepFinal')],
  ];
  const currentIdx = steps.findIndex(([k]) => k === current);
  return `<div class="bc-step-bar">${steps.map(([k, label], i) => `
    <span class="bc-step${i === currentIdx ? ' bc-step-active' : i < currentIdx ? ' bc-step-done' : ''}">${label}</span>
    ${i < steps.length - 1 ? '<span class="bc-step-sep">›</span>' : ''}
  `).join('')}</div>`;
}

// ── Step: Bracket Round ───────────────────────────────────────────────────

function renderBracketRoundStep() {
  bcShowNormal(false);
  const wrap  = document.getElementById('bracket-creator');
  const round = state.bcStep;
  const pairs = getRoundPairs(round);
  const picks = state.bracketPicks[round];
  const labels = BC_ROUND_LABELS();
  const done  = picks.filter(w => w !== null).length;
  const total = picks.length;
  const allDone = done === total;

  const matchCards = pairs.map(([tA, tB], i) => {
    const winA = picks[i] === tA;
    const winB = picks[i] === tB;
    const teamBtn = (id, won) => id
      ? `<button class="bc-team-btn${won ? ' bc-team-picked' : ''}" data-round="${round}" data-idx="${i}" data-team="${id}">
           ${flag(id)}<span>${getTeamName(id)}</span>
         </button>`
      : `<button class="bc-team-btn bc-team-tbd" disabled>TBD</button>`;
    return `
      <div class="bc-match-card${picks[i] ? ' bc-match-done' : ''}">
        <div class="bc-match-label">${t('bcMatch', round === 'r32' ? R32_DEFS[i].id : 73 + BC_ROUNDS.indexOf(round) * 8 + i)}</div>
        ${teamBtn(tA, winA)}
        <div class="bc-vs">vs</div>
        ${teamBtn(tB, winB)}
      </div>`;
  }).join('');

  const isFirst = round === 'r32';
  const isLast  = round === 'final';

  wrap.innerHTML = `
    <div class="bc-header">
      ${bcStepBar(round)}
    </div>
    <div class="bc-round-header">
      <h2 class="bc-title">${labels[round]}</h2>
      <span class="bc-picks-count${allDone ? ' bc-picks-all' : ''}">${
        allDone ? t('bcPicksAll', total) : t('bcPicksRemaining', done, total)
      }</span>
    </div>
    <div class="bc-matches-grid${round === 'final' ? ' bc-matches-single' : ''}">${matchCards}</div>
    <div class="bc-footer">
      <button class="btn-secondary" id="bc-back">${t('bcBackRound')}</button>
      ${!isLast
        ? `<button class="btn-primary" id="bc-next" ${!allDone ? 'disabled' : ''}>${t('bcNextRound')}</button>`
        : allDone
          ? `<div class="bc-champion-reveal">${flag(picks[0])}<span class="bc-champion-name">${getTeamName(picks[0])}</span><span class="bc-champion-label">${t('bcChampionLabel')}</span></div>
             <button class="btn-primary" id="bc-save-bracket">${t('bcSaveBracket')}</button>`
          : ''
      }
    </div>`;

  // Team pick clicks
  wrap.querySelectorAll('.bc-team-btn[data-team]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { round: r, idx, team } = btn.dataset;
      state.bracketPicks[r][parseInt(idx)] = team;
      // Invalidate later rounds
      const ri = BC_ROUNDS.indexOf(r);
      for (let j = ri + 1; j < BC_ROUNDS.length; j++) {
        const lr = BC_ROUNDS[j];
        state.bracketPicks[lr] = state.bracketPicks[lr].map(() => null);
      }
      state.bracketPicks.champion = null;
      renderBracketRoundStep();
    });
  });

  document.getElementById('bc-back')?.addEventListener('click', () => {
    const ri = BC_ROUNDS.indexOf(round);
    if (ri === 0) {
      state.bcStep = 'thirds';
      renderThirdPickerStep();
    } else {
      state.bcStep = BC_ROUNDS[ri - 1];
      renderBracketRoundStep();
    }
  });

  document.getElementById('bc-next')?.addEventListener('click', () => {
    if (round === 'final') return;
    // For final, champion = picks[0]
    const ri = BC_ROUNDS.indexOf(round);
    state.bcStep = BC_ROUNDS[ri + 1];
    renderBracketRoundStep();
  });

  document.getElementById('bc-save-bracket')?.addEventListener('click', async () => {
    const btn = document.getElementById('bc-save-bracket');
    const bp  = state.bracketPicks;
    const champion = bp.final[0];
    bp.champion = champion;

    // Extract winner/finalist/semiFinals for leaderboard
    const finalist   = bp.sf.find(id => id !== champion);
    const semiFinals = bp.qf.filter(id => id && id !== champion && id !== finalist).slice(0, 2);
    const picks      = { winner: champion, finalist, semiFinals, bracket: bp };

    btn.disabled = true; btn.textContent = '…';
    try {
      const res = await fetch('/api/leaderboard/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...lbAuthHeader() },
        body: JSON.stringify({ picks }),
      });
      if (res.ok) {
        state.lbUser.picks = picks;
        btn.textContent = t('bcBracketSaved');
        await lbFetchLeaderboard();
        setTimeout(() => {
          state.bcStep = null;
          bcShowNormal(true);
          renderLeaderboardTab();
        }, 1200);
      } else {
        btn.textContent = t('statusFailed'); btn.disabled = false;
      }
    } catch { btn.textContent = t('statusFailed'); btn.disabled = false; }
  });
}

function initBracketCreator() {
  // Nothing to wire — all event listeners are attached at render time
}

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD TAB
// ════════════════════════════════════════════════════════════════════════════

function getModelPicks() {
  if (!state.simResults) return null;
  const sorted = [...state.teams]
    .map(tm => ({ id: tm.id, prob: teamProbs(tm.id)?.winner ?? 0 }))
    .sort((a, b) => b.prob - a.prob);
  return {
    winner:     sorted[0]?.id ?? null,
    finalist:   sorted[1]?.id ?? null,
    semiFinals: [sorted[2]?.id, sorted[3]?.id].filter(Boolean),
  };
}

function lbAuthHeader() {
  return state.lbToken ? { Authorization: `Bearer ${state.lbToken}` } : {};
}

async function lbFetchMe() {
  if (!state.lbToken) return;
  try {
    const res = await fetch('/api/leaderboard/me', { headers: lbAuthHeader() });
    if (res.ok) state.lbUser = await res.json();
    else if (res.status === 404) { state.lbToken = null; state.lbUser = null; }
  } catch {}
}

async function lbFetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) state.lbData = (await res.json()).users;
  } catch {}
}

function lbTeamOptions(selected, exclude = []) {
  return [...state.teams]
    .sort((a, b) => getTeamName(a.id).localeCompare(getTeamName(b.id)))
    .map(tm => {
      if (exclude.includes(tm.id) && tm.id !== selected) return '';
      return `<option value="${tm.id}"${tm.id === selected ? ' selected' : ''}>${flag(tm.id)} ${getTeamName(tm.id)}</option>`;
    })
    .filter(Boolean)
    .join('');
}

function renderLbRegistration(container) {
  container.innerHTML = `
    <div class="lb-card">
      <h3 class="lb-card-title">${t('lbJoinTitle')}</h3>
      <p class="lb-card-desc">${t('lbJoinDesc')}</p>
      <p class="lb-scoring-note">${t('lbScoringNote')}</p>
      <div class="lb-form-row">
        <input type="text" id="lb-username" class="lb-input" placeholder="${t('lbUsernamePlaceholder')}" maxlength="20">
        <button class="btn-primary" id="lb-register-btn">${t('lbRegister')}</button>
      </div>
      <div id="lb-reg-error" class="lb-error"></div>
      <div class="lb-restore">
        <p class="lb-restore-title">${t('lbRestoreTitle')}</p>
        <p class="lb-card-desc">${t('lbRestoreDesc')}</p>
        <div class="lb-form-row">
          <input type="text" id="lb-restore-token" class="lb-input lb-input-token" placeholder="${t('lbRestoreToken')}">
          <button class="btn-secondary" id="lb-restore-btn">${t('lbRestore')}</button>
        </div>
        <div id="lb-restore-error" class="lb-error"></div>
      </div>
    </div>`;

  document.getElementById('lb-register-btn').addEventListener('click', async () => {
    const btn      = document.getElementById('lb-register-btn');
    const errEl    = document.getElementById('lb-reg-error');
    const username = document.getElementById('lb-username').value.trim();
    if (!username) return;
    btn.disabled = true; errEl.textContent = '';
    try {
      const res  = await fetch('/api/leaderboard/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.error; btn.disabled = false; return; }
      state.lbToken = data.token;
      state.lbUser  = { id: data.id, username: data.username, picks: null, totalScore: 0, scores: {} };
      try { localStorage.setItem('wc26-lb-token', data.token); } catch {}
      container.innerHTML = `
        <div class="lb-card">
          <p class="lb-welcome">${t('lbWelcome', data.username)}</p>
          <p class="lb-token-label">${t('lbTokenLabel')}</p>
          <div class="lb-token-wrap">
            <code class="lb-token-code">${data.token}</code>
            <button class="btn-secondary btn-sm" id="lb-copy-token">${t('shareCopyImage').replace('Image','Token')}</button>
          </div>
          <p class="lb-card-desc">${t('lbTokenWarn')}</p>
          <button class="btn-primary" id="lb-token-ok">${t('lbTokenOk')}</button>
        </div>`;
      document.getElementById('lb-copy-token')?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(data.token).catch(() => {});
      });
      document.getElementById('lb-token-ok').addEventListener('click', () => renderLeaderboardTab());
    } catch { errEl.textContent = t('statusFailed'); btn.disabled = false; }
  });

  document.getElementById('lb-restore-btn').addEventListener('click', async () => {
    const btn    = document.getElementById('lb-restore-btn');
    const errEl  = document.getElementById('lb-restore-error');
    const token  = document.getElementById('lb-restore-token').value.trim();
    if (!token) return;
    btn.disabled = true; errEl.textContent = '';
    try {
      const res = await fetch('/api/leaderboard/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { errEl.textContent = t('lbRestoreFailed'); btn.disabled = false; return; }
      const data = await res.json();
      state.lbToken = token;
      state.lbUser  = data;
      try { localStorage.setItem('wc26-lb-token', token); } catch {}
      renderLeaderboardTab();
    } catch { errEl.textContent = t('statusFailed'); btn.disabled = false; }
  });
}

function renderLbPicks(container) {
  const user  = state.lbUser;
  const picks = user?.picks ?? {};
  const mp    = getModelPicks();

  const picksSummary = picks.winner
    ? `<div class="lb-picks-summary">
         <div class="lb-pick-summary-row">
           <span class="lb-pick-summary-label">${t('lbPickWinner')}</span>
           ${flag(picks.winner)} <strong>${getTeamName(picks.winner)}</strong>
         </div>
         ${picks.finalist ? `<div class="lb-pick-summary-row">
           <span class="lb-pick-summary-label">${t('lbPickFinalist')}</span>
           ${flag(picks.finalist)} ${getTeamName(picks.finalist)}
         </div>` : ''}
         ${(picks.semiFinals ?? []).length ? `<div class="lb-pick-summary-row">
           <span class="lb-pick-summary-label">${t('lbThSF')}</span>
           ${picks.semiFinals.map(id => `${flag(id)} ${getTeamName(id)}`).join(' &nbsp;·&nbsp; ')}
         </div>` : ''}
       </div>`
    : `<p class="lb-card-desc">${t('bcNoPicksYet')}</p>`;

  container.innerHTML = `
    <div class="lb-card">
      <div class="lb-user-header">
        <span class="lb-username-badge">${t('lbWelcomeName', user.username)}</span>
        <span class="lb-score-badge">${t('lbScore', user.totalScore)}</span>
        <button class="btn-secondary btn-sm lb-signout-btn" id="lb-signout">${t('lbSignOut')}</button>
      </div>
      ${mp ? `<p class="lb-model-hint">💡 ${t('lbModelHint', getTeamName(mp.winner))}</p>` : ''}
      <p class="lb-scoring-note">${t('lbScoringNote')}</p>
      ${picks.winner ? `<h3 class="lb-card-title">${t('bcBracketExists')}</h3>` : ''}
      ${picksSummary}
      <button class="btn-primary" id="lb-open-bracket">${picks.winner ? t('bcEditBtn') : t('bcCreateBtn')}</button>
    </div>`;

  document.getElementById('lb-signout').addEventListener('click', () => {
    state.lbToken = null; state.lbUser = null;
    try { localStorage.removeItem('wc26-lb-token'); } catch {}
    state.bcStep = null;
    renderLeaderboardTab();
  });

  document.getElementById('lb-open-bracket').addEventListener('click', () => {
    state.myGroupPicks  = defaultGroupPicks();
    state.myThirdPicks  = null;
    // Restore bracket picks from saved bracket if available
    if (picks.bracket) {
      state.bracketPicks = picks.bracket;
      // Ensure saved brackets have the final array (back-compat with older saves)
      if (!state.bracketPicks.final) state.bracketPicks.final = Array(1).fill(null);
      state.myR32Pairs   = state.bracketPicks.r32Pairs ?? buildR32Pairs(state.myGroupPicks);
      state.myThirdPicks = state.bracketPicks.myThirdPicks ?? null;
    }
    state.bcStep = 'groups';
    renderGroupPickerStep();
  });
}

function renderLbTable(container) {
  if (!container) return;
  if (!state.lbData?.length) {
    container.innerHTML = `
      <h3 class="lb-section-title">${t('lbTitle')}</h3>
      <div class="empty-state"><p>${t('lbNoUsers')}</p></div>`;
    return;
  }
  const mp = getModelPicks();
  const rows = state.lbData.map((user, i) => {
    const agreesModel = mp && user.picks?.winner === mp.winner;
    const badge = agreesModel ? `<span class="lb-model-badge">${t('lbAgreesModel')}</span>` : '';
    const sfText = (user.picks?.semiFinals ?? [])
      .map(id => `${flag(id)} ${id}`).join('  ') || '—';
    return `<tr${state.lbUser?.id === user.id ? ' class="lb-me-row"' : ''}>
      <td class="lb-rank">${i + 1}</td>
      <td><strong>${user.username}</strong>${badge}</td>
      <td>${user.picks?.winner   ? `${flag(user.picks.winner)} ${getTeamName(user.picks.winner)}`     : '—'}</td>
      <td>${user.picks?.finalist ? `${flag(user.picks.finalist)} ${getTeamName(user.picks.finalist)}` : '—'}</td>
      <td class="lb-sf-cell">${sfText}</td>
      <td class="lb-score-cell">${user.totalScore}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <h3 class="lb-section-title">${t('lbTitle')}</h3>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>#</th>
          <th>${t('lbThUser')}</th>
          <th>${t('lbThWinner')}</th>
          <th>${t('lbThFinalist')}</th>
          <th>${t('lbThSF')}</th>
          <th>${t('lbThScore')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function renderLeaderboardTab() {
  const userSection  = document.getElementById('lb-user-section');
  const tableSection = document.getElementById('lb-table-section');
  if (!userSection) return;

  await Promise.all([lbFetchMe(), lbFetchLeaderboard()]);

  if (!state.lbToken || !state.lbUser) {
    renderLbRegistration(userSection);
  } else {
    renderLbPicks(userSection);
  }
  renderLbTable(tableSection);
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
  if (document.getElementById('tab-groups')?.classList.contains('active')) renderGroupsTab();
}

// ════════════════════════════════════════════════════════════════════════════
// FANTASY TAB
// ════════════════════════════════════════════════════════════════════════════

const FANTASY_SLOTS  = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const POS_COLORS     = { GK: '#f59e0b', DEF: '#22c55e', MID: '#3b82f6', FWD: '#ef4444' };
const FANTASY_BUDGET = 100;

async function loadFantasyPlayers() {
  if (state.fantasy.players) return;
  const data = await api('/fantasy/players');
  state.fantasy.players = data.players;
}

function renderFantasyTab() {
  ['builder','myteam','optimise'].forEach(v => {
    document.getElementById(`fantasy-view-${v}`)
      ?.classList.toggle('active', v === state.fantasy.view);
  });
  if (state.fantasy.view === 'builder')  renderFantasyBuilder();
  if (state.fantasy.view === 'myteam')   renderFantasyMyTeam();
  if (state.fantasy.view === 'optimise') renderFantasyOptimise();
}

function fantasyCountryCounts() {
  const c = {};
  state.fantasy.squad.forEach(p => { c[p.team] = (c[p.team] ?? 0) + 1; });
  return c;
}

function fantasySlotsUsed() {
  const f = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  state.fantasy.squad.forEach(p => f[p.pos]++);
  return f;
}

function fantasySpent() {
  return state.fantasy.squad.reduce((s, p) => s + p.price, 0);
}

function canAddPlayer(p) {
  if (state.fantasy.squad.find(x => x.id === p.id)) return { ok: false, msg: t('fantasyToastDuplicate') };
  if (state.fantasy.squad.length >= 15)              return { ok: false, msg: t('fantasyToastFull') };
  const slots = fantasySlotsUsed();
  if (slots[p.pos] >= FANTASY_SLOTS[p.pos]) return { ok: false, msg: t('fantasyToastPos', p.pos, FANTASY_SLOTS[p.pos]) };
  if (fantasySpent() + p.price > FANTASY_BUDGET) return { ok: false, msg: t('fantasyToastBudget') };
  const cc = fantasyCountryCounts();
  if ((cc[p.team] ?? 0) >= 3) return { ok: false, msg: t('fantasyToastCountry', p.team) };
  return { ok: true };
}

function showFantasyToast(msg) {
  const el = document.getElementById('upset-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(el._ft);
  el._ft = setTimeout(() => el.classList.remove('visible'), 3000);
}

function renderBudgetBar() {
  const spent = fantasySpent();
  const pct   = Math.min(100, (spent / FANTASY_BUDGET) * 100);
  const tight = pct > 90;
  const slots = fantasySlotsUsed();
  const bar   = document.getElementById('fantasy-budget-bar');
  bar.innerHTML = `
    <div class="budget-label">
      <span>$${spent.toFixed(1)}M / $${FANTASY_BUDGET}M</span>
      <span class="budget-remaining${tight ? ' budget-tight' : ''}">$${(FANTASY_BUDGET - spent).toFixed(1)}M remaining</span>
    </div>
    <div class="budget-track"><div class="budget-fill${tight ? ' budget-fill-warn' : ''}" style="width:${pct}%"></div></div>
    <div class="slot-counts">
      ${Object.entries(FANTASY_SLOTS).map(([pos, max]) => {
        const n = slots[pos];
        return `<span class="slot-count${n === max ? ' slot-full' : ''}">${pos}: ${n}/${max}</span>`;
      }).join('')}
      ${state.fantasy.squad.length > 0
        ? `<button class="btn-clear-squad">${t('fantasyClearSquad')}</button>`
        : ''}
    </div>`;

  bar.querySelector('.btn-clear-squad')?.addEventListener('click', () => {
    state.fantasy.squad     = [];
    state.fantasy.captainId = null;
    state.fantasy.optimised = false;
    renderBudgetBar();
    renderPitch();
    renderPlayerBrowser();
  });
}

function renderPitch() {
  const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
  state.fantasy.squad.forEach(p => byPos[p.pos].push(p));
  const rows = [
    { pos: 'FWD', slots: FANTASY_SLOTS.FWD },
    { pos: 'MID', slots: FANTASY_SLOTS.MID },
    { pos: 'DEF', slots: FANTASY_SLOTS.DEF },
    { pos: 'GK',  slots: FANTASY_SLOTS.GK  },
  ];
  const pitch = document.getElementById('fantasy-pitch');
  if (!pitch) return;
  const banner = state.fantasy.optimised
    ? `<div class="optimised-banner">${t('fantasyOptimisedBanner')}</div>`
    : '';
  pitch.innerHTML = banner + `<div class="pitch-grass">${
    rows.map(({ pos, slots }) =>
      `<div class="pitch-row">${Array.from({ length: slots }, (_, i) => {
        const p = byPos[pos][i];
        if (p) {
          const isCap = p.id === state.fantasy.captainId;
          return `<div class="pitch-slot pitch-slot-filled">
            ${isCap ? '<span class="captain-badge">C</span>' : ''}
            <button class="pitch-remove" data-id="${p.id}">×</button>
            <span class="pitch-player-name">${p.name.split(' ').pop()}</span>
            <span class="pitch-player-price">$${p.price}M</span>
          </div>`;
        }
        return `<div class="pitch-slot pitch-slot-empty"><span class="pitch-pos-label">${pos}</span></div>`;
      }).join('')}</div>`
    ).join('')
  }</div>`;

  pitch.querySelectorAll('.pitch-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      state.fantasy.squad = state.fantasy.squad.filter(p => p.id !== id);
      if (state.fantasy.captainId === id) state.fantasy.captainId = null;
      state.fantasy.optimised = false;
      renderBudgetBar();
      renderPitch();
      renderPlayerBrowser();
    });
  });
}

function renderFilters() {
  const f = document.getElementById('fantasy-filters');
  if (!f) return;
  f.innerHTML = `
    ${['All','GK','DEF','MID','FWD'].map(pos =>
      `<button class="fantasy-pos-btn${state.fantasy.filter.pos === (pos === 'All' ? '' : pos) ? ' active' : ''}"
        data-pos="${pos === 'All' ? '' : pos}">${t(pos === 'All' ? 'fantasyAllPos' : pos) || pos}</button>`
    ).join('')}
    <input class="fantasy-search" type="text" placeholder="${t('fantasySearchPlaceholder')}"
      value="${state.fantasy.filter.nameQuery}">
    <div class="fantasy-price-filter">
      <label>${t('fantasyMaxPrice')} $<input type="number" min="3.5" max="15" step="0.5"
        value="${state.fantasy.filter.maxPrice}" style="width:55px;padding:3px 5px;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;">M</label>
    </div>`;

  f.querySelectorAll('.fantasy-pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.fantasy.filter.pos = btn.dataset.pos;
      renderFilters();
      renderPlayerBrowser();
    });
  });
  const searchEl = f.querySelector('.fantasy-search');
  searchEl?.addEventListener('input', () => {
    state.fantasy.filter.nameQuery = searchEl.value;
    renderPlayerBrowser();
  });
  const priceEl = f.querySelector('input[type=number]');
  priceEl?.addEventListener('input', () => {
    state.fantasy.filter.maxPrice = parseFloat(priceEl.value) || 15;
    renderPlayerBrowser();
  });
}

function renderPlayerBrowser() {
  const tbody = document.getElementById('fantasy-players-tbody');
  if (!tbody || !state.fantasy.players) return;

  const { pos, nameQuery, maxPrice } = state.fantasy.filter;
  const squadIds     = new Set(state.fantasy.squad.map(p => p.id));
  const cc           = fantasyCountryCounts();

  let rows = state.fantasy.players.filter(p =>
    (!pos      || p.pos === pos) &&
    (!nameQuery || p.name.toLowerCase().includes(nameQuery.toLowerCase())) &&
    p.price <= maxPrice + 0.05
  );

  const sortKey = state.fantasy.sortBy;
  rows.sort((a, b) => sortKey === 'price'
    ? b.price - a.price
    : (b.xptsTotal ?? 0) - (a.xptsTotal ?? 0)
  );

  tbody.innerHTML = rows.slice(0, 200).map(p => {
    const inSquad  = squadIds.has(p.id);
    const atLimit  = (cc[p.team] ?? 0) >= 3 && !inSquad;
    const col      = POS_COLORS[p.pos];
    return `<tr class="${atLimit ? 'country-warn' : ''}${inSquad ? ' in-squad' : ''}">
      <td><span class="badge" style="background:${col}22;color:${col};font-size:10px">${p.pos}</span></td>
      <td>${flag(p.team)} <span style="font-size:10px;color:var(--muted)">${p.team}</span>
        ${atLimit ? `<span class="badge badge-country-warn">3/3</span>` : ''}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</td>
      <td>$${p.price}M</td>
      <td class="${(p.xptsTotal ?? 0) > 20 ? 'p-high' : ''}">${(p.xptsTotal ?? 0).toFixed(1)}</td>
      <td>${inSquad
        ? `<button class="btn-secondary btn-sm fantasy-remove-btn" data-id="${p.id}" style="padding:2px 8px">✕</button>`
        : `<button class="btn-primary btn-sm fantasy-add-btn" data-id="${p.id}" style="padding:2px 8px" ${atLimit ? 'disabled' : ''}>+</button>`
      }</td>
    </tr>`;
  }).join('');

  // Attach handlers
  tbody.querySelectorAll('.fantasy-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = state.fantasy.players.find(x => x.id === btn.dataset.id);
      if (!p) return;
      const { ok, msg } = canAddPlayer(p);
      if (!ok) { showFantasyToast(msg); return; }
      state.fantasy.squad.push(p);
      if (!state.fantasy.captainId) state.fantasy.captainId = p.id; // auto-captain first pick
      renderBudgetBar(); renderPitch(); renderPlayerBrowser();
    });
  });
  tbody.querySelectorAll('.fantasy-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      state.fantasy.squad = state.fantasy.squad.filter(p => p.id !== id);
      if (state.fantasy.captainId === id) state.fantasy.captainId = null;
      state.fantasy.optimised = false;
      renderBudgetBar(); renderPitch(); renderPlayerBrowser();
    });
  });
}

function renderFantasyBuilder() {
  if (!state.fantasy.players) {
    document.getElementById('fantasy-players-tbody').innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">${t('fantasyLoading')}</td></tr>`;
    loadFantasyPlayers().then(() => {
      renderFilters();
      renderBudgetBar();
      renderPitch();
      renderPlayerBrowser();
    });
    return;
  }
  renderFilters();
  renderBudgetBar();
  renderPitch();
  renderPlayerBrowser();
}

function renderFantasyMyTeam() {
  const el = document.getElementById('fantasy-myteam-content');
  if (!el) return;

  if (!state.fantasy.squad.length) {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">${t('fantasyNoSquad')}</div>`;
    return;
  }

  const bestByPos = {};
  if (state.fantasy.players) {
    ['GK','DEF','MID','FWD'].forEach(pos => {
      const notInSquad = state.fantasy.players.filter(
        p => p.pos === pos && !state.fantasy.squad.find(s => s.id === p.id)
      );
      bestByPos[pos] = notInSquad.sort((a, b) => (b.xptsTotal ?? 0) - (a.xptsTotal ?? 0))[0];
    });
  }

  const capId = state.fantasy.captainId;
  const totalXpts = state.fantasy.squad.reduce((s, p) => {
    return s + (p.xptsTotal ?? 0) * (p.id === capId ? 2 : 1);
  }, 0);

  el.innerHTML = `
    <div class="myteam-header">
      <div class="stat-box">
        <div class="stat-label">${t('fantasyTotalXpts')}</div>
        <div class="stat-value">${totalXpts.toFixed(1)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${t('fantasyBudgetUsed')}</div>
        <div class="stat-value">$${fantasySpent().toFixed(1)}M</div>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>${t('fthPos')}</th><th>${t('fthTeam')}</th><th>${t('fthName')}</th>
          <th>${t('fthPrice')}</th><th>${t('fantasyXptsGS')}</th>
          <th>${t('fantasyXptsKO')}</th><th>${t('fantasyXptsTotal')}</th>
          <th>${t('fantasyCaptain')}</th><th>${t('fantasyVsOptimal')}</th>
        </tr></thead>
        <tbody>
          ${state.fantasy.squad.map(p => {
            const isCap   = p.id === capId;
            const best    = bestByPos[p.pos];
            const delta   = (p.xptsTotal ?? 0) - (best?.xptsTotal ?? p.xptsTotal ?? 0);
            const deltaClass = delta >= 0 ? 'p-high' : 'p-low';
            const xpts    = ((p.xptsTotal ?? 0) * (isCap ? 2 : 1)).toFixed(1);
            return `<tr>
              <td><span class="badge" style="background:${POS_COLORS[p.pos]}22;color:${POS_COLORS[p.pos]}">${p.pos}</span></td>
              <td>${flag(p.team)}</td>
              <td>${p.name}</td>
              <td>$${p.price}M</td>
              <td>${(p.xptsGroupStage ?? 0).toFixed(1)}</td>
              <td>${(p.xptsKnockout ?? 0).toFixed(1)}</td>
              <td class="p-high">${xpts}${isCap ? ' ×2' : ''}</td>
              <td>
                <button class="btn-sm ${isCap ? 'btn-primary' : 'btn-secondary'} fantasy-cap-btn"
                  data-id="${p.id}">${isCap ? t('fantasyIsCaptain') : t('fantasySetCaptain')}</button>
              </td>
              <td class="${deltaClass}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="chip-panel">
      <h4>${t('fantasyChipsTitle')}</h4>
      <div class="chip-grid">
        ${['Wildcard','12th Man','Maximum Captain','Qualification Booster'].map(c =>
          `<div class="chip-card chip-disabled">
            <span class="chip-name">${c}</span>
            <span class="chip-status">${t('fantasyChipComingSoon')}</span>
          </div>`
        ).join('')}
      </div>
    </div>`;

  el.querySelectorAll('.fantasy-cap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.fantasy.captainId = btn.dataset.id;
      renderFantasyMyTeam();
    });
  });
}

function renderFantasyOptimise() {
  const el = document.getElementById('fantasy-optimise-content');
  if (!el) return;
  el.innerHTML = `
    <div class="optimise-header">
      <p>${t('fantasyOptimiseHelp')}</p>
      <button class="btn-primary" id="fantasy-optimise-btn">${t('fantasyFindBestXI')}</button>
    </div>
    <div id="optimise-result"></div>`;

  document.getElementById('fantasy-optimise-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('fantasy-optimise-btn');
    btn.disabled = true; btn.textContent = '…';
    document.getElementById('optimise-result').innerHTML = '';
    try {
      const result = await api('/fantasy/optimise');
      state.fantasy.squad     = result.squad;
      state.fantasy.captainId = result.squad.reduce((best, p) =>
        (p.xptsTotal ?? 0) > (best?.xptsTotal ?? 0) ? p : best, null)?.id ?? null;
      state.fantasy.optimised = true;
      state.fantasy.view      = 'builder';
      document.querySelectorAll('#fantasy-pill-tabs .pill-tab')
        .forEach(b => b.classList.toggle('active', b.dataset.view === 'builder'));
      renderFantasyTab();
    } catch (err) {
      document.getElementById('optimise-result').innerHTML =
        `<p style="color:var(--loss);margin-top:10px">${err.message}</p>`;
    } finally {
      btn.disabled = false; btn.textContent = t('fantasyFindBestXI');
    }
  });
}

function initFantasyView() {
  document.querySelectorAll('#fantasy-pill-tabs .pill-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.fantasy.view = btn.dataset.view;
      document.querySelectorAll('#fantasy-pill-tabs .pill-tab')
        .forEach(b => b.classList.toggle('active', b === btn));
      renderFantasyTab();
    });
  });

  // Sort column headers
  document.querySelectorAll('#fantasy-players-table th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      state.fantasy.sortBy = th.dataset.sort;
      renderPlayerBrowser();
    });
  });
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
    initGroupsTab();
    initBracketView();
    initScenarioView();
    initHistoryView();
    initFantasyView();
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

    // Two-pass simulation: 1k for instant feedback, then 50k background upgrade
    setSimStatus(t('statusInitial'));
    try {
      const fast = await simulate(1_000);
      state.simResults = fast;
      state.simGroups  = fast.groups ?? null;
      state.simMeta    = fast.meta;
      setSimStatus(t('statusRefining'), true);
      renderTeamsTable();
      if (state.selectedTeamId) renderTeamDetail();
      renderGroupStandings(state.matchGroup);
      if (document.getElementById('tab-bracket').classList.contains('active')) {
        renderBracket();
        renderShareSection();
      }
      if (document.getElementById('tab-groups')?.classList.contains('active')) renderGroupsTab();

      // Background upgrade — does not block; updates UI when ready
      simulate(50_000).then(refined => {
        state.simResults = refined;
        state.simGroups  = refined.groups ?? null;
        state.simMeta    = refined.meta;
        setSimStatus(t('statusSims', refined.meta.n, refined.meta.elapsedMs));
        flashSimUpdate();
        renderTeamsTable();
        if (state.selectedTeamId) renderTeamDetail();
        renderGroupStandings(state.matchGroup);
        if (document.getElementById('tab-bracket').classList.contains('active')) {
          renderBracket();
          renderShareSection();
        }
        if (document.getElementById('tab-groups')?.classList.contains('active')) renderGroupsTab();
      }).catch(() => {
        // 50k failed — fast results are still shown, just drop the refining indicator
        setSimStatus(t('statusSims', state.simMeta.n, state.simMeta.elapsedMs));
      });
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
