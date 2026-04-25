import { NextResponse } from 'next/server';
import { getOutlookAuthUrl } from '@/lib/email-providers/outlook-provider';

export async function GET() {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/outlook';

  if (!clientId) {
    return NextResponse.json(
      { error: 'Outlook not configured' },
      { status: 500 }
    );
  }

  const authUrl = getOutlookAuthUrl(clientId, redirectUri);
  return NextResponse.redirect(authUrl);
}
