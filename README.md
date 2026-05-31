# World Cup 2026 Predictor

An interactive web tool for predicting FIFA World Cup 2026 outcomes using hierarchical Bayesian estimation and the Dixon-Coles Poisson model, with full Monte Carlo tournament simulation.

## Features

### Predictions & Simulation
- **Match predictions** — Expected goals, score probability matrix, and win/draw/loss probabilities for every fixture
- **Score probability heatmap** — 7×7 colour-coded heatmap (goals 0–6) in the match detail panel; blue = home win, amber = draw, red = away win; toggle to bar chart view
- **Head-to-head overlay** — All-time historical record between any two teams pulled from the full martj42 dataset
- **Team ratings** — Attack (α) and defense (δ) strength parameters calibrated against 7,000+ historical international results
- **Four data signals** — Elo ratings, recent form, squad market value, and average squad age all feed the model prior
- **Tournament simulation** — 10,000 Monte Carlo simulations produce advancement probabilities at every stage (R16 → QF → SF → Final → Winner)

### Model Comparison
- **Three prediction models** — selectable from the Bracket toolbar:
  - *Full Bayesian* — Elo + market value + squad age prior, iterative MLE on historical results (default)
  - *Dixon-Coles only* — Elo-seeded Poisson model, no historical fitting
  - *Elo only* — standard logistic win formula, no Poisson
- **Model divergence panel** — "Compare Models" runs all three at 3,000 sims each; ranks the 15 teams with the largest winner-% spread across models

### Bracket & Scenarios
- **Bracket explorer** — Visual bracket with probability overlays; locks in real results automatically
- **Bracket creator** — Step-through wizard to pick your own R32→Final bracket; scored against the simulation
- **Prediction leaderboard** — Submit and compare bracket picks; scored against real results as the tournament progresses
- **Scenario simulator** — Force any group result and instantly see how knockout probabilities shift; shareable via `?s=` URL parameter
- **Tournament path (Sankey diagram)** — Flow diagram in the team detail panel showing probability mass at each stage; compare two teams side by side

### Fantasy WC 2026
- **Squad builder** — Pick a 15-player squad (2 GK / 5 DEF / 5 MID / 3 FWD) within a $100M budget; country limit 3
- **xPts projections** — Dixon-Coles match xG × stage-reaching probabilities from Monte Carlo; per-player appearance probability derived from `minsPerMatch` (or price-tier proxy for bench players); individual career stats blended with team-level model (α=0.60)
- **Squad optimiser** — Two-phase greedy algorithm: sort by raw xPts with look-ahead budget guard, then iterative upgrade-swap pass
- **My Team view** — Per-player xPts table, captain selector (×2 multiplier), chip display

### Analysis Tabs
- **Group of Death rankings** — Composite strength/competitiveness score for all 12 groups; bar charts, qualification odds, upset risk
- **Upset detector** — Flags underdog wins (< 40% pre-match probability); animated toast; running chaos score and upsets feed
- **History browser** — Filterable archive of 7,500+ historical matches; filter by team, opponent, tournament, year, result; CSV export; penalty shootout annotations; curated "Highest-Scoring" and "Biggest Upsets" sections
- **Result locking** — Lock real match scores; persist across reloads and automatically seed the simulation
- **Match countdown timers** — Live status badges count down to kick-off, pulse during live windows, and show final scores
- **Bilingual UI (EN/DE)** — Language toggle; all labels, table headers, round names, and team names; preference persists
- **Social share card** — Generate a shareable image of your bracket predictions

## How It Works

### Modeling pipeline

1. **Data ingestion** — Historical international results since 2010 (7,000+ matches, no API key) for model fitting; full all-time history for head-to-head display; squad market values and average ages for all 48 teams
2. **Four-signal prior** — Each team's starting parameters blend Elo (derived from match history), squad market value (Transfermarkt), average squad age (peak bonus at 26.5), and FIFA ranking
3. **Hierarchical Bayesian estimation** — Attack (α) and defense (δ) parameters refined via iterative MLE with L2 regularisation (pooled prior), converging in ~20 iterations
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
│   │   ├── teams.js              # 48 WC 2026 teams, groups, FIFA ranks (static)
│   │   ├── fixtures.js           # 104 fixtures: 72 group + 32 knockout slots (static)
│   │   ├── fetchMatches.js       # Historical results from GitHub CSV (auto-cached)
│   │   ├── computeElo.js         # Elo ratings computed from match history
│   │   ├── computeForm.js        # Recent form: last 10 matches, time-decayed
│   │   ├── computeH2H.js         # Head-to-head record between any two teams
│   │   ├── fetchSquadStats.js    # Market values (€M) + avg squad ages, all 48 teams
│   │   ├── players.js            # 720-player fantasy table (48 teams × 15), prices + positions
│   │   ├── playerStats.js        # Individual career stats for 69 players priced ≥ $7M
│   │   ├── results.js            # Persistent locked match results (JSON file store)
│   │   ├── cache.js              # File-based cache with TTL + stale fallback
│   │   └── index.js              # Unified data loader (run to pre-warm cache)
│   ├── models/
│   │   ├── hierarchicalBayesian.js   # Attack/defense estimation; DC-only + Elo-only variants
│   │   ├── dixonColes.js             # Match prediction + Poisson sampler
│   │   ├── fantasyEngine.js          # xPts projection + squad optimiser
│   │   └── tournamentSimulation.js   # Monte Carlo simulation; all three model modes
│   ├── routes/
│   │   ├── teams.js              # GET /api/teams, GET /api/team/:id
│   │   ├── matches.js            # GET /api/fixtures, GET /api/match/:teamA/:teamB
│   │   ├── simulate.js           # POST /api/simulate, POST /api/simulate/compare
│   │   ├── fantasy.js            # GET /api/fantasy/players, GET /api/fantasy/optimise
│   │   ├── results.js            # GET/POST/DELETE /api/results
│   │   └── history.js            # GET /api/history, GET /api/history/curated
│   └── server.js                 # Express server + static frontend serving
└── frontend/
    ├── index.html
    ├── app.js
    ├── charts.js                 # Chart.js wrappers: score histogram, heatmap, bar charts
    ├── sankey.js                 # Pure SVG tournament path flow diagram
    ├── i18n.js                   # EN/DE string table; t(), getLang(), setLang(), teamName()
    ├── favicon.svg               # Soccer ball SVG favicon (dark navy + gold seam lines)
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
| POST | `/api/simulate` | Body: `{ numSims, model?: 'full'\|'dc'\|'elo', lockedResults? }` → Monte Carlo probabilities |
| POST | `/api/simulate/compare` | Body: `{ numSims? }` → runs all three models, returns divergence table |
| GET | `/api/bracket` | Current bracket state |
| GET | `/api/results` | All locked real match results |
| POST | `/api/results` | Body: `{ matchId, goalsA, goalsB }` — lock a result |
| DELETE | `/api/results/:matchId` | Unlock a result |
| POST | `/api/refresh` | Invalidate all caches and re-fetch |
| GET | `/api/fantasy/players` | All 720 players enriched with xPts projections |
| GET | `/api/fantasy/optimise` | Optimal 15-player squad within $100M budget |
| GET | `/api/history` | Filterable, paginated match archive |
| GET | `/api/history/curated` | Top-5 highest-scoring and biggest-upset matches |

## Development Status

See [project_plan.md](project_plan.md) for the full milestone plan. Tournament starts **June 11, 2026**.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Data layer | ✅ Complete (May 15) |
| 2 | Modeling layer | ✅ Complete (May 15) |
| 3 | Backend API | ✅ Complete (May 15) |
| 4 | Frontend MVP | ✅ Complete (May 16) |
| 4+ | Post-MVP enhancements (Sankey, H2H, heatmap, upsets, history, i18n, share, leaderboard, bracket creator, fantasy, model comparison) | ✅ Complete (May 17–31) |
| 5 | Live tournament mode | Planned (June 11+) |
| 6 | Knockout-stage polish | Planned (July 4+) |

## License

MIT
