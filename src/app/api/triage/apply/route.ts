import { NextRequest, NextResponse } from 'next/server';
import { rejectIfRemote } from '@/lib/triage/local-only';

type Decision = { id: string; action: string };

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const remote = rejectIfRemote(request);
  if (remote) return remote;

  try {
    const body = await request.json();
    const runId: string | undefined = body?.runId;
    const decisions: Decision[] = Array.isArray(body?.decisions) ? body.decisions : [];

    if (!runId) {
      return NextResponse.json({ error: 'Lipsește runId.' }, { status: 400 });
    }
    if (decisions.length === 0) {
      return NextResponse.json({ error: 'Nu ai bifat nimic.' }, { status: 400 });
    }

    const { loadRun, recordApplied } = await import('@/lib/triage/store.mjs');
    const { applyDecisions, APPLICABLE } = await import('@/lib/triage/actions.mjs');

    const run = loadRun(runId);
    if (!run) {
      return NextResponse.json({ error: 'Rularea cerută nu există.' }, { status: 404 });
    }

    // Poarta care contează: nu executăm nimic ce nu apare în rularea salvată.
    // Fără ea, o cerere trimisă direct ar putea muta orice mesaj din cutie.
    const known = new Map<string, string>(
      run.items.map((i: { id: string; action: string }) => [i.id, i.action])
    );

    const accepted: Decision[] = [];
    const rejected: { id: string; reason: string }[] = [];

    for (const d of decisions) {
      if (!known.has(d.id)) {
        rejected.push({ id: d.id, reason: 'mesajul nu face parte din rularea aprobată' });
      } else if (!APPLICABLE.includes(d.action)) {
        rejected.push({ id: d.id, reason: `acțiune nepermisă: ${d.action}` });
      } else if (known.get(d.id) !== d.action) {
        // Bifezi propunerea afișată. Dacă acțiunea trimisă nu e cea propusă,
        // înseamnă că pagina și rularea nu mai sunt în acord — mai bine refuzăm.
        rejected.push({ id: d.id, reason: `propunerea era ${known.get(d.id)}, nu ${d.action}` });
      } else {
        accepted.push(d);
      }
    }

    if (accepted.length === 0) {
      return NextResponse.json(
        { error: 'Nicio decizie validă de aplicat.', rejected },
        { status: 400 }
      );
    }

    const { account, applied } = await applyDecisions(accepted, { account: run.account });
    recordApplied(runId, applied);

    const ok = applied.filter((a: { ok: boolean }) => a.ok).length;
    return NextResponse.json({
      account,
      requested: decisions.length,
      applied: ok,
      failed: applied.length - ok,
      rejected,
      details: applied,
    });
  } catch (e) {
    console.error('[triaj] aplicarea a eșuat:', e);
    const msg = e instanceof Error ? e.message : 'Eroare necunoscută.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
