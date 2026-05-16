import { TEAM_BY_ID } from '../data/teams.js';

// Validates that req.params[paramName] is a known team ID; normalises to uppercase.
export function validateTeamParam(paramName) {
  return (req, res, next) => {
    const raw = req.params[paramName];
    const id  = raw?.toUpperCase();
    if (!TEAM_BY_ID[id]) {
      return res.status(400).json({ error: `Unknown team: "${raw}"` });
    }
    req.params[paramName] = id;
    next();
  };
}

// Validates req.body.numSims is an integer in [100, 50000]. Defaults to 10,000.
export function validateNumSims(req, res, next) {
  const raw = req.body?.numSims ?? 10_000;
  const n   = Number(raw);
  if (!Number.isInteger(n) || n < 100 || n > 50_000) {
    return res.status(400).json({ error: 'numSims must be an integer between 100 and 50,000' });
  }
  req.body.numSims = n;
  next();
}
