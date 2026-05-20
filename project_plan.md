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
| 4 | Frontend MVP (all 4 views) | June 9 | ✅ Done (May 16) |
| 5 | Live tournament mode (real-time updates) | June 11 | ⬜ Planned |
| 6 | Knockout-stage predictions | July 4 | ⬜ Planned |

---

## Phase 1 — Data Layer ✅ Complete (May 15)

Goal: reliable, cached access to all data the models need.

### Tasks
- [x] **Fixtures** — Hard-coded from the Dec 5, 2025 FIFA draw. 72 group-stage matches (12 groups × 6) + 32 knockout slots = 104 total fixtures. Group dates June 11–25 (approximate official schedule).
- [x] **Team data** — All 48 WC 2026 teams with FIFA ranking, ranking points, confederation, and group assignment. Confirmed from official draw; Group J bug caught and fixed (Jordan, not Colombia).
- [x] **Historical results** — International matches since 2010 from the [martj42/international_results](https://github.com/martj42/international_results) GitHub CSV. No API key required. 24h cache TTL with stale fallback. Full all-time dataset also fetched separately for H2H display (see Phase 4 enhancements).
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
- **History window**: 2010–present for model fitting (7,000+ matches). Longer window gives better Elo calibration; form uses last 10 matches regardless.
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

## Phase 3 — Backend API ✅ Complete (May 15, extended May 19)

Goal: Express server exposing clean JSON endpoints consumed by the frontend.

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/teams` | All teams with ratings, Elo, form, squad stats |
| GET | `/api/team/:id` | Single team full profile |
| GET | `/api/fixtures` | Full fixture list with match status |
| GET | `/api/match/:teamA/:teamB` | Dixon-Coles prediction + H2H record for any matchup |
| POST | `/api/simulate` | Body: `{ numSims, lockedResults? }` → Monte Carlo run |
| GET | `/api/bracket` | Current bracket state |
| GET | `/api/results` | All locked real match results |
| POST | `/api/results` | Lock a result: `{ matchId, goalsA, goalsB }` |
| DELETE | `/api/results/:matchId` | Unlock a result |
| POST | `/api/refresh` | Invalidate all caches and re-fetch |
| GET | `/api/history` | Filterable paginated match archive (`team`, `opponent`, `tournament`, `year_from`, `year_to`, `result`, `page`, `page_size`) |
| GET | `/api/history/curated` | Top-5 highest-scoring and biggest-upset matches (Elo-gap ranked) |

### Tasks
- [x] Express server with CORS enabled for local frontend dev.
- [x] Request validation middleware (team ID lookup, numSims bounds 100–50,000).
- [x] Graceful fallback: serve stale cache with stale fallback on data fetch failure (handled by data layer).
- [x] Wire up all routes to the Phase 1+2 data/model layer.
- [x] Pre-warm data + model cache on server startup.
- [x] Result locking endpoints with persistent JSON file store.
- [x] Static frontend serving via `express.static`.

### Files delivered
```
backend/server.js
backend/routes/teams.js
backend/routes/matches.js
backend/routes/simulate.js
backend/routes/results.js
backend/middleware/validate.js
backend/data/results.js
```

### Validation results
- `GET /api/team/FRA` → full profile: elo 1810.8, attack 0.784, defense −0.583, form 89, last5 WWWWD ✅
- `GET /api/match/FRA/ARG` → xG 1.17–1.09, W/D/L 36/32/32%, top score 1-1 (15%), H2H 13 meetings ✅
- `POST /api/simulate` (1,000 sims) → FRA 13.6%, ARG 12.8%, winner sum = 1.0 in 90ms ✅
- `GET /api/fixtures` → 104 fixtures ✅
- `GET /api/teams` → 48 teams ✅
- Validation errors: unknown team → 400, numSims out of range → 400 ✅

---

## Phase 4 — Frontend MVP ✅ Complete (May 16)

Goal: all four views working against the live backend.

### 4a — Team Dashboard ✅
- [x] Sortable table: all 48 teams with attack, defense, Elo, form score, market value, group.
- [x] Country flags (flagcdn.com PNG images; ISO alpha-2 codes mapped from FIFA 3-letter codes).
- [x] "Path to final" breakdown (R16 → QF → SF → Final → Winner probabilities) from Monte Carlo simulation.
- [x] Expandable team detail panel.

### 4b — Match Predictions ✅
- [x] All group fixtures with date, teams, xG, W/D/L%, status badge.
- [x] Status badges: countdown to kick-off → LIVE pulse during match window → FT with score.
- [x] Expand row → match detail panel: expected goals, win/draw/loss%, probability bar, score histogram.
- [x] Head-to-head record overlay: all-time meetings, last 5 results with W/D/L badges, model-vs-H2H divergence note.
- [x] Result locking: lock any group match score; persists to server, seeds simulation automatically.
- [x] Scenario locks: hypothetical overrides in Scenario Explorer (separate from real locked results).

### 4c — Bracket Simulator ✅
- [x] Visual bracket with probability overlays.
- [x] "Run Simulation" button → spinner → live probability update.
- [x] Completed matches locked in with real scores.

### 4d — Scenario Explorer ✅
- [x] Lock any group match result (force win/draw/loss scores).
- [x] Recalculate knockout probabilities via `/api/simulate` with `lockedResults`.
- [x] Baseline vs. scenario comparison; real results always take precedence over scenario locks.

### Files delivered
```
frontend/index.html
frontend/app.js
frontend/charts.js             (createScoreHeatmap added May 19)
frontend/sankey.js             (pure SVG Sankey diagram, added May 17)
frontend/styles.css
backend/data/computeH2H.js
backend/data/fetchMatches.js   (fetchAllMatches + fetchShootouts added)
backend/routes/history.js      (GET /api/history + /api/history/curated, added May 19)
```

### Post-MVP enhancements (delivered May 16–19)

| Issue | Feature | PR |
|-------|---------|-----|
| #1 | Manual result locking (persistent, seeds simulation) | #35 |
| #3 | Match countdown timers + LIVE pulse badges | #36 |
| #7 | Head-to-head record overlay in match detail panel | #37 |
| — | Full all-time H2H history (separate from 2010+ model dataset) | #38 |
| #15 | Visual SVG knockout bracket tree with probability overlays + Tree/Table toggle | #39 |
| #16 | Simulated group standings table (avg pts, avg GD, finish probabilities) below each group's fixtures | #42 |
| — | Bilingual EN/DE UI with language toggle; German team names; preference persisted in localStorage | #43 |
| #20 | Tournament path Sankey flow diagram in team detail panel; two-team comparison mode | #44 |
| #12 | Shareable scenario URLs via `?s=` query param; Copy Link + Share buttons | #45 |
| #32 | Group of Death rankings tab — composite strength/competitiveness scores for all 12 groups | #46 |
| #19 | Score probability heatmap replacing top-10 bar chart; Heatmap/Bar toggle | #47 |
| #31 | Upset detector — toast notification + tournament upsets feed + running chaos score | #48 |
| #30 | History tab — filterable match archive (7,500+ records), curated greatest matches, CSV export, penalty shootout annotations | #49 |

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
- [x] Shareable bracket/scenario URL (encode scenario as query params) — delivered as issue #12, PR #45.

---

## Open Issues (GitHub)

Selected high-impact items remaining:

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 2 | Live score API integration | High | High |
| 4 | Push notifications for match results | High | Medium |
| 5 | Exportable/shareable predictions | High | Medium |
| 6 | Social sharing cards | High | Low |
| 8 | Per-team historical shootout data (replace 50/50 model) | Medium | Medium |
| 20 | Mobile-responsive layout | High | Medium |
| 33 | Expected goals trend chart per team | Medium | Low |

Recently closed: #1, #3, #7, #12, #15, #16, #19, #20, #30, #31, #32.

See GitHub Issues for the full list with detailed specs.

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

- All 4 frontend views render correctly against live backend. ✅
- `/api/simulate` returns results in < 3 seconds for N = 10,000. ✅
- All tournament winner probabilities sum to 1.0 (±1e-6). ✅
- No unhandled promise rejections; stale-cache fallback tested. ✅
- Deployed and accessible before June 11 kick-off. ⬜ Pending deployment
