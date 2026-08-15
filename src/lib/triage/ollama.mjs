// Judecata pe emailuri rulează STRICT pe Ollama local.
//
// Corespondența privată nu pleacă de pe mașină — asta nu e o preferință de cost,
// e o promisiune. Modulul refuză să pornească dacă adresa Ollama nu e locală.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

export const MODEL = process.env.GMAIL_TRIAGE_MODEL || 'qwen2.5:32b';

function assertLocalOllama() {
  let host;
  try {
    host = new URL(OLLAMA_URL).hostname.toLowerCase();
  } catch {
    throw new Error(`OLLAMA_URL invalid: ${OLLAMA_URL}`);
  }
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
    /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (!isLocal) {
    throw new Error(
      `Refuz: OLLAMA_URL (${host}) nu e o adresă locală/privată. ` +
      'Analiza pe emailuri trebuie să rămână pe mașină. Setează OLLAMA_URL la 127.0.0.1.'
    );
  }
}

export async function assertOllamaReady() {
  assertLocalOllama();
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new Error(`Ollama nu răspunde la ${OLLAMA_URL}. Pornește-l: ollama serve`);
  }
  const { models = [] } = await res.json();
  const names = models.map((m) => m.name);
  if (!names.includes(MODEL)) {
    throw new Error(
      `Modelul ${MODEL} nu e instalat. Instalează-l (ollama pull ${MODEL}) ` +
      `sau alege altul din cele existente prin GMAIL_TRIAGE_MODEL: ${names.join(', ') || '(niciunul)'}`
    );
  }
  return { url: OLLAMA_URL, model: MODEL };
}

/**
 * Cere modelului local un obiect JSON, cu schema impusă prin decodare pe gramatică.
 * Întoarce null în loc să arunce — un mesaj care nu poate fi judecat trebuie să
 * cadă pe ramura sigură („păstrează"), nu să oprească întregul triaj.
 */
export async function askJson(prompt, schema, { timeoutMs = 120_000 } = {}) {
  assertLocalOllama();
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        format: schema,
        options: { temperature: 0.1, num_ctx: 8192 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data.response);
  } catch {
    return null;
  }
}
