#!/usr/bin/env node
// Trimite pe Telegram rezumatul ultimei rulări de triaj — probă că notificarea
// chiar ajunge. Nu atinge Gmail, nu mută nimic.
//
// Rulare: node scripts/gmail-triage-notify-test.mjs

import { loadEnvLocal } from './lib/load-env.mjs';
loadEnvLocal();

const { loadLatestRun } = await import('../src/lib/triage/store.mjs');
const { buildSummary, sendTelegram } = await import('../src/lib/triage/notify.mjs');

const run = loadLatestRun();
if (!run) {
  console.error('Nicio rulare de triaj salvată. Rulează întâi: npm run gmail:triage');
  process.exit(1);
}

const text = buildSummary(run);
console.log('--- mesajul care se trimite ---');
console.log(text);
console.log('------------------------------');

const { sent, reason } = await sendTelegram(text);
console.log(sent ? '✅ Trimis pe Telegram.' : `❌ Netrimis: ${reason}`);
process.exit(sent ? 0 : 1);
