// Criptare la repaus pentru token-urile Gmail păstrate pe disc.
//
// Format identic cu src/lib/encryption.ts (aes-256-cbc, cheie derivată scrypt,
// `iv:ciphertext` în base64) ca partea TS și cea .mjs să citească același fișier.
// Dacă schimbi ceva aici, schimbă și acolo — altfel token-urile devin necitibile.

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    // Aceeași cheie de rezervă ca în encryption.ts, ca fișierele scrise fără
    // ENCRYPTION_KEY să rămână citibile. Nesigură — doar pentru dezvoltare.
    return crypto.scryptSync('default-dev-key-email-guru', 'salt', KEY_LENGTH);
  }
  const salt = crypto.createHash('sha256').update('email-guru-salt').digest().slice(0, 32);
  return crypto.scryptSync(envKey, salt, KEY_LENGTH);
}

export function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let out = cipher.update(plaintext, 'utf8', 'base64');
  out += cipher.final('base64');
  return `${iv.toString('base64')}:${out}`;
}

export function decrypt(value) {
  const parts = String(value).split(':');
  if (parts.length !== 2) throw new Error('Format criptat invalid (aștept iv:ciphertext)');
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let out = decipher.update(parts[1], 'base64', 'utf8');
  out += decipher.final('utf8');
  return out;
}
