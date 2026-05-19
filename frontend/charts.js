// Chart.js wrapper helpers. `Chart` is loaded globally via CDN script tag.

const instances = {};

function destroy(id) {
  instances[id]?.destroy();
  delete instances[id];
}

export function createAttackDefenseChart(canvasId, teams) {
  destroy(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !teams?.length) return;

  instances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: teams.map(t => t.id),
      datasets: [
        {
          label: 'Attack (α)',
          data: teams.map(t => +(t.attack ?? 0).toFixed(3)),
          backgroundColor: 'rgba(59,130,246,0.75)',
          borderRadius: 4,
        },
        {
          label: 'Defense quality (−δ)',
          data: teams.map(t => +(-(t.defense ?? 0)).toFixed(3)),
          backgroundColor: 'rgba(34,197,94,0.75)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(3)}` } },
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: '#334155' } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#334155' } },
      },
    },
  });
}

export function createScoreHistogram(canvasId, topScores) {
  destroy(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !topScores?.length) return;

  const labels = topScores.map(s => `${s.goalsA}–${s.goalsB}`);
  const data   = topScores.map(s => +(s.prob * 100).toFixed(1));
  const bgColors = data.map((_, i) => i === 0 ? 'rgba(59,130,246,.9)' : 'rgba(59,130,246,.45)');

  instances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Probability', data, backgroundColor: bgColors, borderRadius: 3 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toFixed(1)}%` } },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => `${v}%` },
          grid: { color: '#334155' },
        },
        y: { ticks: { color: '#f1f5f9', font: { size: 12, weight: 'bold' } }, grid: { display: false } },
      },
    },
  });
}

const HM_N = 7; // display goals 0–6

export function createScoreHeatmap(containerId, scoreMatrix, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container || !scoreMatrix) return;

  const {
    homeLabel = 'Home goals',
    awayLabel = 'Away goals',
    winLabel  = 'Win',
    drawLabel = 'Draw',
    lossLabel = 'Loss',
  } = opts;

  let maxProb = 0, bestI = 0, bestJ = 0;
  for (let i = 0; i < HM_N; i++)
    for (let j = 0; j < HM_N; j++) {
      const p = scoreMatrix[i]?.[j] ?? 0;
      if (p > maxProb) { maxProb = p; bestI = i; bestJ = j; }
    }

  let pWin = 0, pDraw = 0, pLoss = 0;
  for (let i = 0; i < scoreMatrix.length; i++)
    for (let j = 0; j < (scoreMatrix[i]?.length ?? 0); j++) {
      const p = scoreMatrix[i][j];
      if (i > j) pWin += p;
      else if (i === j) pDraw += p;
      else pLoss += p;
    }

  let html = `<div class="hm-grid">`;
  html += `<div class="hm-corner"></div>`;
  for (let j = 0; j < HM_N; j++)
    html += `<div class="hm-col-hdr">${j}</div>`;

  for (let i = 0; i < HM_N; i++) {
    html += `<div class="hm-row-hdr">${i}</div>`;
    for (let j = 0; j < HM_N; j++) {
      const p = scoreMatrix[i]?.[j] ?? 0;
      const opacity = maxProb > 0 ? (0.08 + 0.92 * Math.sqrt(p / maxProb)) : 0.08;
      const cls = i > j ? 'hm-win' : i === j ? 'hm-draw' : 'hm-loss';
      const best = (i === bestI && j === bestJ) ? ' hm-best' : '';
      const label = p >= 0.003 ? (p * 100).toFixed(1) : '';
      html += `<div class="hm-cell ${cls}${best}" style="opacity:${opacity.toFixed(3)}" title="${i}–${j}: ${(p*100).toFixed(2)}%">` +
        (label ? `<span class="hm-pct">${label}</span>` : '') +
        `</div>`;
    }
  }

  html += `</div>`;
  html += `<div class="hm-axis">
    <span>↑ ${homeLabel}</span>
    <span>${awayLabel} →</span>
  </div>`;
  html += `<div class="hm-summary">
    <span class="hm-s-win">${(pWin*100).toFixed(1)}% ${winLabel}</span>
    <span class="hm-s-draw">${(pDraw*100).toFixed(1)}% ${drawLabel}</span>
    <span class="hm-s-loss">${(pLoss*100).toFixed(1)}% ${lossLabel}</span>
  </div>`;

  container.innerHTML = html;
}

export function destroyChart(id) { destroy(id); }
