# World Cup 2026 Prediction Tool

## Overview
Interactive web-based tool for predicting World Cup 2026 outcomes using hierarchical Bayesian estimation and Dixon-Coles Poisson modeling. Full Monte Carlo tournament simulation with interactive dashboard.

## Prediction Scope
- **Tournament winner**: Probability distribution over all 48 teams
- **Group stage outcomes**: Qualification probabilities, group winner predictions
- **Match-by-match predictions**: Expected goals, win/draw/loss probabilities, score distribution matrix
- **Interactive scenario simulation**: "What-if" tournament bracket exploration

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
| `fetchSquadStats.js` | Squad market values (€M, Transfermarkt May 2026) and avg squad ages (RotoWire) for all 48 teams |
| `cache.js` | File-based JSON cache under `backend/data/cache/`; TTL per key, stale-fallback on network failure |
| `index.js` | Unified exports; run directly to pre-warm all caches (`npm run data:fetch`) |

**Data freshness:**
- Match results: 24h TTL (re-fetched from GitHub CSV daily)
- Elo / form: 24h TTL (recomputed from cached matches)
- Squad stats: 30-day TTL (stable pre-tournament)
- Fixtures / teams: static (no TTL)

#### Modeling Layer (`backend/models/`)

**Hierarchical Bayesian Estimation** (`hierarchicalBayesian.js`)
- Parameters: attack α and defense δ per team (log-linear; λ = exp(α_attack + δ_defense))
- Initialisation: blends four signals — Elo (weight 0.35), log market value (0.15), squad age quadratic bonus (peak at 26.5), Elo defense proxy
- Fitting: iterative coordinate-ascent MLE on historical WC-team-vs-WC-team matches
- Time decay: exponential, half-life 548 days (~1.5 years)
- Regularisation: L2 toward prior (λ_reg = 0.02) — the hierarchical pooling component
- Home advantage: 0.1 in log-space (neutralised for all WC matches)
- Converges in ~20 iterations (<100ms)

**Dixon-Coles Poisson Model** (`dixonColes.js`)
- Per-match: score matrix P(i goals, j goals) up to 10×10
- Low-score τ correction: ρ = −0.13 (literature estimate; negative = more low-score draws than independent Poisson)
- Outputs: xgA, xgB, pWin, pDraw, pLoss, scoreMatrix, mostLikelyScore
- Fast Poisson sampler (Knuth algorithm) for Monte Carlo

**Tournament Simulation** (`tournamentSimulation.js`)
- Group stage: round-robin, 3/1/0 points, GD→GF tiebreakers
- 3rd-place selection: best 8 of 12 by points→GD→GF
- Knockout: 90-min result; draws → extra time (0.35× rate) → 50/50 penalty shootout
- R32 bracket: 8 group winners (A–H) vs 8 best thirds; 4 winners (I–L) vs runners-up; 4 runners-up cross-bracket
- Monte Carlo: 10,000 sims in ~1 second; aggregates R16/QF/SF/Final/Winner probabilities
- `lockedResults` map overrides simulated group results with real scores

#### API Endpoints (`backend/server.js`, `backend/routes/`)
- `GET /api/teams` — all 48 teams with ratings, Elo, form, squad stats
- `GET /api/team/:id` — single team full profile
- `GET /api/fixtures` — all 104 fixtures with match status
- `GET /api/match/:teamA/:teamB` — Dixon-Coles prediction for any matchup
- `POST /api/simulate` — body `{ numSims, lockedResults? }` → Monte Carlo probabilities
- `GET /api/bracket` — current bracket state
- `POST /api/refresh` — invalidate all caches and re-fetch

### Frontend (`frontend/`)

#### Views

**Team Dashboard** — sortable table: attack/defense/Elo/form/market value; path-to-final breakdown

**Match Predictions** — all 104 fixtures; per-row xG, W/D/L%, status badge; expand → score histogram

**Tournament Bracket Simulator** — visual 48→32→16→8→4→2→1 bracket; probability overlays; "Run Simulation" button

**Scenario Explorer** — lock any group match result; recalculate knockout probabilities; baseline vs. scenario comparison

## Data Sources

| Data | Source | Key required? | Refresh cadence |
|------|--------|--------------|-----------------|
| Historical match results | [martj42/international_results](https://github.com/martj42/international_results) GitHub CSV | No | 24h |
| WC 2026 fixtures | Hard-coded from Dec 2025 FIFA draw | — | Static |
| WC 2026 teams / groups | Hard-coded from Dec 2025 FIFA draw | — | Static |
| Squad market values | Transfermarkt (via fetchSquadStats.js static table, May 2026) | No | Update monthly |
| Squad average age | RotoWire projected rosters (May 2026) | No | Update on squad announcement |

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

## Code Structure

```
/backend
  /data
    teams.js              # 48 WC 2026 teams (static)
    fixtures.js           # 104 fixtures (static)
    fetchMatches.js       # martj42 CSV fetch + cache
    computeElo.js         # Elo ratings from match history
    computeForm.js        # Recent form computation
    fetchSquadStats.js    # Market values + avg ages (static table)
    cache.js              # File-based cache utility
    index.js              # Unified data loader
    /cache                # Runtime JSON cache files (gitignored)
  /models
    hierarchicalBayesian.js   # Attack/defense parameter estimation
    dixonColes.js             # Match prediction + Poisson sampler
    tournamentSimulation.js   # Monte Carlo tournament simulation
    test.js                   # Integration smoke test
  /routes
    teams.js
    matches.js
    simulate.js
  server.js
/frontend
  index.html
  app.js
  charts.js
  styles.css
```

## Notes & Constraints
- All WC matches are at neutral venues — home advantage is zeroed in all predictions
- Group J teams: Argentina, Jordan, Austria, Algeria (not Colombia — confirmed from Dec 2025 draw)
- Colombia is in Group K with Portugal, Congo DR, Uzbekistan
- Squad market values and ages are static tables; update from Transfermarkt/ESPN before each tournament phase
- The 8 best 3rd-place bracket seeding is simplified for Monte Carlo purposes; exact FIFA rules are more complex
- Penalty shootout currently modelled as 50/50 — future enhancement: per-team historical shootout data
