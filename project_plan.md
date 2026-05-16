# World Cup 2026 Predictor — Project Plan

**Started:** 2026-05-14  
**Tournament start:** 2026-06-11 (Group Stage, Day 1)  
**Tournament final:** 2026-07-19  

---

## Milestones at a Glance

| # | Milestone | Target | Status |
|---|-----------|--------|--------|
| 1 | Data layer (APIs + static fixtures + enrichment) | May 21 | ✅ Done (May 15) |
| 2 | Models implemented & calibrated | May 28 | ✅ Done (May 15) |
| 3 | Backend API complete | June 4 | ✅ Done (May 15) |
| 4 | Frontend MVP (all 4 views) | June 9 | ⬜ Planned |
| 5 | Live tournament mode (real-time updates) | June 11 | ⬜ Planned |
| 6 | Knockout-stage predictions | July 4 | ⬜ Planned |

---

## Phase 1 — Data Layer ✅ Complete (May 15)

Goal: reliable, cached access to all data the models need.

### Tasks
- [x] **Fixtures** — Hard-coded from the Dec 5, 2025 FIFA draw. 72 group-stage matches (12 groups × 6) + 32 knockout slots = 104 total fixtures. Group dates June 11–25 (approximate official schedule).
- [x] **Team data** — All 48 WC 2026 teams with FIFA ranking, ranking points, confederation, and group assignment. Confirmed from official draw; Group J bug caught and fixed (Jordan, not Colombia).
- [x] **Historical results** — 7,294 international matches since 2010 from the [martj42/international_results](https://github.com/martj42/international_results) GitHub CSV. No API key required. 24h cache TTL with stale fallback.
- [x] **Elo ratings** — Computed from match history using tournament-weighted K-factors (WC=60, qualifiers=50, friendlies=20) and goal-difference multiplier. Extended history to 2010 for proper calibration.
- [x] **Recent form** — Last 10 matches per team with exponential time-decay (decay rate 0.15). Outputs formScore 0–100, W/D/L record, avg GF/GA, last5 string.
- [x] **Squad market values** — Total squad value in €M for all 48 teams (Transfermarkt, May 2026). Range: €1,300M (England) to €16M (Jordan).
- [x] **Squad average age** — Official projected roster ages for all 48 teams (RotoWire, May 2026). Range: 25.48 (Ivory Coast) to 29.98 (Colombia).
- [x] **Cache layer** — File-based JSON cache under `backend/data/cache/`. Per-key TTL, stale-data fallback on network failure, manual invalidation via `refreshAll()`.

### Files delivered
```
backend/data/teams.js
backend/data/fixtures.js
backend/data/fetchMatches.js
backend/data/computeElo.js
backend/data/computeForm.js
backend/data/fetchSquadStats.js
backend/data/cache.js
backend/data/index.js
backend/data/cache/.gitkeep
```

### Decisions made
- **Historical data source**: martj42 GitHub CSV (free, no key, updated within 24h of matches). Rejected: football-data.org (paid tier for international), SofaScore (requires scraping).
- **History window**: 2010–present (7,294 matches). Longer window gives better Elo calibration; form uses last 10 matches regardless.
- **Elo computation**: Self-contained from match data. No dependency on eloratings.net (URL not publicly documented; Cloudflare-blocked).
- **Squad stats**: Static table with documented source. Transfermarkt blocks scraping; values are stable enough pre-tournament to hard-code.

---

## Phase 2 — Modeling Layer ✅ Complete (May 15)

Goal: working attack/defense ratings and per-match outcome probabilities.

### 2a — Hierarchical Bayesian Estimation ✅
- [x] Prior initialisation blending four signals: Elo (weight 0.35), log market value (0.15), squad age quadratic bonus (peak at 26.5 years), Elo-derived defense proxy.
- [x] Iterative coordinate-ascent MLE: alternates attack and defense updates until convergence (typically ~20 iterations, <100ms).
- [x] L2 regularisation toward prior (λ = 0.02) — the hierarchical pooling component; pulls sparse-data teams toward the league mean.
- [x] Exponential time-decay on match weights (half-life 548 days ≈ 1.5 years).
- [x] Identifiability normalisation: mean(δ) = 0 after each iteration.
- [x] Output: `{ attack, defense }` per team, cached 24h.

### 2b — Dixon-Coles Poisson Model ✅
- [x] Expected goals: `λ_{i→j} = exp(α_i + δ_j)` at neutral venue.
- [x] Full score probability matrix P(i goals, j goals) for i,j ∈ [0,10].
- [x] Dixon-Coles τ correction: ρ = −0.13 (literature default; negative increases low-score draw probability).
- [x] Win/draw/loss probabilities summed from score matrix and renormalised.
- [x] Fast Poisson sampler (Knuth algorithm) for Monte Carlo — skips τ for speed.

### 2c — Tournament Simulation (Monte Carlo) ✅
- [x] Group stage: round-robin 6 matches per group; 3/1/0 points; tiebreakers: GD → GF.
- [x] 8 best 3rd-place teams: ranked by points → GD → GF across all 12 groups.
- [x] Knockout: 90-min result; draws → extra time (0.35× scoring rate) → 50/50 penalty shootout.
- [x] R32 bracket (32 teams): 8 group winners vs 8 best thirds; 4 winners vs 4 runners-up; 4 runners-up cross-bracket.
- [x] `lockedResults` map: override any group match with real scores.
- [x] 1,000 sims in ~100ms; 10,000 sims in ~1 second.
- [x] Output per team: `{ r16, qf, sf, final, winner }` probabilities; winner sum validated = 1.0.

### Files delivered
```
backend/models/hierarchicalBayesian.js
backend/models/dixonColes.js
backend/models/tournamentSimulation.js
backend/models/test.js
```

### Validation results
- Converges in 19 iterations.
- Top teams by attack: ESP, BRA, FRA, GER, NED — correlates well with Elo and betting markets.
- FRA vs ARG: 36/32/32% — correctly tight.
- NOR vs IRQ: 60/29/11% — correctly mismatched.
- Winner probs sum: exactly 1.0 ✅
- Stage probs strictly decrease (R16 > QF > SF > Final > Winner) ✅

---

## Phase 3 — Backend API ✅ Complete (May 15)

Goal: Express server exposing clean JSON endpoints consumed by the frontend.

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/teams` | All teams with ratings, Elo, form, squad stats |
| GET | `/api/team/:id` | Single team full profile |
| GET | `/api/fixtures` | Full fixture list with match status |
| GET | `/api/match/:teamA/:teamB` | Dixon-Coles prediction for any matchup |
| POST | `/api/simulate` | Body: `{ numSims, lockedResults? }` → Monte Carlo run |
| GET | `/api/bracket` | Current bracket state |
| POST | `/api/refresh` | Invalidate all caches and re-fetch |

### Tasks
- [x] Express server with CORS enabled for local frontend dev.
- [x] Request validation middleware (team ID lookup, numSims bounds 100–50,000).
- [x] Graceful fallback: serve stale cache with stale fallback on data fetch failure (handled by data layer).
- [x] Wire up all routes to the Phase 1+2 data/model layer.
- [x] Pre-warm data + model cache on server startup.

### Files delivered
```
backend/server.js
backend/routes/teams.js
backend/routes/matches.js
backend/routes/simulate.js
backend/middleware/validate.js
```

### Validation results
- `GET /api/team/FRA` → full profile: elo 1810.8, attack 0.784, defense −0.583, form 89, last5 WWWWD ✅
- `GET /api/match/FRA/ARG` → xG 1.17–1.09, W/D/L 36/32/32%, top score 1-1 (15%) ✅
- `POST /api/simulate` (1,000 sims) → FRA 13.6%, ARG 12.8%, winner sum = 1.0 in 90ms ✅
- `GET /api/fixtures` → 104 fixtures ✅
- `GET /api/teams` → 48 teams ✅
- Validation errors: unknown team → 400, numSims out of range → 400 ✅

---

## Phase 4 — Frontend MVP (target June 9)

Goal: all four views working against the live backend.

### 4a — Team Dashboard
- Sortable table: all 48 teams with attack, defense, Elo, form score, market value, group.
- Bar chart: attack vs. defense for selected team vs. group opponents.
- "Path to final" breakdown (R16 → QF → SF → Final → Winner probabilities).

### 4b — Match Predictions
- All 104 fixtures with date, teams, xG, W/D/L%, status badge (upcoming/live/completed).
- Expand row → score probability histogram (top 10 most likely scorelines).

### 4c — Bracket Simulator
- Visual 48→32→16→8→4→2→1 bracket with probability overlays.
- "Run 10,000 simulations" button → spinner → live probability update.
- Completed matches locked in with real scores.

### 4d — Scenario Explorer
- Lock any group match result (force win/draw/loss).
- Recalculate knockout probabilities via `/api/simulate` with `lockedResults`.
- Side-by-side comparison: baseline vs. scenario.

### Tech stack
- Vanilla JS + Chart.js; hand-rolled SVG for the bracket tree.
- Single `index.html` + `app.js` + `styles.css` + `charts.js`.

---

## Phase 5 — Live Tournament Mode (June 11 onward)

Goal: real-time result ingestion once the tournament is live.

- [ ] Poll match results every 15 minutes during match windows.
- [ ] Lock completed results into `lockedResults` simulation seed.
- [ ] Recalculate and cache probabilities after each match completes.
- [ ] Show probability-swing delta badges (e.g. "+12% France to win").
- [ ] "Last updated" timestamp on all probability displays.

---

## Phase 6 — Knockout Stage Polish (July 4)

- [ ] Refine penalty shootout model (per-team historical shootout win rates).
- [ ] Calibration view: model-predicted vs. actual outcomes so far.
- [ ] Shareable bracket URL (encode scenario as query params).

---

## Risk Register

| Risk | Likelihood | Impact | Status |
|------|-----------|--------|--------|
| External API goes down | Medium | High | ✅ Mitigated — stale-cache fallback; no critical API (martj42 is GitHub CDN) |
| 48-team 3rd-place selection edge cases | High | Medium | ✅ Mitigated — implemented points→GD→GF ranking |
| Monte Carlo too slow | Low | Medium | ✅ Mitigated — 10k sims in ~1s server-side |
| Sparse historical data for small teams | Medium | Medium | ✅ Mitigated — L2 prior pulls toward pool mean; Elo/market-value prior adds signal |
| Model not calibrated before tournament | Low | High | ✅ Mitigated — Phase 2 complete May 15 (2+ weeks ahead of target) |
| Fixture data error | Low | High | ✅ Fixed — Group J Colombia→Jordan bug caught during squad stats cross-check |

---

## Definition of Done

- All 4 frontend views render correctly against live backend.
- `/api/simulate` returns results in < 3 seconds for N = 10,000.
- All tournament winner probabilities sum to 1.0 (±1e-6).
- No unhandled promise rejections; stale-cache fallback tested.
- Deployed and accessible before June 11 kick-off.
