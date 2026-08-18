// Motorul de triaj: citește inboxul, judecă fiecare mesaj, propune o acțiune.
//
// Nimic din ce e aici nu MUTĂ vreun mesaj. Produce doar un plan, pe care îl
// aprobi tu din interfață. Separarea e intenționată: propunerea greșită costă
// o bifă nedată, mutarea greșită costă un email pierdut.

import { google } from 'googleapis';
import { askJson, assertOllamaReady, MODEL } from './ollama.mjs';

export const PRIORITIES = ['URGENT', 'IMPORTANT', 'NORMAL', 'ZGOMOT'];
export const ACTIONS = ['PASTREAZA', 'ARHIVEAZA', 'SPAM', 'COS'];

// Acțiunile care scot mesajul din inbox cer o încredere peste prag. Sub el,
// propunerea coboară la „păstrează" — un mesaj rămas în inbox se ignoră ușor,
// unul mutat în spam se pierde.
const DESTRUCTIVE = new Set(['SPAM', 'COS']);
// Arhivarea nu pierde mesajul, dar îl scoate din ochi. Pentru lucrurile cu
// termen (licitații, facturi), „nu l-am mai văzut" costă la fel de mult.
const REMOVES_FROM_INBOX = new Set(['SPAM', 'COS', 'ARHIVEAZA']);
const MIN_CONFIDENCE_DESTRUCTIVE = 0.75;

const SCHEMA = {
  type: 'object',
  properties: {
    priority: { type: 'string', enum: PRIORITIES },
    action: { type: 'string', enum: ACTIONS },
    reason: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['priority', 'action', 'reason', 'confidence'],
};

const SYSTEM = `Ești asistentul care triază dimineața cutia poștală a lui Alex Danciulescu,
antreprenor român în IT (dezvoltare software, automatizări, licitații publice, consultanță).

Pentru fiecare email dai patru lucruri:

priority — cât de repede trebuie să se uite la el:
  URGENT    = cere răspuns/decizie azi (client care așteaptă, termen care expiră, problemă în producție, factură scadentă)
  IMPORTANT = contează, dar poate aștepta câteva zile (ofertă, contract, discuție de business, chestiune administrativă reală)
  NORMAL    = informativ, fără acțiune (confirmări, notificări de serviciu pe care le folosește)
  ZGOMOT    = nu merită atenție (reclame, newslettere necitite, promoții, notificări sociale)

action — ce propui să se întâmple cu el:
  PASTREAZA = rămâne în inbox
  ARHIVEAZA = iese din inbox, se păstrează (informativ, deja consumat)
  SPAM      = reclamă nesolicitată / expeditor dubios
  COS       = gunoi clar, fără valoare nici măcar de arhivă

reason — o singură propoziție scurtă, în română, de ce.
confidence — 0..1, cât de sigur ești.

Reguli care nu se încalcă:
- Dacă e scris de o persoană reală, direct către el, propui PASTREAZA. Niciodată SPAM sau COS.
- Bani, contracte, autorități, licitații, juridic, taxe: niciodată SPAM sau COS, chiar dacă par formulare.
- Coduri de verificare, resetări de parolă, alerte de securitate: PASTREAZA sau ARHIVEAZA, niciodată SPAM.
- Când eziți, alegeți varianta mai blândă și scădeți încrederea. A lăsa un email în inbox nu strică nimic.

Atenție la imitații (phishing). Te uiți ÎNTÂI la domeniul expeditorului:
- Un mesaj care se dă drept bancă, ANAF, Google sau curier, dar vine de pe un domeniu
  care nu e al instituției (ex. "bcr-verificare-cont.xyz" în loc de "bcr.ro"), este SPAM.
- Semne de imitație: urgență artificială ("contul va fi blocat în 24 de ore"), cerere de
  date de card/parolă, domeniu cu cratime sau terminații neobișnuite.
- Un astfel de mesaj NU e URGENT. Panica pe care o creează e chiar unealta atacatorului.
  Prioritatea lui este ZGOMOT, acțiunea SPAM.`;

// Protecția se decide pe DOMENIUL expeditorului, nu pe text.
//
// Motivul e un caz real prins la verificare: un phishing de pe
// `bcr-verificare-cont.xyz` conține „bcr", deci o potrivire pe text l-ar fi
// declarat „bancă" și l-ar fi ferit de spam — exact pe dos. Domeniul nu minte:
// `bcr.ro` da, `bcr-verificare-cont.xyz` nu.

/** Domenii al căror mesaj nu iese din inbox automat — au termene și bani în joc. */
const KEEP_IN_INBOX_DOMAINS = [
  'anaf.ro', 'mfinante.ro', 'e-factura.ro', 'gov.ro', 'guv.ro',
  'e-licitatie.ro', 'sicap.ro', 'seap.ro', 'licitatiapublica.ro',
  'just.ro', 'portal.just.ro', 'onrc.ro',
  'bcr.ro', 'brd.ro', 'ing.ro', 'raiffeisen.ro', 'unicredit.ro',
  'revolut.com', 'stripe.com', 'bt.ro', 'bancatransilvania.ro',
  // Contabilitate și furnizori care trimit facturi de plătit — prinse la prima
  // rulare reală: „Pontajul pe luna trecută" și „Notificare de Plată" erau
  // propuse spre arhivare.
  'keez.ro', 'app.keez.ro', 'smartbill.ro', 'oblio.eu',
  'hostico.ro', 'hostinger.com', 'hostinger.ro',
];

// Cuvinte care spun „am un termen sau bani în joc".
//
// Potrivirea pe text m-a înșelat o dată (phishing-ul cu „bcr" în domeniu), deci
// aici o folosim DOAR într-o direcție sigură: oprim arhivarea tăcută. Nu scoate
// niciodată ceva din spam sau din coș, deci un fals pozitiv costă exact atât:
// un email rămas în inbox.
const DEADLINE_WORDS = [
  'scadent', 'notificare de plat', 'de plată', 'de plata', 'pontaj', 'pontaj',
  'restant', 'penalit', 'termen limit', 'termen de depunere', 'expiră', 'expira',
  'factura ta', 'factură', 'payment due', 'invoice due', 'overdue', 'past due',
  'renewal', 'se reînnoiește', 'declaraț',
];

function mentionsDeadline(email) {
  const hay = `${email.subject} ${email.snippet}`.toLowerCase();
  return DEADLINE_WORDS.some((w) => hay.includes(w));
}

/** Domenii care nu ajung niciodată în spam/coș, dar pot fi arhivate. */
const NEVER_DISCARD_DOMAINS = [
  'github.com', 'google.com', 'accounts.google.com', 'apple.com',
  'microsoft.com', 'cloudflare.com', 'hostico.ro', 'hostinger.com',

  // Propria infrastructură. Prins la prima rulare reală (2026-08-15): raportul
  // zilnic al MarketingAutomation, de pe techbiz.ae, a fost propus spre SPAM cu
  // încredere 1.0 — „reclamă de marketing", după nume. Dus acolo, Gmail ar fi
  // învățat să filtreze propriile rapoarte de sistem, iar ele ar fi dispărut
  // tăcut. Modelul nu are de unde ști care domenii sunt ale casei; i le spunem.
  'techbiz.ae', '4pro.io', 'knowbest.ro', 'procuchain.com', 'blocx.ro',
  '4updf.com', 'teinformez.eu', 'etutor.ro', 'consj.ro', 'utilajhub.ro',
  'racex.ro', 'ave.techbiz.ae',
];

function senderDomain(from) {
  const m = String(from).match(/<([^>]+)>/) || String(from).match(/([^\s<>]+@[^\s<>]+)/);
  const addr = m ? m[1] : String(from);
  const at = addr.lastIndexOf('@');
  return at >= 0 ? addr.slice(at + 1).trim().toLowerCase().replace(/\.$/, '') : '';
}

/** Potrivire pe domeniu sau subdomeniu — `noreply.anaf.ro` intră, `anaf.ro.xyz` nu. */
function domainMatches(domain, list) {
  return list.some((d) => domain === d || domain.endsWith(`.${d}`));
}

function headerMap(payload) {
  return Object.fromEntries((payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
}

/** Citește mesajele din inbox pentru fereastra cerută. Doar metadate + fragment. */
export async function fetchInbox(auth, { days = 1, max = 200 } = {}) {
  const gmail = google.gmail({ version: 'v1', auth });
  const q = `in:inbox newer_than:${days}d`;
  const out = [];
  let pageToken;

  do {
    const list = await gmail.users.messages.list({
      userId: 'me',
      q,
      // Plafonat la minimum 1: chiar dacă un apelant trimite o limită absurdă,
      // Gmail primește o cerere validă, nu o eroare fără explicație.
      maxResults: Math.max(1, Math.min(100, max - out.length)),
      pageToken,
    });
    const msgs = list.data.messages || [];
    for (const { id } of msgs) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date', 'List-Unsubscribe'],
      });
      const h = headerMap(full.data.payload);
      out.push({
        id,
        threadId: full.data.threadId,
        from: h.from || '(necunoscut)',
        subject: h.subject || '(fără subiect)',
        date: h.date || '',
        snippet: full.data.snippet || '',
        labels: full.data.labelIds || [],
        unsubscribable: Boolean(h['list-unsubscribe']),
      });
      if (out.length >= max) break;
    }
    pageToken = list.data.nextPageToken;
  } while (pageToken && out.length < max);

  return out;
}

function buildPrompt(email) {
  // Etichetele proprii ale Gmail sunt un semnal ieftin și bun — le dăm modelului
  // drept context, nu drept verdict.
  const gmailHints = [
    email.labels.includes('CATEGORY_PROMOTIONS') && 'Gmail l-a pus la Promoții',
    email.labels.includes('CATEGORY_SOCIAL') && 'Gmail l-a pus la Rețele sociale',
    email.labels.includes('CATEGORY_UPDATES') && 'Gmail l-a pus la Actualizări',
    email.labels.includes('IMPORTANT') && 'Gmail l-a marcat important',
    email.labels.includes('UNREAD') ? 'necitit' : 'citit deja',
    email.unsubscribable && 'are link de dezabonare (listă de difuzare)',
  ].filter(Boolean).join('; ');

  return `${SYSTEM}

--- EMAIL ---
De la: ${email.from}
Domeniul expeditorului: ${senderDomain(email.from) || '(nedetectabil)'}
Subiect: ${email.subject}
Data: ${email.date}
Semnale Gmail: ${gmailHints || 'niciunul'}
Fragment: ${email.snippet.slice(0, 600)}
--- SFÂRȘIT ---

Răspunde doar cu obiectul JSON cerut.`;
}

/** Coboară propunerile riscante la varianta sigură. Rulează DUPĂ model, mereu. */
function applySafetyNet(email, verdict) {
  const notes = [];
  let { priority, action, reason, confidence } = verdict;

  if (!PRIORITIES.includes(priority)) { priority = 'NORMAL'; notes.push('prioritate necunoscută → NORMAL'); }
  if (!ACTIONS.includes(action)) { action = 'PASTREAZA'; notes.push('acțiune necunoscută → PASTREAZA'); }
  confidence = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;

  const domain = senderDomain(email.from);

  if (REMOVES_FROM_INBOX.has(action) && domainMatches(domain, KEEP_IN_INBOX_DOMAINS)) {
    action = 'PASTREAZA';
    notes.push(`expeditor cu termene/bani (${domain}) — rămâne în inbox`);
  }
  if (DESTRUCTIVE.has(action) && domainMatches(domain, NEVER_DISCARD_DOMAINS)) {
    action = 'ARHIVEAZA';
    notes.push(`furnizor de cont/securitate (${domain}) — arhivat, nu aruncat`);
  }
  // Oprim doar arhivarea. Dacă modelul a spus spam/coș, îl lăsăm — altfel un
  // phishing care strigă „contul expiră" ar fi salvat exact de regula asta.
  if (action === 'ARHIVEAZA' && mentionsDeadline(email)) {
    action = 'PASTREAZA';
    notes.push('pomenește un termen sau o plată — rămâne în inbox');
  }
  if (DESTRUCTIVE.has(action) && email.labels.includes('STARRED')) {
    action = 'PASTREAZA';
    notes.push('mesaj marcat cu stea de tine');
  }
  if (DESTRUCTIVE.has(action) && confidence < MIN_CONFIDENCE_DESTRUCTIVE) {
    action = 'PASTREAZA';
    notes.push(`încredere ${confidence.toFixed(2)} sub pragul ${MIN_CONFIDENCE_DESTRUCTIVE}`);
  }

  return { priority, action, reason: reason || '(fără motiv)', confidence, safetyNotes: notes };
}

/**
 * Triază lista de mesaje. `onProgress` primește (câte gata, câte în total) ca
 * rularea lungă să nu pară blocată.
 */
export async function triage(emails, { onProgress } = {}) {
  await assertOllamaReady();
  const results = [];

  for (const [i, email] of emails.entries()) {
    const verdict = await askJson(buildPrompt(email), SCHEMA);
    const judged = verdict
      ? applySafetyNet(email, verdict)
      : {
          priority: 'NORMAL',
          action: 'PASTREAZA',
          reason: 'nu a putut fi judecat de modelul local — rămâne în inbox',
          confidence: 0,
          safetyNotes: ['model indisponibil sau răspuns invalid'],
        };

    results.push({ ...email, ...judged, model: MODEL });
    onProgress?.(i + 1, emails.length);
  }

  return results;
}
