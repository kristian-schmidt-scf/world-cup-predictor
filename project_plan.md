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
| 4+ | Post-MVP enhancements | May 17–31 | ✅ Done |
| 5 | Live tournament mode (real-time updates) | June 11 | ⬜ Planned |
| 6 | Knockout-stage predictions | July 4 | ⬜ Planned |

---

## Phase 1 — Data Layer ✅ Complete (May 15)

Goal: reliable, cached access to all data the models need.

### Tasks
- [x] **Fixtures** — Hard-coded from the Dec 5, 2025 FIFA draw. 72 group-stage matches (12 groups × 6) + 32 knockout slots = 104 total fixtures. Group dates June 11–25.
- [x] **Team data** — All 48 WC 2026 teams with FIFA ranking, ranking points, confederation, and group assignment. Confirmed from official draw; Group J bug caught and fixed (Jordan, not Colombia).
- [x] **Historical results** — International matches since 2010 from the [martj42/international_results](https://github.com/martj42/international_results) GitHub CSV. No API key required. 24h cache TTL with stale fallback. Full all-time dataset also fetched separately for H2H display.
- [x] **Elo ratings** — Computed from match history using tournament-weighted K-factors (WC=60, qualifiers=50, friendlies=20) and goal-difference multiplier.
- [x] **Recent form** — Last 10 matches per team with exponential time-decay (decay rate 0.15). Outputs formScore 0–100, W/D/L record, avg GF/GA, last5 string.
- [x] **Squad market values** — Total squad value in €M for all 48 teams (Transfermarkt, May 2026).
- [x] **Squad average age** — Official projected roster ages for all 48 teams (RotoWire, May 2026).
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
```

---

## Phase 2 — Modeling Layer ✅ Complete (May 15)

Goal: working attack/defense ratings and per-match outcome probabilities.

### 2a — Hierarchical Bayesian Estimation ✅
- [x] Prior initialisation blending four signals: Elo (weight 0.35), log market value (0.15), squad age quadratic bonus (peak at 26.5 years), Elo-derived defense proxy.
- [x] Iterative coordinate-ascent MLE: alternates attack and defense updates until convergence (~20 iterations, <100ms).
- [x] L2 regularisation toward prior (λ = 0.02) — the hierarchical pooling component.
- [x] Exponential time-decay on match weights (half-life 548 days ≈ 1.5 years).
- [x] Identifiability normalisation: mean(δ) = 0 after each iteration.
- [x] `estimateParamsDCOnly()` — Elo-seeded prior only, no MLE fitting (used by model comparison).
- [x] `getEloMap()` — raw Elo ratings formatted for the Elo-only simulation mode.

### 2b — Dixon-Coles Poisson Model ✅
- [x] Expected goals: `λ_{i→j} = exp(α_i + δ_j)` at neutral venue.
- [x] Full score probability matrix P(i goals, j goals) for i,j ∈ [0,10].
- [x] Dixon-Coles τ correction: ρ = −0.13.
- [x] Win/draw/loss probabilities summed from score matrix.
- [x] Fast Poisson sampler (Knuth algorithm) for Monte Carlo.

### 2c — Tournament Simulation (Monte Carlo) ✅
- [x] Group stage: round-robin 6 matches per group; 3/1/0 points; tiebreakers: GD → GF.
- [x] 8 best 3rd-place teams ranked by points → GD → GF across all 12 groups.
- [x] Knockout: 90-min result; draws → extra time (0.35× scoring rate) → 50/50 penalty shootout.
- [x] R32 bracket (32 teams): 8 group winners vs 8 best thirds; 4 winners vs 4 runners-up; 4 runners-up cross-bracket.
- [x] `lockedResults` map: override any group match with real scores.
- [x] **Model mode parameter** — `runMonteCarlo()` accepts `model: 'full' | 'dc' | 'elo'`.
- [x] **Elo-only match simulation** — `eloSimulateMatch()` using logistic win formula; draw rate tapers with Elo gap; Poisson goal counts for tiebreakers.
- [x] **`runMonteCarloCompare()`** — runs all three models and returns divergence table sorted by winner% spread.
- [x] 1,000 sims in ~100ms; 10,000 sims in ~1 second.

### Files delivered
```
backend/models/hierarchicalBayesian.js
backend/models/dixonColes.js
backend/models/tournamentSimulation.js
backend/models/test.js
```

---

## Phase 3 — Backend API ✅ Complete (May 15, extended through May 31)

Goal: Express server exposing clean JSON endpoints consumed by the frontend.

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/teams` | All teams with ratings, Elo, form, squad stats |
| GET | `/api/team/:id` | Single team full profile |
| GET | `/api/fixtures` | Full fixture list with match status |
| GET | `/api/match/:teamA/:teamB` | Dixon-Coles prediction + H2H record |
| POST | `/api/simulate` | `{ numSims, model?: 'full'\|'dc'\|'elo', lockedResults? }` → Monte Carlo run |
| POST | `/api/simulate/compare` | `{ numSims? }` → all three models + divergence table |
| GET | `/api/bracket` | Current bracket state |
| GET | `/api/results` | All locked real match results |
| POST | `/api/results` | Lock a result: `{ matchId, goalsA, goalsB }` |
| DELETE | `/api/results/:matchId` | Unlock a result |
| POST | `/api/refresh` | Invalidate all caches and re-fetch |
| GET | `/api/fantasy/players` | 720 players enriched with xPts, xptsGroupStage, xptsKnockout |
| GET | `/api/fantasy/optimise` | Optimal 15-player squad within $100M budget |
| GET | `/api/history` | Filterable paginated match archive |
| GET | `/api/history/curated` | Top-5 highest-scoring and biggest-upset matches |

### Files delivered
```
backend/server.js
backend/routes/teams.js
backend/routes/matches.js
backend/routes/simulate.js
backend/routes/results.js
backend/routes/fantasy.js
backend/routes/history.js
backend/middleware/validate.js
backend/data/results.js
```

---

## Phase 4 — Frontend MVP ✅ Complete (May 16)

Goal: all four views working against the live backend.

### 4a — Team Dashboard ✅
- [x] Sortable table: all 48 teams with attack, defense, Elo, form score, market value, group.
- [x] Country flags, expandable team detail panel.
- [x] "Path to final" breakdown (R16 → QF → SF → Final → Winner probabilities).
- [x] Tournament path Sankey flow diagram; two-team comparison mode.

### 4b — Match Predictions ✅
- [x] All group fixtures with date, teams, xG, W/D/L%, status badge.
- [x] Status badges: countdown → LIVE pulse during match window → FT with score.
- [x] Expand row → match detail panel: expected goals, win/draw/loss%, score heatmap.
- [x] Head-to-head record overlay: all-time meetings, last 5 results, model-vs-H2H divergence.
- [x] Result locking: lock any group match score; persists to server, seeds simulation.

### 4c — Bracket Simulator ✅
- [x] Visual bracket with probability overlays.
- [x] Model selector (Full Bayesian / Dixon-Coles / Elo Only) in toolbar.
- [x] Compare Models button → divergence panel (top 15 teams by spread).
- [x] Completed matches locked in with real scores.
- [x] Bracket Creator — step-through wizard to build your own bracket pick.
- [x] Prediction leaderboard — submit picks; scored against real results.
- [x] Social share card generator.

### 4d — Scenario Explorer ✅
- [x] Lock any group match result (force win/draw/loss scores).
- [x] Recalculate knockout probabilities via `/api/simulate` with `lockedResults`.
- [x] Baseline vs. scenario comparison; real results always take precedence.
- [x] Shareable scenario URLs via `?s=` query param.

### 4e — Fantasy WC 2026 ✅
- [x] 720-player static table (`players.js`) — positions and prices from official FIFA Fantasy game.
- [x] Individual career stats (`playerStats.js`) — curated for all 69 players priced ≥ $7M.
- [x] xPts projection engine (`fantasyEngine.js`) — group-stage xG + knockout stage probs; per-player `getPApp60()` from `minsPerMatch`; α=0.60 blend of team model with individual stats.
- [x] Two-phase squad optimiser — greedy by raw xPts with look-ahead budget guard + upgrade-swap pass.
- [x] Squad Builder tab — pitch view + player browser + budget bar + Clear all button.
- [x] My Team tab — xPts table, captain selector (×2 multiplier), chip display.
- [x] Optimise tab — "Find Best Squad" button fills pitch from optimiser.
- [x] Note: player positions to be re-verified after official squad announcements (June 2, 2026).

### Files delivered (Phase 4+)
```
frontend/index.html
frontend/app.js
frontend/charts.js
frontend/sankey.js
frontend/styles.css
frontend/favicon.svg
frontend/i18n.js
backend/data/computeH2H.js
backend/data/players.js
backend/data/playerStats.js
backend/models/fantasyEngine.js
backend/routes/fantasy.js
backend/routes/history.js
```

### Post-MVP enhancements delivered

| Issue | Feature | PR | Date |
|-------|---------|-----|------|
| #1 | Manual result locking (persistent, seeds simulation) | #35 | May 17 |
| #3 | Match countdown timers + LIVE pulse badges | #36 | May 17 |
| #7 | Head-to-head record overlay in match detail panel | #37 | May 17 |
| — | Full all-time H2H history dataset | #38 | May 17 |
| #15 | Visual SVG knockout bracket tree with probability overlays | #39 | May 18 |
| #16 | Simulated group standings table | #42 | May 18 |
| — | Bilingual EN/DE UI; German team names; localStorage persistence | #43 | May 18 |
| #20 | Tournament path Sankey flow diagram; two-team comparison | #44 | May 19 |
| #12 | Shareable scenario URLs via `?s=` param | #45 | May 19 |
| #32 | Group of Death rankings tab | #46 | May 19 |
| #19 | Score probability heatmap; Heatmap/Bar toggle | #47 | May 19 |
| #31 | Upset detector — toast notification + chaos score + upsets feed | #48 | May 19 |
| #30 | History tab — filterable archive, curated matches, CSV export | #49 | May 19 |
| #27 | Social share card generator in Bracket tab | #50 | May 19 |
| #28 | Prediction leaderboard with pick submission and scoring | #51 | May 19 |
| #52 | Bracket creator with official WC 2026 seeding rules + thirds picker | — | May 19 |
| #53–56 | Fantasy WC 2026 module (squad builder, projections, optimiser, per-player stats) | #57 | May 30 |
| #9 | Model comparison mode — Elo-only, Dixon-Coles, Full Bayesian | #59 | May 31 |
| — | Soccer ball SVG favicon (dark navy + gold seam lines) | — | May 31 |

---

## Phase 5 — Live Tournament Mode (June 11 onward)

Goal: real-time result ingestion once the tournament is live.

- [ ] Poll match results every 15 minutes during match windows.
- [ ] Lock completed results into `lockedResults` simulation seed.
- [ ] Recalculate and cache probabilities after each match completes.
- [ ] Show probability-swing delta badges (e.g. "+12% France to win").
- [ ] "Last updated" timestamp on all probability displays.

**Pre-tournament action item:** Re-verify `players.js` positions and prices against the official FIFA Fantasy game after squad announcements (June 2, 2026). Update `playerStats.js` for any newly added high-value players.

---

## Phase 6 — Knockout Stage Polish (July 4)

- [ ] Refine penalty shootout model (per-team historical shootout win rates).
- [ ] Calibration view: model-predicted vs. actual outcomes so far.
- [x] Shareable bracket/scenario URL — delivered as issue #12, PR #45.

---

## Open Issues (GitHub)

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 2 | Live score API integration | High | High |
| 4 | Push notifications for match results | High | Medium |
| 5 | Exportable/shareable predictions | High | Medium |
| 8 | Per-team historical shootout data (replace 50/50 model) | Medium | Medium |
| 58 | Improve squad optimiser (multi-swap pass, random restarts) | Medium | Low |

Recently closed: #1, #3, #7, #9, #12, #15, #16, #19, #20, #27, #28, #30, #31, #32, #52, #53, #54, #55, #56.

See GitHub Issues for the full list with detailed specs.

---

## Risk Register

| Risk | Likelihood | Impact | Status |
|------|-----------|--------|--------|
| External API goes down | Medium | High | ✅ Mitigated — stale-cache fallback; martj42 is GitHub CDN |
| 48-team 3rd-place selection edge cases | High | Medium | ✅ Mitigated — points→GD→GF ranking implemented |
| Monte Carlo too slow | Low | Medium | ✅ Mitigated — 10k sims in ~1s server-side |
| Sparse historical data for small teams | Medium | Medium | ✅ Mitigated — L2 prior; Elo/market-value prior adds signal |
| Model not calibrated before tournament | Low | High | ✅ Mitigated — Phase 2 complete May 15 |
| Fixture data error | Low | High | ✅ Fixed — Group J Colombia→Jordan caught during squad stats check |
| Fantasy player positions incorrect pre-squad-announcement | Medium | Medium | ⚠️ Pending — official squads announced June 2; `players.js` to be re-verified |

---

## Definition of Done

- All frontend views render correctly against live backend. ✅
- `/api/simulate` returns results in < 3 seconds for N = 10,000. ✅
- All tournament winner probabilities sum to 1.0 (±1e-6). ✅
- No unhandled promise rejections; stale-cache fallback tested. ✅
- Deployed and accessible before June 11 kick-off. ⬜ Pending deployment
