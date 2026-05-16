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

export function destroyChart(id) { destroy(id); }
