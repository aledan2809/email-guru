#!/usr/bin/env node
// Autorizare Gmail, o singură dată, pentru rutina de triaj.
//
// Deschide browserul, tu aprobi, iar refresh-tokenul se salvează criptat în
// data/gmail-tokens.json ca rutina de dimineață să poată porni singură.
//
// Rulare:  npm run gmail:connect

import { createServer } from 'node:http';
import { exec } from 'node:child_process';
import { google } from 'googleapis';
import { loadEnvLocal } from './lib/load-env.mjs';
import { buildOAuthClient, saveRefreshToken, REDIRECT_URI, SCOPES } from '../src/lib/triage/token-store.mjs';

loadEnvLocal();

const redirect = new URL(REDIRECT_URI);
const port = Number(redirect.port || 80);
const client = buildOAuthClient();

// Ascultăm chiar pe adresa de retur înregistrată la Google. Dacă aplicația Next
// rulează deja pe portul ăsta, nu ne putem lega — spunem exact ce are de făcut,
// în loc să eșuăm cu „EADDRINUSE".
const { createServer: probeServer } = await import('node:net');
await new Promise((ok, fail) => {
  const probe = probeServer();
  probe.once('error', () =>
    fail(new Error(
      `Portul ${port} e ocupat — probabil rulează deja aplicația (npm run dev).\n` +
      `   Oprește-o și reia comanda, SAU conectează-te direct din aplicație:\n` +
      `   deschide http://localhost:${port} și autentifică-te cu Google — token-ul se salvează automat.`
    ))
  );
  probe.once('listening', () => probe.close(ok));
  probe.listen(port, '127.0.0.1');
}).catch((e) => { console.error(`\n❌ ${e.message}\n`); process.exit(1); });

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forțează un refresh_token nou chiar dacă ai mai aprobat cândva
  scope: SCOPES,
});

console.log('\nSe deschide browserul pentru autorizare Gmail.');
console.log('Se cer drepturile: citire mesaje + mutare în spam/coș (mutarea rămâne gardată de confirmarea ta din interfață).');
console.log('\nDacă browserul nu se deschide singur, intră manual pe:\n' + authUrl + '\n');

const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
exec(`${opener} "${authUrl}"`);

const code = await new Promise((resolvePromise, rejectPromise) => {
  const timer = setTimeout(() => {
    server.close();
    rejectPromise(new Error('Autorizarea nu s-a finalizat în 5 minute. Reia comanda.'));
  }, 5 * 60_000);

  const server = createServer((req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== redirect.pathname) {
      res.writeHead(404).end();
      return;
    }
    const c = url.searchParams.get('code');
    const err = url.searchParams.get('error');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      c
        ? '<h2>Gata. Poți închide fila.</h2><p>Autorizarea a fost salvată.</p>'
        : `<h2>Autorizare anulată</h2><p>${err || 'motiv necunoscut'}</p>`
    );
    clearTimeout(timer);
    server.close();
    c ? resolvePromise(c) : rejectPromise(new Error(`Autorizare refuzată: ${err || 'necunoscut'}`));
  });

  server.listen(port, '127.0.0.1');
});

const { tokens } = await client.getToken(code);

if (!tokens.refresh_token) {
  console.error(
    '\nGoogle nu a returnat un refresh_token, deci rutina n-ar putea porni singură.\n' +
    'Revocă accesul la https://myaccount.google.com/permissions și reia comanda.'
  );
  process.exit(1);
}

client.setCredentials(tokens);
const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
const email = data.email;
if (!email) {
  console.error('\nNu am putut citi adresa contului autorizat. Reia comanda.');
  process.exit(1);
}

saveRefreshToken(email, tokens.refresh_token, tokens.scope ? tokens.scope.split(' ') : SCOPES);

console.log(`\n✅ Cont autorizat și salvat: ${email}`);
console.log('   Fișier: data/gmail-tokens.json (criptat, drepturi 600)');
console.log('\nUrmătorul pas: npm run gmail:triage -- --dry-run\n');
