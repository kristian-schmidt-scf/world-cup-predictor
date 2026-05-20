// Persistent store for the prediction leaderboard.
// Uses a plain JSON file (same pattern as results.js).

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, 'cache', 'leaderboard.json');

function read() {
  if (!existsSync(FILE)) return { users: [] };
  try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return { users: [] }; }
}

function write(data) {
  writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Strip token before returning to callers outside this module.
function sanitise({ id, username, picks, totalScore, scores, createdAt }) {
  return { id, username, picks, totalScore, scores, createdAt };
}

export function registerUser(username) {
  const name = username.trim().slice(0, 20);
  if (!name) throw new Error('Username required');
  if (!/^[\w\s\-'.]+$/.test(name)) throw new Error('Invalid username');
  const data = read();
  if (data.users.some(u => u.username.toLowerCase() === name.toLowerCase()))
    throw new Error('Username already taken');
  const token = randomBytes(32).toString('hex');
  const id    = randomBytes(8).toString('hex');
  data.users.push({
    id, username: name, token,
    picks: null, totalScore: 0, scores: {},
    createdAt: new Date().toISOString(),
  });
  write(data);
  return { id, username: name, token };
}

export function getUserByToken(token) {
  return read().users.find(u => u.token === token) ?? null;
}

export function savePicks(token, picks) {
  const data = read();
  const idx  = data.users.findIndex(u => u.token === token);
  if (idx === -1) return null;
  data.users[idx].picks = picks;
  write(data);
  return sanitise(data.users[idx]);
}

export function getLeaderboard() {
  return read().users
    .map(sanitise)
    .sort((a, b) => b.totalScore - a.totalScore || a.createdAt.localeCompare(b.createdAt));
}

// Scoring: winner correct = 8 pts, finalist = 4 pts, each semi-finalist = 2 pts.
// actual = { winner, finalist, semiFinals: [t1, t2] }
export function scoreAll(actual) {
  const data = read();
  for (const user of data.users) {
    if (!user.picks) { user.totalScore = 0; user.scores = {}; continue; }
    const w  = actual.winner   && user.picks.winner   === actual.winner   ? 8 : 0;
    const f  = actual.finalist && user.picks.finalist === actual.finalist ? 4 : 0;
    const sf = (user.picks.semiFinals ?? [])
      .filter(t => (actual.semiFinals ?? []).includes(t)).length * 2;
    user.scores     = { winner: w, finalist: f, semiFinals: sf };
    user.totalScore = w + f + sf;
  }
  write(data);
  return getLeaderboard();
}
