import { NextRequest, NextResponse } from 'next/server';

/**
 * Triajul e o unealtă personală, care rulează pe mașina ta.
 *
 * `next dev` ascultă pe toate interfețele (verificat: `TCP *:3101`), deci pe o
 * rețea de birou sau de cafenea oricine putea citi expeditorii și subiectele
 * din inbox — și putea muta mesaje. Rutele de triaj răspund doar cererilor
 * venite de pe această mașină.
 */
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

function normalize(host: string) {
  return host.trim().toLowerCase().replace(/^\[|\]$/g, '').split(':')[0] || host;
}

export function rejectIfRemote(request: NextRequest): NextResponse | null {
  const url = new URL(request.url);
  const hostHeader = request.headers.get('host') || url.host;
  const hostname = normalize(hostHeader);

  if (LOCAL_HOSTS.has(hostname)) return null;

  // Un proxy inversat legitim ar pune adresa reală aici; noi nu avem niciunul,
  // deci prezența antetului înseamnă că cererea a trecut prin altceva.
  return NextResponse.json(
    {
      error:
        'Triajul răspunde doar pe această mașină. Deschide http://localhost:3101/triaj ' +
        '(nu adresa din rețea).',
    },
    { status: 403 }
  );
}
