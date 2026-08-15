import { NextRequest, NextResponse } from 'next/server';
import { rejectIfRemote } from '@/lib/triage/local-only';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const remote = rejectIfRemote(request);
  if (remote) return remote;

  try {
    const { loadLatestRun } = await import('@/lib/triage/store.mjs');
    const run = loadLatestRun();

    if (!run) {
      return NextResponse.json(
        { run: null, message: 'Nicio rulare de triaj încă. Rulează: npm run gmail:triage' },
        { status: 200 }
      );
    }

    return NextResponse.json({ run });
  } catch (e) {
    console.error('[triaj] citirea ultimei rulări a eșuat:', e);
    return NextResponse.json({ error: 'Nu am putut citi rularea de triaj.' }, { status: 500 });
  }
}
