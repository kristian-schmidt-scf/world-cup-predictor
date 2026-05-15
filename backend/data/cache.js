import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, 'cache');

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

function cachePath(key) {
  return join(CACHE_DIR, `${key}.json`);
}

export function get(key) {
  const path = cachePath(key);
  if (!existsSync(path)) return null;
  const entry = JSON.parse(readFileSync(path, 'utf8'));
  if (Date.now() > entry.expiresAt) return null;
  return entry.data;
}

// Returns cached data even when expired — for stale fallback on API failure.
export function getStale(key) {
  const path = cachePath(key);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')).data;
}

export function set(key, data, ttlHours = 24) {
  writeFileSync(cachePath(key), JSON.stringify({
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlHours * 3_600_000,
  }));
}

export function invalidate(key) {
  const path = cachePath(key);
  if (existsSync(path)) unlinkSync(path);
}

export function meta(key) {
  const path = cachePath(key);
  if (!existsSync(path)) return null;
  const { cachedAt, expiresAt } = JSON.parse(readFileSync(path, 'utf8'));
  return { cachedAt, expiresAt, stale: Date.now() > expiresAt };
}
