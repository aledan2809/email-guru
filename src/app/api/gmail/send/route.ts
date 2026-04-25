import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sendEmail, refreshAccessToken } from '@/lib/gmail';

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
    const { to, subject, body: emailBody, replyToId } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Recipients (to) are required' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!emailBody || typeof emailBody !== 'string') {
      return NextResponse.json(
        { error: 'Email body is required' },
        { status: 400 }
      );
    }

    const result = await sendEmail(accessToken, to, subject, emailBody, replyToId);

    return NextResponse.json({
      success: true,
      data: { messageId: result.id },
    });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
