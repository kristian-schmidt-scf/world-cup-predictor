# World Cup 2026 Predictor — Project Plan

**Today:** 2026-05-14  
**Tournament start:** 2026-06-11 (Group Stage, Day 1)  
**Tournament final:** 2026-07-19  
**Time to build:** ~4 weeks before live data matters

---

## Milestones at a Glance

| # | Milestone | Target |
|---|-----------|--------|
| 1 | Data layer working (APIs + static fixtures) | May 21 |
| 2 | Models implemented & calibrated | May 28 |
| 3 | Backend API complete | June 4 |
| 4 | Frontend MVP (all 4 views) | June 9 |
| 5 | Live tournament mode (real-time updates) | June 11 |
| 6 | Knockout-stage predictions | July 4 |

---

## Phase 1 — Data Layer (May 14–21)

Goal: reliable, cached access to all data the models need.

### Tasks
- [ ] **Fixtures** — Scrape/fetch the 2026 World Cup group schedule and bracket structure; store as static JSON (`fixtures.json`). Includes: 48 group-stage matches, 16 knockout slots, team-to-group mapping.
- [ ] **Team rankings** — Fetch current FIFA World Rankings (or equivalent) as the baseline attack/defense prior. Map FIFA ranking points → initial strength estimate.
- [ ] **Historical results** — Pull last 3–4 years of international match results (home, away, goals) for model calibration. Target: `football-data.org` free tier or equivalent.
- [ ] **Cache layer** — File-based JSON cache (`/backend/data/cache/`) with timestamps. Refresh on startup if stale; expose a `/refresh` endpoint.
- [ ] **Data validation** — Confirm all 48 WC teams present, fixture dates parseable, no duplicate match IDs.

### Files
```
backend/data/fetchFixtures.js
backend/data/fetchTeams.js
backend/data/fetchMatches.js
backend/data/cache.js
backend/data/cache/fixtures.json
backend/data/cache/teams.json
backend/data/cache/matches.json
```

### Decisions to make
- Which API for historical results? (`football-data.org` is free + documented; SofaScore requires scraping)
- How far back for calibration? Recommend 3 years (~2023–2026); older data decays relevance.

---

## Phase 2 — Modeling Layer (May 21–28)

Goal: working attack/defense ratings and per-match outcome probabilities.

### 2a — Hierarchical Bayesian Estimation
- [ ] Initialize each team's attack (α) and defense (δ) strength from FIFA ranking baseline.
- [ ] Fit pooled priors across all teams (Normal hyperprior on μ_α, μ_δ with weakly informative SD).
- [ ] Update posteriors using historical match results (MLE or MCMC-lite via iterative reweighting).
- [ ] Output: `{ team, attack, defense, attack_ci, defense_ci }` per team.
- [ ] Time-decay weighting: recent matches weighted more heavily (exponential decay, half-life ~18 months).

### 2b — Dixon-Coles Poisson Model
- [ ] Per-match expected goals: `λ_home = α_home × δ_away × γ` (γ = home advantage, set to 1.0 for neutral venues).
- [ ] Simulate goal distributions via Poisson PMF.
- [ ] Apply Dixon-Coles low-score correction (ρ ≈ 0.1) for 0-0 and 1-1.
- [ ] Output per match: `{ xg_team1, xg_team2, p_win, p_draw, p_loss, score_distribution }`.

### 2c — Tournament Simulation (Monte Carlo)
- [ ] Group stage: round-robin, 3 points for win / 1 for draw; tiebreakers by GD then GF.
- [ ] Advance top 2 per group + 8 best third-placed teams (WC 2026 48-team format).
- [ ] Knockout stage: single-elimination; draw allowed in 90 min → extra time → penalty shootout (each modeled probabilistically).
- [ ] Run N = 10,000 full simulations; aggregate into advancement probability tables.
- [ ] Seed with current real results once tournament starts (lock completed matches).

### Files
```
backend/models/hierarchicalBayesian.js
backend/models/dixonColes.js
backend/models/tournamentSimulation.js
```

### Validation checkpoints
- Attack/defense ratings should correlate with FIFA rankings (Spearman r > 0.7).
- Predicted group-winner probabilities for top sides (France, Brazil, England, Argentina) should be >40%.
- Sanity check all-tournament winner probabilities sum to exactly 1.0.

---

## Phase 3 — Backend API (May 28–June 4)

Goal: Express server exposing clean JSON endpoints consumed by the frontend.

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/teams` | All teams with attack/defense ratings |
| GET | `/api/team/:id` | Single team with full stats |
| GET | `/api/fixtures` | Full fixture list with status (upcoming/completed) |
| GET | `/api/match/:team1/:team2` | Dixon-Coles prediction for a specific matchup |
| POST | `/api/simulate` | Body: `{ numSims, lockedResults? }` → Monte Carlo run |
| GET | `/api/bracket` | Current bracket state (real + simulated) |
| POST | `/api/refresh` | Force re-fetch all external data |

### Infrastructure
- [ ] Express server with CORS enabled for local frontend dev.
- [ ] Request validation middleware (team IDs, numSims bounds 100–50,000).
- [ ] In-memory simulation cache: invalidate if team ratings updated.
- [ ] Graceful fallback: if external API fails, serve last-good cached data with `stale: true` flag.

### Files
```
backend/server.js
backend/routes/teams.js
backend/routes/matches.js
backend/routes/simulate.js
backend/middleware/validate.js
```

---

## Phase 4 — Frontend MVP (June 4–9)

Goal: all four views working against the live backend.

### 4a — Team Dashboard
- Sortable table: all 48 teams, attack rating, defense rating, group, current win probability.
- Bar chart: attack vs. defense for selected team vs. group opponents.
- "Path to final" probability breakdown (group → R16 → QF → SF → F → Winner).

### 4b — Match Predictions
- Table of all 104 fixtures (48 group + 56 knockout slots).
- Per row: date, teams, xG, W/D/L%, status badge (upcoming / live / completed).
- Click row → expand to goal probability histogram.

### 4c — Bracket Simulator
- Visual bracket: groups on left, knockout tree on right.
- Probability overlays: heatmap on team tiles (green = high advancement chance).
- "Run 10,000 simulations" button → spinner → update all probabilities in place.
- Completed matches shown with actual score; locked from simulation.

### 4d — Scenario Explorer
- Toggle any group match result (force win/draw/loss).
- Recalculate knock-out probabilities instantly with locked results passed to `/api/simulate`.
- Side-by-side comparison: baseline vs. scenario.

### Tech stack
- Vanilla JS (no framework) to keep build tooling minimal.
- Chart.js for bar/histogram charts; hand-rolled SVG for the bracket tree.
- Single `index.html` + `app.js` + `styles.css` + `charts.js`.

### Files
```
frontend/index.html
frontend/app.js
frontend/charts.js
frontend/styles.css
```

---

## Phase 5 — Live Tournament Mode (June 11 onward)

Goal: real-time result ingestion once the tournament is live.

- [ ] Poll match results API every 15 minutes during match windows.
- [ ] Lock completed match results into simulation seed state.
- [ ] Recalculate and cache new tournament probabilities after each match completes.
- [ ] Highlight probability swings in the UI (delta badge: "+12% France to win").
- [ ] Add "Last updated" timestamp to all probability displays.

---

## Phase 6 — Knockout Stage Polish (July 4)

- [ ] Refine penalty shootout probability model (historical shootout data by team).
- [ ] Add calibration view: model-predicted vs. actual outcomes so far.
- [ ] Export bracket state as shareable URL (encode scenario as query params).

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| External API rate-limits or goes down | Medium | High | File cache fallback; mirror to local JSON |
| 48-team WC format edge cases (8 best 3rd-place teams) | High | Medium | Implement tiebreaker logic in Phase 2; test with 2026 group draw |
| Monte Carlo too slow in browser | Low | Medium | Run server-side; stream partial results |
| Historical data sparse for some CONCACAF/OFC teams | Medium | Medium | Fall back to FIFA ranking prior with wider CI |
| Model not calibrated before tournament starts | Low | High | Complete Phase 2 by May 28 with validation checkpoint |

---

## Definition of Done

- All 4 frontend views render correctly against live backend.
- `/api/simulate` returns results in < 3 seconds for N = 10,000.
- All tournament winner probabilities sum to 1.0 (±1e-6).
- No unhandled promise rejections; stale-cache fallback tested.
- Deployed and accessible before June 11 kick-off.
