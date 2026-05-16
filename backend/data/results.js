// Persistent store for real locked match results.
// Stored as a plain JSON file (not TTL-cached) since results never expire.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = join(__dirname, 'cache', 'locked_results.json');

function read() {
  if (!existsSync(RESULTS_FILE)) return {};
  return JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
}

function write(data) {
  writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2));
}

export function getResults() {
  return read();
}

export function setResult(key, goalsA, goalsB) {
  const data = read();
  data[key] = { goalsA, goalsB };
  write(data);
  return data;
}

export function deleteResult(key) {
  const data = read();
  delete data[key];
  write(data);
  return data;
}
