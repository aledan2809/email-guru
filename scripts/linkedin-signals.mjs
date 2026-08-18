#!/usr/bin/env node
// Daily LinkedIn engagement collector.
//
// LinkedIn gives our app no way to READ reactions/comments on our own posts (w_member_social is
// write-only; Community Management API still rejected). The one legitimate signal is the
// notification e-mail LinkedIn sends the account owner. This script reads those mails from the
// already-authorised Gmail account, classifies them, and pushes them into MarketingAutomation's
// engagement inbox (EngagementItem, platform=linkedin) so they sit in the same lead flow as the
// Facebook ones. Nothing is moved, labelled or deleted in the mailbox — read-only.
//
//   npm run linkedin:signals                 last 2 days (default; overlaps so a missed run heals)
//   npm run linkedin:signals -- --days 30    backfill
//   npm run linkedin:signals -- --dry-run    classify + print, push nothing
//
// Idempotent end to end: MA dedups on the Gmail message id, so re-running over the same window
// reports `duplicate`, not double rows.
import { loadEnvLocal } from './lib/load-env.mjs';
loadEnvLocal();

const { google } = await import('googleapis');
const { getAuthorizedClient } = await import('../src/lib/triage/token-store.mjs');
const { classifyLinkedInMail } = await import('../src/lib/linkedin/classify.mjs');
const { sendTelegram } = await import('../src/lib/triage/notify.mjs');

const args = process.argv.slice(2);
const flag = (n, d = null) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : (args[i + 1] ?? d); };
const has = (n) => args.includes(`--${n}`);

const days = Number.parseInt(flag('days', '2'), 10);
if (!Number.isInteger(days) || days < 1) { console.error('❌ --days trebuie să fie un întreg pozitiv'); process.exit(2); }
const dryRun = has('dry-run');
const account = flag('account', process.env.GMAIL_TRIAGE_ACCOUNT || null);

const MA_URL = (process.env.MA_BASE_URL || 'https://ma.techbiz.ae').replace(/\/+$/, '');
const MA_KEY = process.env.MA_INTERNAL_KEY;
if (!dryRun && !MA_KEY) {
  console.error('❌ Lipsește MA_INTERNAL_KEY (în .env.local) — nu am cum să trimit spre MarketingAutomation. Rulează cu --dry-run ca să vezi doar clasificarea.');
  process.exit(2);
}

const { client, email } = await getAuthorizedClient(account);
const gmail = google.gmail({ version: 'v1', auth: client });

// Only LinkedIn's own senders. `newer_than` is coarse (day granularity) — fine for a daily job.
const q = `from:linkedin.com newer_than:${days}d`;
const signals = [];
const skipped = { noise: 0, unrecognised: 0 };
let scanned = 0, pageToken;
do {
  const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 100, pageToken });
  for (const { id } of list.data.messages || []) {
    const m = await gmail.users.messages.get({
      userId: 'me', id, format: 'metadata', metadataHeaders: ['Subject', 'Date'],
    });
    scanned++;
    const h = Object.fromEntries((m.data.payload?.headers || []).map((x) => [x.name.toLowerCase(), x.value]));
    const sig = classifyLinkedInMail({ subject: h.subject || '', snippet: m.data.snippet || '' });
    if (!sig) { skipped.unrecognised++; continue; }
    const at = h.date ? new Date(h.date) : null;
    signals.push({
      externalId: id,
      kind: sig.kind,
      authorName: sig.authorName,
      content: sig.content,
      happenedAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : new Date().toISOString(),
    });
  }
  pageToken = list.data.nextPageToken;
} while (pageToken);

const byKind = signals.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {});
console.log(`📬 ${email} · ultimele ${days} zile · ${scanned} mailuri LinkedIn · ${signals.length} semnale`);
for (const [k, n] of Object.entries(byKind).sort()) console.log(`   ${String(n).padStart(3)}  ${k}`);
console.log(`   ${String(skipped.unrecognised).padStart(3)}  (nerecunoscute — sărite, nu ghicite)`);

if (dryRun) {
  for (const s of signals.slice(0, 20)) console.log(`   · ${s.happenedAt.slice(0, 10)}  ${s.kind.padEnd(19)} ${s.authorName}`);
  console.log('\n(dry-run: nimic trimis)');
  process.exit(0);
}

let result = { created: 0, duplicate: 0, rejected: 0 };
if (signals.length) {
  const res = await fetch(`${MA_URL}/api/internal/linkedin-signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': MA_KEY },
    body: JSON.stringify({ signals }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.error(`❌ MarketingAutomation a răspuns ${res.status}: ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  result = await res.json();
}
console.log(`\n→ MarketingAutomation: ${result.created} noi · ${result.duplicate} deja existente · ${result.rejected} respinse`);

// Telegram only when something NEW landed — a daily "0 new" would train you to ignore it.
if (result.created > 0) {
  const lines = [`💼 <b>LinkedIn — ${result.created} semnal${result.created === 1 ? '' : 'e'} nou${result.created === 1 ? '' : 'i'}</b>`];
  for (const [k, n] of Object.entries(byKind).sort()) lines.push(`• ${n} × ${k}`);
  lines.push('', `Le vezi în MA → Engagement (platforma linkedin).`);
  const t = await sendTelegram(lines.join('\n'));
  if (!t.sent) console.warn(`(Telegram netrimis: ${t.reason})`);
}
