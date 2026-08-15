'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Check, Inbox, Loader2, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';

type Item = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  priority: 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'ZGOMOT';
  action: 'PASTREAZA' | 'ARHIVEAZA' | 'SPAM' | 'COS';
  reason: string;
  confidence: number;
  safetyNotes: string[];
  applied?: { ok: boolean; action: string; error?: string };
};

type Run = {
  runId: string;
  account: string;
  finishedAt: string;
  windowDays: number;
  durationSec: number;
  items: Item[];
};

const PRIORITY_ORDER = ['URGENT', 'IMPORTANT', 'NORMAL', 'ZGOMOT'] as const;

const PRIORITY_STYLE: Record<string, { label: string; chip: string; hint: string }> = {
  URGENT: { label: 'Urgent — azi', chip: 'bg-red-100 text-red-800 border-red-200', hint: 'Cer răspuns sau decizie astăzi.' },
  IMPORTANT: { label: 'Important — zilele astea', chip: 'bg-amber-100 text-amber-800 border-amber-200', hint: 'Contează, dar pot aștepta câteva zile.' },
  NORMAL: { label: 'Informativ', chip: 'bg-sky-100 text-sky-800 border-sky-200', hint: 'De știut, fără acțiune din partea ta.' },
  ZGOMOT: { label: 'Zgomot', chip: 'bg-neutral-100 text-neutral-700 border-neutral-200', hint: 'Reclame, newslettere, notificări fără valoare.' },
};

const ACTION_STYLE: Record<string, { label: string; icon: typeof Archive; chip: string }> = {
  ARHIVEAZA: { label: 'Scoate din inbox', icon: Archive, chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  SPAM: { label: 'Mută în spam', icon: ShieldAlert, chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  COS: { label: 'Mută la coș', icon: Trash2, chip: 'bg-red-50 text-red-700 border-red-200' },
};

function senderName(from: string) {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
  return (m ? m[1] : from).trim();
}

export default function TriajPage() {
  const [run, setRun] = useState<Run | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/triage/latest', { cache: 'no-store' });
      const data = await res.json();
      setRun(data.run ?? null);
      setMessage(data.message ?? null);
      setChecked(new Set());
    } catch {
      setMessage('Nu am putut citi rularea de triaj.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Propunerile deja executate nu se mai pot bifa a doua oară.
  const proposals = useMemo(
    () => (run?.items ?? []).filter((i) => i.action !== 'PASTREAZA' && !i.applied?.ok),
    [run]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const p of PRIORITY_ORDER) map.set(p, []);
    for (const item of run?.items ?? []) map.get(item.priority)?.push(item);
    return map;
  }, [run]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const apply = async () => {
    if (!run || checked.size === 0) return;
    const decisions = proposals
      .filter((p) => checked.has(p.id))
      .map((p) => ({ id: p.id, action: p.action }));

    setApplying(true);
    setResult(null);
    try {
      const res = await fetch('/api/triage/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: run.runId, decisions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Nu s-a aplicat nimic: ${data.error || 'eroare necunoscută'}`);
      } else {
        setResult(
          `Am mutat ${data.applied} din ${data.requested} mesaje.` +
          (data.failed ? ` ${data.failed} au eșuat.` : '') +
          ' Toate sunt recuperabile din Gmail.'
        );
        await load();
      }
    } catch {
      setResult('Cererea nu a ajuns la server.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <div className="flex items-center gap-2 text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă triajul…
        </div>
      </main>
    );
  }

  if (!run) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-semibold">Triaj Gmail</h1>
        <p className="mt-3 text-neutral-600">{message || 'Nicio rulare încă.'}</p>
        <pre className="mt-4 rounded-lg bg-neutral-900 p-4 text-sm text-neutral-100">npm run gmail:triage</pre>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 pb-32">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Triaj Gmail</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {run.account} · ultimele {run.windowDays} {run.windowDays === 1 ? 'zi' : 'zile'} ·{' '}
          {run.items.length} mesaje · analizat {new Date(run.finishedAt).toLocaleString('ro-RO')}
        </p>
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Nimic nu s-a mutat încă. Bifezi ce accepți, apoi apeși butonul de jos.
          Tot ce se mută rămâne recuperabil din Gmail.
        </p>
      </header>

      {PRIORITY_ORDER.map((priority) => {
        const items = grouped.get(priority) ?? [];
        if (items.length === 0) return null;
        const style = PRIORITY_STYLE[priority];

        return (
          <section key={priority} className="mb-8">
            <div className="mb-2 flex items-baseline gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-medium ${style.chip}`}>
                {style.label}
              </span>
              <span className="text-sm text-neutral-500">{items.length} · {style.hint}</span>
            </div>

            <ul className="space-y-2">
              {items.map((item) => {
                const proposal = item.action !== 'PASTREAZA' ? ACTION_STYLE[item.action] : null;
                const done = item.applied?.ok;
                const Icon = proposal?.icon;

                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 ${done ? 'border-neutral-200 bg-neutral-50 opacity-60' : 'border-neutral-200 bg-white'}`}
                  >
                    <div className="flex gap-3">
                      {proposal && !done && (
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
                          checked={checked.has(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={`${proposal.label}: ${item.subject}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-neutral-900">{senderName(item.from)}</span>
                          {proposal && (
                            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${proposal.chip}`}>
                              {Icon && <Icon className="h-3 w-3" />} {proposal.label}
                            </span>
                          )}
                          {done && (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                              <Check className="h-3 w-3" /> mutat
                            </span>
                          )}
                          {item.applied && !item.applied.ok && (
                            <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                              <AlertTriangle className="h-3 w-3" /> a eșuat
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-neutral-800">{item.subject}</p>
                        <p className="mt-1 text-sm text-neutral-500">{item.reason}</p>
                        {item.safetyNotes.length > 0 && (
                          <p className="mt-1 text-xs text-neutral-400">
                            plasă de siguranță: {item.safetyNotes.join('; ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {result && (
        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{result}</p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="text-sm text-neutral-600">
            {proposals.length === 0 ? (
              <span className="inline-flex items-center gap-1">
                <Inbox className="h-4 w-4" /> Nimic de aprobat — inboxul e curat.
              </span>
            ) : (
              <>Ai bifat <strong>{checked.size}</strong> din {proposals.length} propuneri</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              <RefreshCw className="h-4 w-4" /> Reîncarcă
            </button>
            <button
              onClick={apply}
              disabled={checked.size === 0 || applying}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Aplică {checked.size > 0 ? `(${checked.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
