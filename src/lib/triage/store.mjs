// Păstrarea rulărilor de triaj pe disc.
//
// O rulare = un fișier JSON. Interfața citește ultima rulare; aplicarea scrie
// înapoi în ea ce s-a executat, ca să existe urmă a ce s-a mutat și când.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
export const TRIAGE_DIR = resolve(PROJECT_ROOT, 'data/triage');

function ensureDir() {
  mkdirSync(TRIAGE_DIR, { recursive: true });
}

export function runPath(runId) {
  return join(TRIAGE_DIR, `${runId}.json`);
}

export function saveRun(run) {
  ensureDir();
  // Scriere atomică: o întrerupere la jumătate ar lăsa un JSON rupt, iar
  // interfața ar raporta „nicio rulare" în loc de rularea reală.
  const target = runPath(run.runId);
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, JSON.stringify(run, null, 2), 'utf-8');
  renameSync(tmp, target);
  return target;
}

export function listRuns() {
  ensureDir();
  return readdirSync(TRIAGE_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.tmp'))
    .sort()
    .reverse();
}

export function loadRun(runId) {
  const file = runId ? runPath(runId) : (listRuns()[0] && join(TRIAGE_DIR, listRuns()[0]));
  if (!file || !existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

export function loadLatestRun() {
  return loadRun(null);
}

/** Marchează în rulare ce s-a aplicat efectiv, cu rezultat per mesaj. */
export function recordApplied(runId, applied) {
  const run = loadRun(runId);
  if (!run) return null;
  const byId = new Map(applied.map((a) => [a.id, a]));
  run.items = run.items.map((item) =>
    byId.has(item.id)
      ? { ...item, applied: byId.get(item.id) }
      : item
  );
  run.lastAppliedAt = new Date().toISOString();
  saveRun(run);
  return run;
}
