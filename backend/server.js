import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadAll } from './data/index.js';
import { estimateParams } from './models/hierarchicalBayesian.js';
import teamsRouter    from './routes/teams.js';
import matchesRouter  from './routes/matches.js';
import simulateRouter from './routes/simulate.js';
import resultsRouter  from './routes/results.js';
import historyRouter      from './routes/history.js';
import leaderboardRouter  from './routes/leaderboard.js';
import fantasyRouter      from './routes/fantasy.js';
import tickerRouter       from './routes/ticker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const app  = express();

// CORS — allow all origins for local frontend dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json());

// Frontend static files
app.use(express.static(join(__dirname, '../frontend')));

// API routes
app.use('/api', teamsRouter);
app.use('/api', matchesRouter);
app.use('/api', simulateRouter);
app.use('/api', resultsRouter);
app.use('/api', historyRouter);
app.use('/api', leaderboardRouter);
app.use('/api', fantasyRouter);
app.use('/api', tickerRouter);

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack ?? err.message);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

// Pre-warm data + model cache before accepting requests
console.log('Pre-warming data and model cache...');
try {
  const { matches, elo, squadStats } = await loadAll();
  estimateParams(matches, elo, squadStats);
  console.log('Cache warm. Server ready.\n');
} catch (err) {
  console.warn('Startup warm-up failed (will retry on first request):', err.message);
}

app.listen(PORT, () => {
  console.log(`World Cup Predictor API → http://localhost:${PORT}`);
});
