#!/usr/bin/env node
// Verificare a motorului de triaj pe cazuri construite, fără Gmail.
//
// Rostul: să prindem cazurile în care o propunere greșită doare — un email de la
// un client dus în spam, o factură ANAF la coș — înainte să atingem cutia reală.
// Perechile sunt intenționat apropiate: un „newsletter" și o „ofertă de la un om"
// arată similar, iar un model care le confundă e inutil.

import { loadEnvLocal } from './lib/load-env.mjs';
loadEnvLocal();

const { triage, PRIORITIES, ACTIONS } = await import('../src/lib/triage/engine.mjs');

const mk = (o) => ({
  id: o.id, threadId: o.id, date: 'Fri, 15 Aug 2026 08:00:00 +0300',
  labels: o.labels || ['INBOX', 'UNREAD'], unsubscribable: o.unsub || false,
  from: o.from, subject: o.subject, snippet: o.snippet,
});

// `mustNotBeDestructive` = a-l muta ar fi o greșeală costisitoare.
// `expectNoise` = ar trebui recunoscut ca zgomot (nu obligăm o acțiune anume).
const CASES = [
  { name: 'client real care așteaptă răspuns', mustNotBeDestructive: true,
    email: mk({ id: 'c1', from: 'Mihai Popescu <mihai.popescu@redogroup.ro>',
      subject: 'Re: oferta pentru modulul de reconciliere',
      snippet: 'Buna Alex, am discutat intern si vrem sa mergem mai departe. Poti trimite contractul pana vineri?' }) },

  { name: 'factură ANAF (bani + autoritate)', mustNotBeDestructive: true,
    email: mk({ id: 'c2', from: 'noreply@anaf.ro', subject: 'Notificare e-Factura - document nou',
      snippet: 'Aveti un document nou in Spatiul Privat Virtual. Termen de plata: 25.08.2026.' }) },

  { name: 'cod de verificare (securitate)', mustNotBeDestructive: true,
    email: mk({ id: 'c3', from: 'security@github.com', subject: 'Your GitHub verification code',
      snippet: 'Your verification code is 483920. If you did not request this, secure your account.' }) },

  // Prins la verificarea din 2026-08-15: modelul îl arhiva. Un anunț cu termen
  // scos din inbox e la fel de pierdut ca unul șters.
  { name: 'anunț licitație SEAP (nu iese din inbox)', mustStayInInbox: true,
    email: mk({ id: 'c4', from: 'notificari@e-licitatie.ro', subject: 'Anunt de participare - servicii IT',
      snippet: 'A fost publicat un anunt care corespunde criteriilor dumneavoastra. Termen depunere: 30.09.2026.' }) },

  { name: 'promoție comercială clară', expectNoise: true,
    email: mk({ id: 'c5', from: 'oferte@emag.ro', subject: '-70% astazi la mii de produse!',
      snippet: 'Reduceri de pana la 70%. Doar azi! Vezi ofertele acum.', unsub: true,
      labels: ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'] }) },

  { name: 'newsletter necitit', expectNoise: true,
    email: mk({ id: 'c6', from: 'newsletter@some-marketing-blog.com', subject: '5 tactici de growth pe care nu le stiai',
      snippet: 'In editia de azi: cum sa iti cresti conversia cu 300%. Citeste mai departe.', unsub: true,
      labels: ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'] }) },

  { name: 'notificare rețea socială', expectNoise: true,
    email: mk({ id: 'c7', from: 'notification@facebookmail.com', subject: 'Ai 3 notificari noi',
      snippet: 'Vezi ce s-a intamplat cat timp ai lipsit.', unsub: true,
      labels: ['INBOX', 'UNREAD', 'CATEGORY_SOCIAL'] }) },

  // Prins la verificarea din 2026-08-15, două defecte deodată: modelul credea
  // phishing-ul (URGENT, „verifică imediat"), iar plasa de siguranță îl apăra
  // fiindcă textul conținea „bcr". Acum protecția se uită la domeniu.
  { name: 'phishing care imită o bancă (nu e urgent, nu e protejat)', mustNotBeUrgent: true,
    email: mk({ id: 'c8', from: 'secure-alert@bcr-verificare-cont.xyz', subject: 'Contul dumneavoastra a fost suspendat',
      snippet: 'Confirmati datele cardului in 24 de ore pentru a evita blocarea permanenta. Click aici si confirmati datele cardului.' }) },

  // Prins la PRIMA rulare reală (2026-08-15): propus SPAM cu încredere 1.0,
  // „reclamă de marketing" — după numele aplicației, nu după expeditor.
  { name: 'raport al propriei infrastructuri (nu e reclamă)', mustNotBeDestructive: true,
    email: mk({ id: 'c11', from: 'noreply@techbiz.ae', subject: 'MA: 13 de aprobat · 0 probleme · 0 programate azi',
      snippet: 'Raport zilnic MarketingAutomation. 13 elemente asteapta aprobare.' }) },

  // Prinse la prima rulare reală (2026-08-15): ambele propuse spre arhivare.
  // Arhivate, o obligație cu termen dispare din ochi la fel de eficient ca ștearsă.
  { name: 'obligație contabilă cu termen (pontaj)', mustStayInInbox: true,
    email: mk({ id: 'c12', from: 'Keez <notificari@app.keez.ro>',
      subject: 'CLASS RDA IMPEX SRL: Pontajul pe luna trecuta trebuie introdus',
      snippet: 'Va rugam introduceti pontajul pentru luna trecuta pana la termenul limita.' }) },

  { name: 'factură de plătit de la furnizor', mustStayInInbox: true,
    email: mk({ id: 'c13', from: 'Hostico <office@hostico.ro>', subject: 'Notificare de Plată',
      snippet: 'Aveti o factura scadenta pentru serviciile de gazduire.' }) },

  { name: 'phishing cu urgență NU e salvat de regula de termene', mustNotBeUrgent: true,
    email: mk({ id: 'c14', from: 'alerta@securitate-cont-verificare.top',
      subject: 'Contul dumneavoastra expira in 24 de ore',
      snippet: 'Termenul limita este azi. Confirmati datele cardului pentru a evita suspendarea.' }) },

  { name: 'bancă adevărată (domeniu real) rămâne în inbox', mustStayInInbox: true,
    email: mk({ id: 'c10', from: 'notificari@bcr.ro', subject: 'Extras de cont disponibil',
      snippet: 'Extrasul de cont pentru luna iulie este disponibil in Internet Banking.' }) },

  { name: 'email marcat cu stea (chiar dacă pare reclamă)', mustNotBeDestructive: true,
    email: mk({ id: 'c9', from: 'oferte@furnizor.ro', subject: 'Oferta echipamente - reducere',
      snippet: 'Preturi speciale luna aceasta.', unsub: true,
      labels: ['INBOX', 'STARRED', 'CATEGORY_PROMOTIONS'] }) },
];

console.log(`Verific ${CASES.length} cazuri pe modelul local...\n`);

const items = await triage(CASES.map((c) => c.email), {
  onProgress: (d, t) => process.stdout.write(`\r  ${d}/${t}`),
});
process.stdout.write('\r');

let failures = 0;
for (const [i, c] of CASES.entries()) {
  const r = items[i];
  const destructive = r.action === 'SPAM' || r.action === 'COS';
  const problems = [];

  if (!PRIORITIES.includes(r.priority)) problems.push('prioritate invalidă');
  if (!ACTIONS.includes(r.action)) problems.push('acțiune invalidă');
  if (c.mustNotBeDestructive && destructive) problems.push('MUTAT GREȘIT (trebuia păstrat)');
  if (c.mustStayInInbox && r.action !== 'PASTREAZA') problems.push(`SCOS DIN INBOX (${r.action}) — trebuia să rămână`);
  if (c.mustNotBeUrgent && r.priority === 'URGENT') problems.push('marcat URGENT — a crezut imitația');
  if (c.expectNoise && r.priority !== 'ZGOMOT') problems.push(`aștept ZGOMOT, am primit ${r.priority}`);

  if (problems.length) failures++;
  const mark = problems.length ? '✗' : '✓';
  console.log(`${mark} ${c.name}`);
  console.log(`    ${r.priority} / ${r.action} (încredere ${r.confidence.toFixed(2)}) — ${r.reason}`);
  if (r.safetyNotes.length) console.log(`    plasă de siguranță: ${r.safetyNotes.join('; ')}`);
  if (problems.length) console.log(`    PROBLEME: ${problems.join(' | ')}`);
}

console.log(`\n${CASES.length - failures}/${CASES.length} corecte.`);
process.exit(failures ? 1 : 0);
