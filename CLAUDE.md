# World Cup 2026 Prediction Tool

## Overview
Interactive web-based tool for predicting World Cup 2026 outcomes using hierarchical Bayesian estimation and Dixon-Coles Poisson modeling. Full Monte Carlo tournament simulation with interactive dashboard, Fantasy WC module, model comparison mode, and real-time live score Ticker.

## Prediction Scope
- **Tournament winner**: Probability distribution over all 48 teams
- **Group stage outcomes**: Qualification probabilities, group winner predictions
- **Match-by-match predictions**: Expected goals, win/draw/loss probabilities, score distribution matrix
- **Interactive scenario simulation**: "What-if" tournament bracket exploration
- **Fantasy WC 2026**: Squad builder, per-player xPts projections, squad optimiser

## Architecture

### Backend (Node.js)

#### Data Layer (`backend/data/`)

| File | Purpose |
|------|---------|
| `teams.js` | Static: all 48 WC 2026 teams with FIFA rank, confederation, group (Dec 2025 draw) |
| `fixtures.js` | Static: 72 group-stage + 32 knockout fixture slots; group dates June 11–25 |
| `fetchMatches.js` | Fetches historical international results from martj42/international_results (GitHub CSV, no key needed); 7,294 matches since 2010 |
| `computeElo.js` | Derives Elo ratings from match history using tournament-weighted K-factors (WC=60, qualifiers=50, friendlies=20) and goal-diff multiplier |
| `computeForm.js` | Recent form: last 10 matches with exponential time-decay (decay rate 0.15); outputs formScore 0–100, last5 string, avg GF/GA |
| `computeH2H.js` | Head-to-head record between any two teams from the full all-time dataset |
| `fetchSquadStats.js` | Squad market values (€M, Transfermarkt May 2026) and avg squad ages (RotoWire) for all 48 teams |
| `players.js` | Static: 720 fantasy players (48 teams × 15), positions and prices from official FIFA Fantasy WC 2026 |
| `playerStats.js` | Individual international career stats for 69 players priced ≥ $7M: goalsPerMatch, assistsPerMatch, yellowsPerMatch, minsPerMatch |
| `fetchLiveScores.js` | Live WC scores from football-data.org (free tier) + goalscorer/assist enrichment from api-football.com; in-memory cache with adaptive TTLs (60s live, 5min finished, 24h past); robust fixture matching (20-min time window + team-name fallback); Eastern Time date boundaries |
| `results.js` | Persistent locked match results (JSON file store, survives server restarts) |
| `cache.js` | File-based JSON cache under `backend/data/cache/`; TTL per key, stale-fallback on network failure |
| `index.js` | Unified exports; run directly to pre-warm all caches (`npm run data:fetch`) |

**Data freshness:**
- Match results: 24h TTL (re-fetched from GitHub CSV daily)
- Elo / form: 24h TTL (recomputed from cached matches)
- Squad stats: 30-day TTL (stable pre-tournament)
- Fantasy projections: 24h TTL (keyed `fantasy_projections`)
- Fixtures / teams / players: static (no TTL)
- Live scores (`fetchLiveScores.js`, in-memory only): 60s TTL if any match live; 30s if paused; 10min if all finished; 5min otherwise
- api-football fixture lists: 24h for past UTC dates; 4h for current/future; empty results never cached (retry on next request)
- api-football goal events: 24h for finished matches (only cached when events > 0); 5min while live

#### Modeling Layer (`backend/models/`)

**Hierarchical Bayesian Estimation** (`hierarchicalBayesian.js`)
- Parameters: attack α and defense δ per team (log-linear; λ = exp(α_attack + δ_defense))
- Initialisation: blends four signals — Elo (weight 0.35), log market value (0.15), squad age quadratic bonus (peak at 26.5), Elo defense proxy
- Fitting: iterative coordinate-ascent MLE on historical WC-team-vs-WC-team matches
- Time decay: exponential, half-life 548 days (~1.5 years)
- Regularisation: L2 toward prior (λ_reg = 0.02) — the hierarchical pooling component
- Home advantage: 0.1 in log-space (neutralised for all WC matches)
- Converges in ~20 iterations (<100ms)
- `estimateParamsDCOnly(eloRatings)` — Elo-seeded prior only, no MLE (DC-only model)
- `getEloMap(eloRatings)` — raw Elo ratings formatted for the Elo-only simulation mode

**Dixon-Coles Poisson Model** (`dixonColes.js`)
- Per-match: score matrix P(i goals, j goals) up to 10×10
- Low-score τ correction: ρ = −0.13 (literature estimate; negative = more low-score draws than independent Poisson)
- Outputs: xgA, xgB, pWin, pDraw, pLoss, scoreMatrix, mostLikelyScore
- Fast Poisson sampler (Knuth algorithm) for Monte Carlo

**Fantasy Engine** (`fantasyEngine.js`)
- Scoring rules: official FIFA Fantasy WC 2026 points system (app60, goal, assist, cleanSheet, savePer3, goalConcededAfter1, card)
- Goal share constants: `{ GK:0.00, DEF:0.08, MID:0.25, FWD:0.67 }`
- Per-player appearance probability: `getPApp60(player)` — derived from `stats.minsPerMatch` via `(mins-20)/75` when individual data exists; falls back to price-tier proxy (bench GKs ~0.20, elite starters ~0.85)
- xPts blending: `α=0.60` on team-level model × `(1-α)=0.40` on individual historical rate (when `playerStats` available)
- Group stage: 3 fixtures per team using Dixon-Coles xG and clean-sheet probabilities
- Knockout stage: weighted by Monte Carlo stage-reaching probabilities (r16, qf, sf, final, winner)
- Optimiser: Phase 1 — greedy by raw xPts with look-ahead budget guard (MIN_PRICE floor); Phase 2 — iterative single-player upgrade-swap pass

**Tournament Simulation** (`tournamentSimulation.js`)
- Group stage: round-robin, 3/1/0 points, GD→GF tiebreakers
- 3rd-place selection: best 8 of 12 by points→GD→GF
- Knockout: 90-min result; draws → extra time (0.35× rate) → 50/50 penalty shootout
- R32 bracket: 8 group winners (A–H) vs 8 best thirds; 4 winners (I–L) vs runners-up; 4 runners-up cross-bracket
- **Three model modes** via `model` parameter:
  - `'full'` — Dixon-Coles with full Bayesian params (default)
  - `'dc'` — Dixon-Coles with Elo-only prior (no MLE fitting)
  - `'elo'` — logistic win formula; draw rate tapers with Elo gap; Poisson goal counts for tiebreakers
- `runMonteCarlo(n, params, lockedResults, model, eloMap)` — standard single-model run
- `runMonteCarloCompare(n, fullParams, dcParams, eloMap, lockedResults)` — all three models; returns divergence table sorted by winner% spread
- Monte Carlo: 10,000 sims in ~1 second; aggregates R16/QF/SF/Final/Winner probabilities
- `lockedResults` map overrides simulated group results with real scores
- `getCachedProbs()` / `setCachedProbs()` — module-level singleton reused by fantasy route

#### API Endpoints (`backend/server.js`, `backend/routes/`)
- `GET /api/teams` — all 48 teams with ratings, Elo, form, squad stats
- `GET /api/team/:id` — single team full profile
- `GET /api/fixtures` — all 104 fixtures with match status
- `GET /api/match/:teamA/:teamB` — Dixon-Coles prediction + H2H record for any matchup
- `POST /api/simulate` — body `{ numSims, model?: 'full'|'dc'|'elo', lockedResults? }` → Monte Carlo probabilities
- `POST /api/simulate/compare` — body `{ numSims? }` → all three models + divergence table
- `GET /api/bracket` — current bracket state
- `GET /api/results` — all locked real match results
- `POST /api/results` — lock a result: `{ matchId, goalsA, goalsB }`
- `DELETE /api/results/:matchId` — unlock a result
- `POST /api/refresh` — invalidate all caches and re-fetch
- `GET /api/fantasy/players` — all 720 players enriched with xptsTotal, xptsGroupStage, xptsKnockout, stats
- `GET /api/fantasy/optimise` — optimal 15-player squad within $100M budget
- `GET /api/history` — filterable, paginated match archive
- `GET /api/history/curated` — top-5 highest-scoring and biggest-upset matches
- `GET /api/ticker` — yesterday's results, today's live scores, tomorrow's fixtures (ET date boundaries); enriched with goalscorers + assists

### Frontend (`frontend/`)

#### Views

**Team Dashboard** — sortable table: attack/defense/Elo/form/market value; path-to-final breakdown; Sankey flow diagram; two-team comparison

**Match Predictions** — all 104 fixtures; per-row xG, W/D/L%, status badge; expand → score heatmap + H2H record overlay; result locking

**Tournament Bracket** — visual 48→32→16→8→4→2→1 bracket; model selector (Full Bayesian / Dixon-Coles / Elo Only); Compare Models → divergence panel; bracket creator wizard; prediction leaderboard; social share card

**Scenario Explorer** — lock any group match result; recalculate knockout probabilities; shareable `?s=` URL

**Group of Death** — composite strength/competitiveness rankings for all 12 groups; upset risk

**History** — filterable archive 7,500+ matches; curated sections; CSV export; penalty shootout annotations

**Fantasy WC 2026** — Squad Builder (pitch view + player browser + budget bar + Clear all); My Team (xPts table + captain selector); Optimise (best squad button)

**Ticker** — real-time WC match scores; three sections (Today → Tomorrow → Yesterday); live-dot animation; goal scorers + assists with minute, OWN GOAL / PENALTY tags; kickoff times in Eastern Time; auto-refresh every 60s while tab is open; EN/DE

#### Other frontend files
- `favicon.svg` — soccer ball favicon: dark navy ball, gold bezier seam lines
- `i18n.js` — EN/DE string table; `t()`, `getLang()`, `setLang()`, `teamName()` exports
- `charts.js` — Chart.js wrappers: score heatmap, attack/defense bar, score histogram
- `sankey.js` — pure SVG tournament path flow diagram

## Data Sources

| Data | Source | Key required? | Refresh cadence |
|------|--------|--------------|-----------------|
| Historical match results | [martj42/international_results](https://github.com/martj42/international_results) GitHub CSV | No | 24h |
| WC 2026 fixtures | Hard-coded from Dec 2025 FIFA draw | — | Static |
| WC 2026 teams / groups | Hard-coded from Dec 2025 FIFA draw | — | Static |
| Squad market values | Transfermarkt (via fetchSquadStats.js static table, May 2026) | No | Update monthly |
| Squad average age | RotoWire projected rosters (May 2026) | No | Update on squad announcement |
| Fantasy player prices/positions | Official FIFA Fantasy WC 2026 (play.fifa.com/fantasy) | No | Re-verify after June 2 squad announcements |
| Fantasy player career stats | FBref / Wikipedia (curated, 69 players ≥ $7M) | No | Static pre-tournament |
| Live WC scores | [football-data.org](https://www.football-data.org/) v4 free tier | Yes (`FOOTBALL_DATA_API_KEY`) | In-memory, adaptive TTL |
| Goal scorers + assists | [api-football.com](https://www.api-football.com/) v3 free tier (100 req/day) | Yes (`API_FOOTBALL_KEY`) | In-memory, adaptive TTL |

## Technical Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Elo K-factor (WC) | 60 | Dixon-Coles / eloratings.net standard |
| Elo K-factor (qualifiers) | 50 | |
| Elo K-factor (friendlies) | 20 | |
| Dixon-Coles ρ | −0.13 | Literature estimate for low-score correction |
| Time-decay half-life | 548 days | ~1.5 years |
| L2 regularisation λ | 0.02 | Hierarchical pooling strength |
| Home advantage | 0.1 (log-scale) | Zeroed for neutral WC venues |
| Monte Carlo default N | 10,000 | ~1 second runtime |
| Max goals in score matrix | 10 | Per team per match |
| Fantasy budget | $100M | Group stage; $105M from R32+ |
| Fantasy squad | 2 GK / 5 DEF / 5 MID / 3 FWD | = 15 players |
| Fantasy country limit | 3 | Group stage |
| Fantasy xPts blend α | 0.60 | Model weight vs individual historical stats |
| Fantasy MIN_PRICE floor | $4.0M | Look-ahead budget guard in optimiser |
| Elo-only draw base rate | 27% | Tapers exponentially with Elo gap (scale 500) |

## Code Structure

```
/backend
  /data
    teams.js              # 48 WC 2026 teams (static)
    fixtures.js           # 104 fixtures (static)
    fetchMatches.js       # martj42 CSV fetch + cache
    computeElo.js         # Elo ratings from match history
    computeForm.js        # Recent form computation
    computeH2H.js         # Head-to-head record computation
    fetchSquadStats.js    # Market values + avg ages (static table)
    fetchLiveScores.js    # Live scores (football-data.org) + goalscorer enrichment (api-football.com)
    players.js            # 720 fantasy players (static; re-verify after June 2)
    playerStats.js        # Individual career stats for 69 players ≥ $7M
    results.js            # Persistent locked match results
    cache.js              # File-based cache utility
    index.js              # Unified data loader
    /cache                # Runtime JSON cache files (gitignored)
  /models
    hierarchicalBayesian.js   # Attack/defense estimation; DC-only + Elo-map helpers
    dixonColes.js             # Match prediction + Poisson sampler
    fantasyEngine.js          # xPts projection engine + squad optimiser
    tournamentSimulation.js   # Monte Carlo; all three model modes; compare runner
    test.js                   # Integration smoke test
  /routes
    teams.js
    matches.js
    simulate.js           # POST /api/simulate (model param) + /api/simulate/compare
    fantasy.js            # GET /api/fantasy/players + /api/fantasy/optimise
    results.js
    history.js
    ticker.js             # GET /api/ticker
  /middleware
    validate.js
  server.js
/frontend
  index.html
  app.js
  charts.js
  sankey.js
  i18n.js                # EN/DE string table
  favicon.svg            # Dark navy soccer ball, gold seam lines
  styles.css
```

## Git Workflow

- **All features must be developed on a feature branch**, named `feature/<short-description>` (e.g. `feature/live-score-ingestion`). Never commit feature work directly to `master`.
- When a feature is complete, ask the user: *"Ready to push, open a PR, and merge into master?"* — do not push or merge without explicit confirmation.
- One GitHub issue per feature branch. Reference the issue number in the PR description.
- When closing an issue, post a comment on the issue summarising what was implemented: key files added/changed, approach taken, and anything deliberately left out of scope.

## Notes & Constraints
- All WC matches are at neutral venues — home advantage is zeroed in all predictions
- Group J teams: Argentina, Jordan, Austria, Algeria (not Colombia — confirmed from Dec 2025 draw)
- Colombia is in Group K with Portugal, Congo DR, Uzbekistan
- Squad market values and ages are static tables; update from Transfermarkt/ESPN before each tournament phase
- The 8 best 3rd-place bracket seeding is simplified for Monte Carlo purposes; exact FIFA rules are more complex
- Penalty shootout currently modelled as 50/50 — future enhancement: per-team historical shootout data (issue #8)
- Fantasy player positions sourced from play.fifa.com/fantasy; re-verify the full `players.js` table after official squad announcements on June 2, 2026
- Fantasy optimiser is greedy + local search — issue #58 tracks improvements (multi-swap pass, random restarts)
- Ticker goalscorer data (api-football.com) is capped at 100 requests/day on the free tier; resets at UTC midnight. Goalscorers will be missing for matches fetched after the daily cap is hit — this is expected behaviour
- api-football.com WC 2026 league ID is `1` (FIFA World Cup); date queries use UTC calendar date (`fixture.date`), not ET. football-data.org `utcDate` field is authoritative for kickoff time
- Ticker uses Eastern Time (`America/New_York`) for all date boundaries (yesterday / today / tomorrow sections); api-football fixture lookups use each match's own UTC calendar date to avoid midnight-UTC edge cases
