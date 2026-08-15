// Încarcă .env.local pentru scripturile care rulează în afara Next.js.
//
// Next.js citește .env.local singur; un script pornit din cron nu. Parserul e
// intenționat tolerant: fișierul are valori cu spații și caractere speciale,
// pe care `source` din shell le-ar sparge.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

export function loadEnvLocal(files = ['.env.local', '.env']) {
  for (const file of files) {
    const path = resolve(PROJECT_ROOT, file);
    if (!existsSync(path)) continue;

    for (const rawLine of readFileSync(path, 'utf-8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq <= 0) continue;

      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      // Prima definiție câștigă (.env.local peste .env), iar mediul real
      // are prioritate peste ambele — altfel un cron cu variabile setate
      // explicit ar fi suprascris tăcut de fișier.
      if (process.env[key] !== undefined) continue;

      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export { PROJECT_ROOT };
