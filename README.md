# World Cup 2026 Predictor

An interactive web tool for predicting FIFA World Cup 2026 outcomes using hierarchical Bayesian estimation and the Dixon-Coles Poisson model, with full Monte Carlo tournament simulation.

## Features

- **Match predictions** — Expected goals, score probability matrix, and win/draw/loss probabilities for every fixture
- **Team ratings** — Attack (α) and defense (δ) strength parameters calibrated against 7,000+ historical international results
- **Four data signals** — Elo ratings, recent form, squad market value, and average squad age all feed the model prior
- **Tournament simulation** — 10,000 Monte Carlo simulations produce advancement probabilities at every stage (R16 → QF → SF → Final → Winner)
- **Bracket explorer** — Visual bracket with probability overlays; locks in real results automatically
- **Scenario simulator** — Force any group result and instantly see how knockout probabilities shift

## How It Works

### Modeling pipeline

1. **Data ingestion** — Historical international match results since 2010 (7,294 matches, no API key needed) plus squad market values and average ages for all 48 teams
2. **Four-signal prior** — Each team's starting parameters blend Elo (derived from match history), squad market value (Transfermarkt), average squad age (peak bonus at 26.5), and FIFA ranking
3. **Hierarchical Bayesian estimation** — Attack (α) and defense (δ) parameters are refined via iterative MLE with L2 regularisation (pooled prior), converging in ~20 iterations
4. **Dixon-Coles Poisson model** — Per-match λ = exp(α_attack + δ_defense); τ correction (ρ = −0.13) adjusts for the over-frequency of 0-0 and 1-1 results
5. **Monte Carlo simulation** — All 104 fixtures simulated N times; group tiebreakers, extra time, and penalty shootouts are all modelled probabilistically

### Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+ + Express |
| Modeling | Pure JS (no external ML dependencies) |
| Frontend | Vanilla JS + Chart.js |
| Match data | [martj42/international_results](https://github.com/martj42/international_results) — free, no key |
| Squad data | Transfermarkt (market values) + RotoWire (squad ages) |

## Project Structure

```
world-cup-predictor/
├── backend/
│   ├── data/
│   │   ├── teams.js            # 48 WC 2026 teams, groups, FIFA ranks (static)
│   │   ├── fixtures.js         # 104 fixtures: 72 group + 32 knockout slots (static)
│   │   ├── fetchMatches.js     # Historical results from GitHub CSV (auto-cached)
│   │   ├── computeElo.js       # Elo ratings computed from match history
│   │   ├── computeForm.js      # Recent form: last 10 matches, time-decayed
│   │   ├── fetchSquadStats.js  # Market values (€M) + avg squad ages, all 48 teams
│   │   ├── cache.js            # File-based cache with TTL + stale fallback
│   │   └── index.js            # Unified data loader (run to pre-warm cache)
│   ├── models/
│   │   ├── hierarchicalBayesian.js   # Attack/defense parameter estimation
│   │   ├── dixonColes.js             # Match prediction + Poisson sampler
│   │   └── tournamentSimulation.js   # Monte Carlo tournament simulation
│   ├── routes/                       # Express route handlers (Phase 3)
│   └── server.js                     # Express server (Phase 3)
└── frontend/                         # Interactive dashboard (Phase 4)
    ├── index.html
    ├── app.js
    ├── charts.js
    └── styles.css
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
git clone https://github.com/kristian-schmidt-scf/world-cup-predictor.git
cd world-cup-predictor
npm install

# Pre-warm the data cache (downloads ~7k historical matches)
npm run data:fetch

# Start the backend (once Phase 3 is complete)
npm start
```

No API keys required. All data sources are free and open.

### Pre-warm the model

```bash
node backend/models/test.js
```

This estimates team parameters, runs 1,000 Monte Carlo simulations, and prints a full team profile table — useful for sanity-checking the model before the API is up.

### API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/teams` | All 48 teams with attack/defense ratings, Elo, form, squad stats |
| `GET /api/team/:id` | Single team full profile (e.g. `/api/team/FRA`) |
| `GET /api/fixtures` | All 104 fixtures with match status |
| `GET /api/match/:teamA/:teamB` | Dixon-Coles prediction for any matchup |
| `POST /api/simulate` | Body: `{ numSims, lockedResults? }` → Monte Carlo probabilities |
| `GET /api/bracket` | Current bracket state |
| `POST /api/refresh` | Invalidate all caches and re-fetch |

## Sample output

```
Top 10 WC 2026 teams by Elo:
  FRA   1810.8  form: WWWWD  mkt: €1280M  age: 26.3
  ESP   1784.2  form: DWDWW  mkt:  €920M  age: 26.7
  POR   1759.4  form: WDWLD  mkt:  €850M  age: 27.2
  ARG   1712.7  form: WWWWW  mkt:  €570M  age: 28.9
  BRA   1687.9  form: WLDWL  mkt: €1000M  age: 27.6

Tournament winner probabilities (1,000 sims):
  ESP  12.9%  |  FRA  12.1%  |  BRA  11.1%  |  ARG  10.9%  |  POR  10.5%
```

## Development Status

See [project_plan.md](project_plan.md) for the full milestone plan. Tournament starts **June 11, 2026**.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Data layer | ✅ Complete |
| 2 | Modeling layer | ✅ Complete |
| 3 | Backend API | Planned (target June 4) |
| 4 | Frontend MVP | Planned (target June 9) |
| 5 | Live tournament mode | Planned (June 11+) |
| 6 | Knockout-stage polish | Planned (July 4+) |

## License

MIT
