// Rezumatul de dimineață pe Telegram.
//
// Mesajul spune cât e de urgent și câte propuneri așteaptă, nu conține conținutul
// emailurilor — doar expeditorii mesajelor urgente, ca să știi dacă merită să te
// uiți acum. Corespondența rămâne pe mașină.
//
// Trimiterea nu e critică: dacă botul tace, triajul e oricum salvat pe disc.

import { existsSync, readFileSync } from 'node:fs';

/** Citește token+chat din seiful Master, dacă nu sunt deja în mediu. */
function loadTelegramCreds() {
  let token = process.env.TG_NOTIFY_TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TG_NOTIFY_TELEGRAM_CHAT_ID;
  if (token && chatId) return { token, chatId };

  const path = process.env.TELEGRAM_ALERTS_ENV
    || `${process.env.HOME}/Projects/Master/credentials/telegram-alerts.env`;
  if (!existsSync(path)) return null;

  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('TG_NOTIFY_TELEGRAM_BOT_TOKEN=')) token ||= t.split('=').slice(1).join('=').trim();
    if (t.startsWith('TG_NOTIFY_TELEGRAM_CHAT_ID=')) chatId ||= t.split('=').slice(1).join('=').trim();
  }
  return token && chatId ? { token, chatId } : null;
}

function esc(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
}

function senderName(from) {
  const m = String(from).match(/^\s*"?([^"<]+?)"?\s*</);
  return (m ? m[1] : String(from)).trim();
}

export function buildSummary(run, { url = 'http://localhost:3101/triaj' } = {}) {
  const urgent = run.items.filter((i) => i.priority === 'URGENT');
  const important = run.items.filter((i) => i.priority === 'IMPORTANT');
  const proposals = run.items.filter((i) => i.action !== 'PASTREAZA');

  const lines = [`<b>Triaj Gmail</b> — ${run.items.length} mesaje în ultimele ${run.windowDays === 1 ? '24h' : `${run.windowDays} zile`}`];

  if (urgent.length) {
    lines.push('', `🔴 <b>Urgent (${urgent.length})</b>`);
    for (const i of urgent.slice(0, 5)) lines.push(`• ${esc(senderName(i.from))} — ${esc(i.subject.slice(0, 70))}`);
    if (urgent.length > 5) lines.push(`• …încă ${urgent.length - 5}`);
  } else {
    lines.push('', '🟢 Nimic urgent.');
  }

  if (important.length) lines.push('', `🟠 Important: ${important.length}`);

  lines.push(
    '',
    proposals.length
      ? `🧹 ${proposals.length} propuneri de curățenie așteaptă bifa ta:\n${url}`
      : '✨ Nimic de curățat.'
  );

  return lines.join('\n');
}

export async function sendTelegram(text) {
  const creds = loadTelegramCreds();
  if (!creds) return { sent: false, reason: 'lipsesc datele botului Telegram' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${creds.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: creds.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { sent: false, reason: `Telegram ${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}
