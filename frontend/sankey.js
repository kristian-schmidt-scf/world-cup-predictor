// Pure-SVG tournament path flow diagram.
// No external dependencies; works with any modern browser.

const W = 540;
const H = 210;
const PAD = { top: 28, right: 16, bottom: 58, left: 16 };
const NODE_W = 10;
const ELIM_COLOR = '#475569';
const CHAMP_COLOR = '#22c55e';

// stages: [{ label, prob }, ...] — first item is Start (prob=1), last is Champion
// opts.color : advancing-flow colour
// opts.title : team title string rendered below the diagram
export function drawTournamentFlow(containerEl, stages, opts = {}) {
  const { color = '#3b82f6', title = '', onStageClick = null } = opts;

  containerEl.innerHTML = '';

  const svg = _svg('svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.classList.add('sankey-svg');

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const cy     = PAD.top + innerH / 2; // vertical centre of flow area
  const n      = stages.length;
  const xs     = stages.map((_, i) => PAD.left + (i / (n - 1)) * innerW);

  // ── Ribbons (drawn before nodes so nodes sit on top) ──────────────────────
  for (let i = 0; i < n - 1; i++) {
    const srcProb = stages[i].prob;
    const advProb = stages[i + 1].prob;

    const srcH   = srcProb * innerH;
    const advH   = advProb * innerH;

    // Advance ribbon: top-aligned within source bar → fills target bar fully
    const srcTop    = cy - srcH / 2;
    const srcAdvBot = srcTop + advH;
    const dstTop    = cy - advH / 2;
    const dstBot    = cy + advH / 2;

    const srcX = xs[i]     + NODE_W / 2;
    const dstX = xs[i + 1] - NODE_W / 2;
    const mx   = (srcX + dstX) / 2;

    const ribbon = _svg('path');
    ribbon.setAttribute('d', [
      `M ${srcX} ${srcTop}`,
      `C ${mx} ${srcTop} ${mx} ${dstTop} ${dstX} ${dstTop}`,
      `L ${dstX} ${dstBot}`,
      `C ${mx} ${dstBot} ${mx} ${srcAdvBot} ${srcX} ${srcAdvBot}`,
      'Z',
    ].join(' '));
    ribbon.setAttribute('fill', color);
    ribbon.setAttribute('opacity', '0.28');
    ribbon.classList.add('sankey-ribbon');

    _title(ribbon,
      `${stages[i + 1].label}: ${_pct(advProb)} advance\n` +
      `${_pct(srcProb - advProb)} eliminated here`
    );
    svg.appendChild(ribbon);

    // Elim label between nodes (centred in the gap, only if meaningful)
    if (srcProb - advProb >= 0.005) {
      const elimY  = (srcAdvBot + cy + srcH / 2) / 2;   // mid of eliminated band at source
      const midX   = (xs[i] + xs[i + 1]) / 2;
      const elimTxt = _svg('text');
      elimTxt.setAttribute('x', midX);
      elimTxt.setAttribute('y', cy + innerH / 2 + 30);
      elimTxt.setAttribute('text-anchor', 'middle');
      elimTxt.classList.add('sankey-elim-label');
      elimTxt.textContent = `−${_pct(srcProb - advProb)}`;
      svg.appendChild(elimTxt);
    }
  }

  // ── Node bars ─────────────────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const srcProb = stages[i].prob;
    const advProb = i < n - 1 ? stages[i + 1].prob : 0;
    const srcH    = srcProb * innerH;
    const advH    = advProb * innerH;
    const barTopY = cy - srcH / 2;
    const barX    = xs[i] - NODE_W / 2;

    // Advance portion of bar
    if (advH > 0) {
      const r = _rect(barX, barTopY, NODE_W, Math.max(3, advH),
                      i === n - 1 ? CHAMP_COLOR : color);
      r.classList.add('sankey-node');
      if (onStageClick) r.style.cursor = 'pointer';
      _nodeInteraction(r, stages[i], i, onStageClick);
      svg.appendChild(r);
    }

    // Eliminated portion of bar (last node has none)
    const elimH = srcH - advH;
    if (i < n - 1 && elimH > 2) {
      const r = _rect(barX, barTopY + advH, NODE_W, elimH, ELIM_COLOR);
      r.setAttribute('opacity', '0.75');
      r.classList.add('sankey-node');
      _title(r, `${_pct(srcProb - advProb)} eliminated at ${stages[i].label}`);
      svg.appendChild(r);
    }

    // Champion node — full bar in green
    if (i === n - 1) {
      const r = _rect(barX, barTopY, NODE_W, Math.max(3, srcH), CHAMP_COLOR);
      r.classList.add('sankey-node');
      _title(r, `Champion: ${_pct(srcProb)}`);
      svg.appendChild(r);
    }

    // Stage label above
    const lbl = _svg('text');
    lbl.setAttribute('x', xs[i]);
    lbl.setAttribute('y', PAD.top - 8);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.classList.add('sankey-stage-label');
    lbl.textContent = stages[i].label;
    if (onStageClick) { lbl.style.cursor = 'pointer'; lbl.addEventListener('click', () => onStageClick(i)); }
    svg.appendChild(lbl);

    // Probability label below
    const prob = _svg('text');
    prob.setAttribute('x', xs[i]);
    prob.setAttribute('y', cy + innerH / 2 + 16);
    prob.setAttribute('text-anchor', 'middle');
    prob.classList.add('sankey-prob-label');
    prob.style.fill = i === n - 1 ? CHAMP_COLOR : color;
    prob.textContent = _pct(stages[i].prob);
    svg.appendChild(prob);
  }

  // ── Optional title at bottom ───────────────────────────────────────────────
  if (title) {
    const t = _svg('text');
    t.setAttribute('x', W / 2);
    t.setAttribute('y', H - 6);
    t.setAttribute('text-anchor', 'middle');
    t.classList.add('sankey-team-label');
    t.textContent = title;
    svg.appendChild(t);
  }

  containerEl.appendChild(svg);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _svg(tag)  { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
function _pct(v)    { return (v * 100).toFixed(1) + '%'; }

function _rect(x, y, w, h, fill) {
  const r = _svg('rect');
  r.setAttribute('x', x); r.setAttribute('y', y);
  r.setAttribute('width', w); r.setAttribute('height', h);
  r.setAttribute('fill', fill); r.setAttribute('rx', '2');
  return r;
}

function _title(el, text) {
  const t = _svg('title');
  t.textContent = text;
  el.appendChild(t);
}

function _nodeInteraction(el, stage, idx, onStageClick) {
  _title(el, `${stage.label}: ${_pct(stage.prob)}`);
  if (onStageClick) el.addEventListener('click', () => onStageClick(idx));
}
