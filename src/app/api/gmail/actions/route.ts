import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { markAsRead, archiveEmail, deleteEmail, starEmail, refreshAccessToken } from '@/lib/gmail';

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

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, emailId, starred } = body;

    if (!emailId || typeof emailId !== 'string') {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'markRead':
        await markAsRead(accessToken, emailId);
        break;
      case 'archive':
        await archiveEmail(accessToken, emailId);
        break;
      case 'delete':
        await deleteEmail(accessToken, emailId);
        break;
      case 'star':
        await starEmail(accessToken, emailId, starred ?? true);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
