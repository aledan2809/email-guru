#!/usr/bin/env node
// Rutina de triaj Gmail — citește inboxul, judecă local, salvează planul.
//
// NU mută niciun mesaj. Produce doar propuneri, pe care le aprobi din pagina
// /triaj. Asta e comanda pe care o pornește rutina de dimineață.
//
// Rulare:
//   npm run gmail:triage                    ultimele 24h
//   npm run gmail:triage -- --days 3        fereastră mai largă
//   npm run gmail:triage -- --max 50        limitează numărul de mesaje
//   npm run gmail:triage -- --account x@y   alt cont autorizat

import { loadEnvLocal } from './lib/load-env.mjs';
loadEnvLocal();

const { getAuthorizedClient } = await import('../src/lib/triage/token-store.mjs');
const { fetchInbox, triage } = await import('../src/lib/triage/engine.mjs');
const { saveRun } = await import('../src/lib/triage/store.mjs');
const { buildSummary, sendTelegram } = await import('../src/lib/triage/notify.mjs');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

// Validăm aici, nu în motor: o valoare greșită ("--max 0", "--days abc")
// ar ajunge altfel la Gmail ca cerere invalidă, cu o eroare care nu spune nimic.
const positiveInt = (name, raw, fallback) => {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    console.error(`❌ --${name} trebuie să fie un număr întreg pozitiv (am primit: ${raw})`);
    process.exit(1);
  }
  return n;
};

const days = positiveInt('days', flag('days', 1));
const max = positiveInt('max', flag('max', 200));
const account = flag('account', process.env.GMAIL_TRIAGE_ACCOUNT || null);
const quiet = args.includes('--quiet');
const TRIAGE_URL = process.env.GMAIL_TRIAGE_URL || 'http://localhost:3101/triaj';

const log = (...a) => { if (!quiet) console.log(...a); };

try {
  const { client, email: accountEmail } = await getAuthorizedClient(account);
  log(`Cont: ${accountEmail} | fereastră: ultimele ${days} zile`);

  const started = Date.now();
  const emails = await fetchInbox(client, { days, max });
  log(`Mesaje de analizat: ${emails.length}`);

  if (emails.length === 0) {
    log('Inbox gol pentru fereastra cerută — nimic de triat.');
    process.exit(0);
  }

  const items = await triage(emails, {
    onProgress: (done, total) => {
      if (!quiet && (done % 10 === 0 || done === total)) {
        process.stdout.write(`\r  analizate ${done}/${total}`);
      }
    },
  });
  if (!quiet) process.stdout.write('\n');

  const counts = items.reduce((acc, i) => {
    acc.priority[i.priority] = (acc.priority[i.priority] || 0) + 1;
    acc.action[i.action] = (acc.action[i.action] || 0) + 1;
    return acc;
  }, { priority: {}, action: {} });

  const now = new Date();
  const runId = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const run = {
    runId,
    account: accountEmail,
    startedAt: new Date(started).toISOString(),
    finishedAt: now.toISOString(),
    durationSec: Math.round((Date.now() - started) / 1000),
    windowDays: days,
    counts,
    items,
  };

  const file = saveRun(run);

  log('');
  log(`Priorități: ${Object.entries(counts.priority).map(([k, v]) => `${k}=${v}`).join('  ') || '—'}`);
  log(`Propuneri:  ${Object.entries(counts.action).map(([k, v]) => `${k}=${v}`).join('  ') || '—'}`);
  log(`Durată: ${run.durationSec}s`);
  log(`Salvat: ${file}`);
  log('');
  log(`Deschide ${TRIAGE_URL} ca să aprobi ce se mută. Nimic nu s-a mutat până acum.`);

  if (!args.includes('--no-telegram')) {
    const { sent, reason } = await sendTelegram(buildSummary(run, { url: TRIAGE_URL }));
    log(sent ? 'Rezumat trimis pe Telegram.' : `Telegram: netrimis (${reason}).`);
  }

  // Codul de ieșire spune rutinei dacă are ce raporta: 0 = nimic de aprobat,
  // 10 = există propuneri care așteaptă confirmarea ta.
  const pending = items.filter((i) => i.action !== 'PASTREAZA').length;
  process.exit(pending > 0 ? 10 : 0);
} catch (e) {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
}
