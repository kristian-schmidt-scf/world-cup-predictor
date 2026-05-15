# World Cup 2026 Predictor

An interactive web tool for predicting FIFA World Cup 2026 outcomes using hierarchical Bayesian estimation and the Dixon-Coles Poisson model, with full Monte Carlo tournament simulation.

## Features

- **Match predictions** — Expected goals, win/draw/loss probabilities, and confidence intervals for every fixture
- **Team ratings** — Attack and defense strength parameters estimated from historical international results
- **Tournament simulation** — Run 10,000 Monte Carlo simulations to produce advancement probabilities at every stage
- **Bracket explorer** — Visual bracket with probability overlays; locks in completed match results automatically
- **Scenario simulator** — Force specific outcomes and instantly see how knock-out probabilities shift

## How It Works

### Modeling pipeline

1. **Data ingestion** — Pulls FIFA rankings and ~3 years of international match results to calibrate the model
2. **Hierarchical Bayesian estimation** — Each team gets attack (α) and defense (δ) strength parameters estimated via pooled priors; recent matches are weighted more heavily via exponential time-decay
3. **Dixon-Coles Poisson model** — Per-match expected goals are `λ = α_attack × δ_defense`; a low-score correction (ρ ≈ 0.1) adjusts the over-frequency of 0-0 and 1-1 results
4. **Monte Carlo simulation** — Full 48-team tournament is simulated N times (default 10,000); group tiebreakers and penalty shootouts are modeled probabilistically

### Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Modeling | Pure JS (no external ML deps) |
| Frontend | Vanilla JS + Chart.js |
| Data | football-data.org (free tier), FIFA rankings |

## Project Structure

```
world-cup-predictor/
├── backend/
│   ├── data/
│   │   ├── fetchTeams.js        # FIFA rankings fetch
│   │   ├── fetchFixtures.js     # 2026 WC fixture list
│   │   ├── fetchMatches.js      # Historical results
│   │   ├── cache.js             # File-based cache layer
│   │   └── cache/               # Cached JSON responses
│   ├── models/
│   │   ├── hierarchicalBayesian.js
│   │   ├── dixonColes.js
│   │   └── tournamentSimulation.js
│   └── server.js
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
npm start
```

The backend starts on `http://localhost:3000`. Open `frontend/index.html` in your browser (or serve it with `npx serve frontend`).

### API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/teams` | All 48 teams with attack/defense ratings |
| `GET /api/fixtures` | Full fixture list with match status |
| `GET /api/match/:team1/:team2` | Prediction for a specific matchup |
| `POST /api/simulate` | Run Monte Carlo simulation (body: `{ numSims, lockedResults? }`) |
| `GET /api/bracket` | Current bracket state |
| `POST /api/refresh` | Re-fetch all external data |

## Development Status

See [project_plan.md](project_plan.md) for the full milestone plan. Tournament starts **June 11, 2026**.

| Phase | Status |
|-------|--------|
| Data layer | Planned |
| Modeling layer | Planned |
| Backend API | Planned |
| Frontend MVP | Planned |
| Live tournament mode | Planned |

## License

MIT
