// Depozit de autorizări Gmail pe disc, per cont.
//
// De ce există: fluxul OAuth existent al aplicației ține token-ul DOAR într-un
// cookie de browser. O rutină care pornește singură dimineața nu are browser,
// deci nu are cookie. Aici păstrăm refresh-tokenul (criptat) ca rutina să poată
// obține singură un token de acces.

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import { encrypt, decrypt } from './crypto.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
export const TOKENS_PATH = resolve(PROJECT_ROOT, 'data/gmail-tokens.json');

// Drepturile cerute la autorizare. `gmail.modify` acoperă mutarea în spam/coș;
// mutarea propriu-zisă rămâne gardată de confirmarea umană din interfață.
export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Refolosim adresa de retur DEJA înregistrată la Google pentru această aplicație.
// O adresă nouă ar cere o modificare în consola Google Cloud — cost inutil.
export const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3101/api/auth/callback/google';

function readStore() {
  try {
    return existsSync(TOKENS_PATH) ? JSON.parse(readFileSync(TOKENS_PATH, 'utf-8')) : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  mkdirSync(dirname(TOKENS_PATH), { recursive: true });
  writeFileSync(TOKENS_PATH, JSON.stringify(store, null, 2), 'utf-8');
  // Fișierul deschide cutia poștală: nimeni în afară de proprietar nu-l citește.
  try { chmodSync(TOKENS_PATH, 0o600); } catch { /* FS fără permisiuni POSIX */ }
}

export function listAccounts() {
  return Object.keys(readStore());
}

export function saveRefreshToken(email, refreshToken, scopes = SCOPES) {
  if (!email) throw new Error('saveRefreshToken: lipsește adresa de email');
  if (!refreshToken) throw new Error('saveRefreshToken: lipsește refresh_token');
  const store = readStore();
  store[email] = {
    refreshToken: encrypt(refreshToken),
    scopes,
    savedAt: new Date().toISOString(),
  };
  writeStore(store);
  return email;
}

export function removeAccount(email) {
  const store = readStore();
  delete store[email];
  writeStore(store);
}

export function getStoredScopes(email) {
  const entry = readStore()[email];
  return entry?.scopes || [];
}

export function buildOAuthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      'Lipsesc GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Sunt în E-mail Guru/.env.local — ' +
      'rulează scriptul din rădăcina proiectului sau exportă-le în mediu.'
    );
  }
  return new google.auth.OAuth2(id, secret, REDIRECT_URI);
}

/**
 * Client Google autentificat pentru contul cerut, gata de folosit fără browser.
 * Aruncă un mesaj clar (nu eroarea opacă a Google) dacă autorizarea lipsește
 * sau a expirat — altfel rutina de dimineață eșuează fără să spui de ce.
 */
export async function getAuthorizedClient(email) {
  const store = readStore();
  const target = email || Object.keys(store)[0];
  const entry = target ? store[target] : null;

  if (!entry) {
    throw new Error(
      `Niciun cont autorizat${target ? ` pentru ${target}` : ''}. ` +
      'Rulează o singură dată: npm run gmail:connect'
    );
  }

  const client = buildOAuthClient();
  client.setCredentials({ refresh_token: decrypt(entry.refreshToken) });

  try {
    await client.getAccessToken();
  } catch (e) {
    const reason = e?.response?.data?.error || e?.message || 'necunoscut';
    throw new Error(
      `Autorizarea pentru ${target} nu mai e valabilă (${reason}). ` +
      'Reautorizează: npm run gmail:connect'
    );
  }

  return { client, email: target };
}
