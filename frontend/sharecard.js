// Client-side share card generator using Canvas 2D API.
// Produces a 1200×630 landscape card (Twitter/X OG) or 1080×1080 square (WhatsApp/Instagram).

const DIMS = {
  landscape: { w: 1200, h: 630 },
  square:    { w: 1080, h: 1080 },
};

const COL = {
  bg:      '#0f172a',
  surface: 'rgba(255,255,255,0.04)',
  accent:  '#3b82f6',
  win:     '#22c55e',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  dim:     '#475569',
  bar:     'rgba(255,255,255,0.10)',
};

const FONT = '"Inter", system-ui, -apple-system, sans-serif';
const N_TEAMS = { landscape: 5, square: 7 };

function flagEmoji(iso2) {
  if (!iso2 || iso2.includes('-')) return '';
  const base = 0x1F1E6 - 65;
  return String.fromCodePoint(base + iso2.toUpperCase().charCodeAt(0),
                               base + iso2.toUpperCase().charCodeAt(1));
}

function fillRoundRect(ctx, x, y, w, h, r) {
  if (w <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a share card onto the given canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {'landscape'|'square'} format
 * @param {{ id:string, name:string, prob:number, iso2:string }[]} topTeams
 * @param {{ n:number }} meta
 */
export function drawShareCard(canvas, format, topTeams, meta) {
  const { w, h } = DIMS[format];
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const sq  = format === 'square';
  const n   = Math.min(N_TEAMS[format], topTeams.length);
  const pad = sq ? 72 : 56;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle gradient wash
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, 'rgba(59,130,246,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Accent top bar
  ctx.fillStyle = COL.accent;
  ctx.fillRect(0, 0, w, sq ? 6 : 4);

  // ── Header ──────────────────────────────────────────────────────────────────
  const titleSize  = sq ? 52 : 38;
  const subSize    = sq ? 28 : 20;
  const badgeSize  = sq ? 24 : 17;
  const headerH    = sq ? 160 : 110;

  ctx.textBaseline = 'top';

  // App name
  ctx.font      = `800 ${titleSize}px ${FONT}`;
  ctx.fillStyle = COL.text;
  ctx.textAlign = 'left';
  ctx.fillText('WC 2026 Predictor', pad, pad);

  // Subtitle
  ctx.font      = `400 ${subSize}px ${FONT}`;
  ctx.fillStyle = COL.muted;
  ctx.fillText('Tournament Winner Probabilities', pad, pad + titleSize + 10);

  // Sim count badge (top-right)
  const simText = `${(meta?.n ?? 10000).toLocaleString()} simulations`;
  ctx.font      = `600 ${badgeSize}px ${FONT}`;
  ctx.fillStyle = COL.accent;
  ctx.textAlign = 'right';
  ctx.fillText(simText, w - pad, pad);

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(pad, pad + headerH - 12, w - pad * 2, 1);

  // ── Team rows ───────────────────────────────────────────────────────────────
  const rowsTop = pad + headerH;
  const footerH = sq ? 100 : 70;
  const rowH    = (h - rowsTop - footerH) / n;

  const rankW   = sq ? 48 : 36;
  const emojiW  = sq ? 64 : 48;
  const nameW   = sq ? 260 : 200;
  const pctW    = sq ? 90 : 70;
  const barX    = pad + rankW + emojiW + nameW + 16;
  const barMaxW = w - barX - pctW - pad - 16;
  const barH    = sq ? 18 : 13;

  const maxProb = topTeams[0]?.prob ?? 0.01;

  for (let i = 0; i < n; i++) {
    const tm   = topTeams[i];
    const rowY = rowsTop + i * rowH;
    const mid  = rowY + rowH / 2;

    // Alternating row bg
    if (i % 2 === 0) {
      ctx.fillStyle = COL.surface;
      ctx.fillRect(0, rowY, w, rowH);
    }

    // Rank
    ctx.font      = `700 ${sq ? 28 : 20}px ${FONT}`;
    ctx.fillStyle = COL.dim;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), pad + rankW - 8, mid);

    // Flag emoji
    const emoji = flagEmoji(tm.iso2);
    if (emoji) {
      ctx.font = `${sq ? 38 : 28}px serif`;
      ctx.textAlign = 'left';
      ctx.fillText(emoji, pad + rankW, mid - (sq ? 18 : 13));
    }

    // Team name
    ctx.font      = `700 ${sq ? 32 : 23}px ${FONT}`;
    ctx.fillStyle = COL.text;
    ctx.textAlign = 'left';
    const maxNameW = nameW - 8;
    ctx.fillText(tm.name, pad + rankW + emojiW, mid, maxNameW);

    // Bar track
    const bY = mid - barH / 2;
    ctx.fillStyle = COL.bar;
    fillRoundRect(ctx, barX, bY, barMaxW, barH, barH / 2);

    // Bar fill
    const fillW = barMaxW * (tm.prob / maxProb);
    ctx.fillStyle = COL.accent;
    fillRoundRect(ctx, barX, bY, fillW, barH, barH / 2);

    // Percentage
    ctx.font      = `800 ${sq ? 30 : 22}px ${FONT}`;
    ctx.fillStyle = COL.win;
    ctx.textAlign = 'right';
    ctx.fillText(`${(tm.prob * 100).toFixed(1)}%`, w - pad, mid);
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = h - (sq ? 48 : 34);
  ctx.font      = `400 ${sq ? 24 : 17}px ${FONT}`;
  ctx.fillStyle = COL.dim;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('wc2026predictor.com', pad, footerY);

  const dateStr = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, w - pad, footerY);
}
