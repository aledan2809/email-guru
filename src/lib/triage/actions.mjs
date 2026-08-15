// Aplicarea deciziilor tale asupra cutiei poștale.
//
// Singurul loc din tot triajul care chiar modifică ceva în Gmail. Se apelează
// exclusiv din pagina de aprobare, pe lista pe care ai bifat-o tu.
//
// Toate acțiunile sunt reversibile din Gmail:
//   ARHIVEAZA → mesajul rămâne, iese doar din inbox
//   SPAM      → dosarul Spam, îl poți scoate
//   COS       → Coș, recuperabil 30 de zile
// Nu ștergem nimic definitiv. Nicăieri.

import { google } from 'googleapis';
import { getAuthorizedClient } from './token-store.mjs';

const OPERATIONS = {
  ARHIVEAZA: { removeLabelIds: ['INBOX'] },
  SPAM: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] },
  COS: null, // coșul are punct de intrare propriu în API (messages.trash)
};

export const APPLICABLE = Object.keys(OPERATIONS);

/**
 * Execută deciziile aprobate. Un eșec pe un mesaj nu oprește restul — raportăm
 * per mesaj ce a mers și ce nu, ca să nu rămâi cu „a mers pe jumătate" nespus.
 */
export async function applyDecisions(decisions, { account } = {}) {
  const approved = decisions.filter((d) => APPLICABLE.includes(d.action));
  if (approved.length === 0) return { account: null, applied: [] };

  const { client, email } = await getAuthorizedClient(account);
  const gmail = google.gmail({ version: 'v1', auth: client });
  const applied = [];

  for (const { id, action } of approved) {
    try {
      if (action === 'COS') {
        await gmail.users.messages.trash({ userId: 'me', id });
      } else {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: OPERATIONS[action] });
      }
      applied.push({ id, action, ok: true, at: new Date().toISOString() });
    } catch (e) {
      applied.push({
        id,
        action,
        ok: false,
        at: new Date().toISOString(),
        error: e?.response?.data?.error?.message || e.message,
      });
    }
  }

  return { account: email, applied };
}
