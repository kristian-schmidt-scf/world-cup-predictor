# World Cup 2026 Predictor

An interactive web tool for predicting FIFA World Cup 2026 outcomes using hierarchical Bayesian estimation and the Dixon-Coles Poisson model, with full Monte Carlo tournament simulation.

## Features

- **Match predictions** — Expected goals, score probability matrix, and win/draw/loss probabilities for every fixture
- **Head-to-head overlay** — All-time historical record between any two teams pulled from the full martj42 dataset, shown in the match detail panel
- **Team ratings** — Attack (α) and defense (δ) strength parameters calibrated against 7,000+ historical international results
- **Four data signals** — Elo ratings, recent form, squad market value, and average squad age all feed the model prior
- **Tournament simulation** — 10,000 Monte Carlo simulations produce advancement probabilities at every stage (R16 → QF → SF → Final → Winner)
- **Bracket explorer** — Visual bracket with probability overlays; locks in real results automatically
- **Scenario simulator** — Force any group result and instantly see how knockout probabilities shift
- **Result locking** — Lock real match scores; they persist across page reloads and automatically seed the simulation
- **Match countdown timers** — Live status badges count down to kick-off, pulse during live windows, and show final scores

## How It Works

### Modeling pipeline

1. **Data ingestion** — Historical international match results since 2010 (7,000+ matches, no API key needed) for model fitting; full all-time history for head-to-head display. Squad market values and average ages for all 48 teams.
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
│   │   │                       #   fetchMatches()    — 2010+ for model fitting
│   │   │                       #   fetchAllMatches() — full history for H2H display
│   │   ├── computeElo.js       # Elo ratings computed from match history
│   │   ├── computeForm.js      # Recent form: last 10 matches, time-decayed
│   │   ├── computeH2H.js       # Head-to-head record between any two teams
│   │   ├── fetchSquadStats.js  # Market values (€M) + avg squad ages, all 48 teams
│   │   ├── results.js          # Persistent locked match results (JSON file store)
│   │   ├── cache.js            # File-based cache with TTL + stale fallback
│   │   └── index.js            # Unified data loader (run to pre-warm cache)
│   ├── models/
│   │   ├── hierarchicalBayesian.js   # Attack/defense parameter estimation
│   │   ├── dixonColes.js             # Match prediction + Poisson sampler
│   │   └── tournamentSimulation.js   # Monte Carlo tournament simulation
│   ├── routes/
│   │   ├── teams.js            # GET /api/teams, GET /api/team/:id
│   │   ├── matches.js          # GET /api/fixtures, GET /api/match/:teamA/:teamB
│   │   ├── simulate.js         # POST /api/simulate, GET /api/bracket
│   │   └── results.js          # GET/POST/DELETE /api/results (result locking)
│   └── server.js               # Express server + static frontend serving
└── frontend/
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

# Pre-warm the data cache (downloads historical match data)
npm run data:fetch

# Start the server (serves both API and frontend)
npm start
```

Then open `http://localhost:3001` in your browser. No API keys required.

### API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | All 48 teams with attack/defense ratings, Elo, form, squad stats |
| GET | `/api/team/:id` | Single team full profile (e.g. `/api/team/FRA`) |
| GET | `/api/fixtures` | All 104 fixtures with match status |
| GET | `/api/match/:teamA/:teamB` | Dixon-Coles prediction + H2H record for any matchup |
| POST | `/api/simulate` | Body: `{ numSims, lockedResults? }` → Monte Carlo probabilities |
| GET | `/api/bracket` | Current bracket state |
| GET | `/api/results` | All locked real match results |
| POST | `/api/results` | Body: `{ matchId, goalsA, goalsB }` — lock a result |
| DELETE | `/api/results/:matchId` | Unlock a result |
| POST | `/api/refresh` | Invalidate all caches and re-fetch |

## Sample output

```
Top 10 WC 2026 teams by Elo:
  FRA   1810.8  form: WWWWD  mkt: €1280M  age: 26.3
  ESP   1784.2  form: DWDWW  mkt:  €920M  age: 26.7
  POR   1759.4  form: WDWLD  mkt:  €850M  age: 27.2
  ARG   1712.7  form: WWWWW  mkt:  €570M  age: 28.9
  BRA   1687.9  form: WLDWL  mkt: €1000M  age: 27.6

Tournament winner probabilities (10,000 sims):
  ESP  12.9%  |  FRA  12.1%  |  BRA  11.1%  |  ARG  10.9%  |  POR  10.5%
```

## Development Status

See [project_plan.md](project_plan.md) for the full milestone plan. Tournament starts **June 11, 2026**.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Data layer | ✅ Complete (May 15) |
| 2 | Modeling layer | ✅ Complete (May 15) |
| 3 | Backend API | ✅ Complete (May 15) |
| 4 | Frontend MVP | ✅ Complete (May 16) |
| 5 | Live tournament mode | Planned (June 11+) |
| 6 | Knockout-stage polish | Planned (July 4+) |

## License

MIT
