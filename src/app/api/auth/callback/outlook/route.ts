import { NextRequest, NextResponse } from 'next/server';
import { getOutlookTokensFromCode, OutlookProvider } from '@/lib/email-providers/outlook-provider';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=outlook_auth_failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const clientId = process.env.OUTLOOK_CLIENT_ID!;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET!;
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/outlook';

    const tokens = await getOutlookTokensFromCode(code, clientId, clientSecret, redirectUri);

    const provider = new OutlookProvider({
      clientId,
      clientSecret,
      redirectUri,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    await provider.connect();
    const account = provider.getAccount();

    const cookieStore = await cookies();

    cookieStore.set('outlook_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
    });

    cookieStore.set('outlook_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    cookieStore.set('outlook_user', JSON.stringify({
      email: account.email,
      name: account.name,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err) {
    console.error('Outlook auth error:', err);
    return NextResponse.redirect(new URL('/?error=outlook_auth_failed', request.url));
  }
}
