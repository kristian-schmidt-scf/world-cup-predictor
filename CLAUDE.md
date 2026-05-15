# World Cup 2026 Prediction Tool

## Overview
Interactive web-based tool for predicting World Cup 2026 outcomes using hierarchical Bayesian estimation and Dixon-Coles Poisson modeling. Full Monte Carlo tournament simulation with interactive dashboard.

## Prediction Scope
- **Tournament winner**: Probability distribution over all teams
- **Group stage outcomes**: Qualification probabilities, group winner predictions
- **Match-by-match predictions**: Expected goals, win/draw/loss probabilities, confidence intervals
- **Interactive scenario simulation**: "What-if" tournament bracket exploration

## Architecture

### Backend (Node.js / Claude Code)

#### Data Layer
- Fetch team data from free, reliable APIs:
  - **Team strengths/rankings**: FIFA rankings (or equivalent public source)
  - **Recent match history**: International match results for calibration
  - **Tournament fixtures**: 2026 World Cup groups and schedule
- Data refresh strategy: Cache on startup; refresh on demand

#### Modeling Layer

**Hierarchical Bayesian Estimation**
- Estimate each team's attack and defense strength parameters
- Use pooled priors (hierarchical structure across all teams)
- Output: team strength ratings with credible intervals

**Dixon-Coles Poisson Model**
- Goal predictions: Poisson distribution with team strength parameters
- Low-score adjustment: Handle 0-0 and 1-1 over-frequency via correlation parameter
- Per-match output: Expected goals for each team, goal probability distribution, match outcome probabilities (W/D/L)

**Tournament Simulation**
- Group stage: Round-robin matches with probabilistic outcomes
- Knockout stage: Single-elimination with probabilistic advancement
- Full Monte Carlo: Run N simulations (e.g., 10,000) of entire tournament bracket
- Output: Tournament winner probability distribution, team advancement probabilities at each stage

#### API Endpoints
- `/team-strength` — Current team strength ratings
- `/match-prediction/{team1}/{team2}` — Prediction for specific match
- `/tournament-simulation/{numSims}` — Run N Monte Carlo simulations, return probabilities
- `/bracket-state/{scenarioId}` — Bracket state for a specific scenario (group outcomes)

### Frontend (Interactive HTML/JS)

#### Views

**Team Dashboard**
- Team strength comparison (attack/defense ratings)
- Head-to-head probability vs. other teams
- Group stage survival probability
- Path to final probability

**Match Predictions**
- Table of all fixtures (group + knockout)
- Per-match: Expected goals, outcome probabilities, confidence bands
- Filter by group, team, or date range

**Tournament Bracket Simulator**
- Visual bracket (groups → knockout stages)
- Overlay: advancement probabilities at each stage
- "Run Simulation" button → simulate N tournaments, update probabilities
- Live bracket state display (completed matches lock in, future matches show probabilities)

**Scenario Explorer**
- Lock in specific group outcomes
- Recalculate knockout probabilities given locked results
- Compare scenarios (e.g., "Team A vs. Team B in final")

**Calibration View** (optional)
- Recent historical predictions vs. actual results
- Model diagnostics

## Data Sources

### Required APIs (Free & Reliable)
1. **FIFA Rankings or equivalent**: Team strength baseline
2. **International match results**: Recent fixtures (last 2+ years) for calibration
   - Candidate: ESPN API, Soccerway, or SofaScore (with proxy if needed)
3. **2026 World Cup fixture list**: Groups, schedule, venues

### Data Freshness Requirements
- Team strengths: Update monthly (or before major tournament phases)
- Match results: Update within 24 hours of match completion
- Fixtures: Static (locked at tournament start)

## Technical Approach

### Computation
- **Full Monte Carlo**: Re-simulate tournament N times per request (e.g., N=10,000)
- **Performance**: Pre-compute team strengths; cache/reuse across simulations
- **Caching strategy**: 
  - Team strengths cached until manual refresh
  - Match predictions cached per-game
  - Simulation results cached (with timestamp; recompute if data updated)

### Model Parameters
- **Hierarchical prior**: Weakly informative on team attack/defense strength (e.g., Normal with large SD)
- **Dixon-Coles correlation**: Estimate from historical low-score frequency or use literature default (~0.1)
- **Home advantage**: Factor in (if using international matches; may be muted in neutral-venue tournament)

### Error Handling & Validation
- Graceful API failures with cached fallbacks
- Input validation (team names, simulation counts)
- Credible interval checks (probabilities sum to 1.0 per match/tournament)

## Deliverables

### Code Structure
```
/backend
  /data
    - fetchTeams.js
    - fetchFixtures.js
    - fetchMatches.js
  /models
    - hierarchicalBayesian.js
    - dixonColes.js
    - tournamentSimulation.js
  /server.js (Express or similar)

/frontend
  - index.html (main dashboard)
  - styles.css
  - app.js (main interactive logic)
  - charts.js (D3.js or Chart.js for visualization)
```

### Output Format
- **Backend**: JSON responses (probabilities, ratings, bracket states)
- **Frontend**: Single self-contained HTML file (or minimal separate JS/CSS for modularity)

## Notes & Constraints
- Focus on reliability over feature bloat: ensure core predictions are solid before adding extras
- Transparency: Always show model assumptions and confidence bands
- Validation: Compare predictions against historical World Cup outcomes and current betting markets (for sanity check, not prediction)
