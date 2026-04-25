import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listEmails, getEmail, refreshAccessToken } from '@/lib/gmail';

async function getAccessToken() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('gmail_access_token')?.value;
  const refreshToken = cookieStore.get('gmail_refresh_token')?.value;

  if (!accessToken && refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens.access_token) {
        accessToken = newTokens.access_token;
        cookieStore.set('gmail_access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600,
        });
      }
    } catch {
      return null;
    }
  }

  return accessToken || null;
}

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const emailId = searchParams.get('id');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const query = searchParams.get('q') || undefined;
  const pageToken = searchParams.get('pageToken') || undefined;

  try {
    if (emailId) {
      const email = await getEmail(accessToken, emailId);
      if (!email) {
        return NextResponse.json(
          { error: 'Email not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: email });
    }

    const result = await listEmails(accessToken, limit, query, pageToken);
    return NextResponse.json({
      success: true,
      data: {
        emails: result.emails,
        total: result.emails.length,
        nextPageToken: result.nextPageToken,
      },
    });
  } catch (error) {
    console.error('Gmail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
