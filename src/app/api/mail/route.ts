import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  listEmails, getEmail, refreshAccessToken,
  sendEmail, markAsRead, archiveEmail, deleteEmail, starEmail,
} from '@/lib/gmail';
import { OutlookProvider } from '@/lib/email-providers/outlook-provider';
import { IMAPProvider, type SMTPConfig } from '@/lib/email-providers/imap-provider';
import type { IMAPConfig } from '@/lib/email-providers/types';
import { getImapAccount } from '@/lib/imap-store';

async function getGmailAccessToken() {
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

async function getOutlookInstance() {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3101/api/auth/callback/outlook';

  if (!clientId || !clientSecret) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('outlook_access_token')?.value;
  if (!accessToken) return null;

  return new OutlookProvider({
    clientId,
    clientSecret,
    redirectUri,
    accessToken,
    refreshToken: cookieStore.get('outlook_refresh_token')?.value,
  });
}

// GET /api/mail?provider=gmail|outlook&id=emailId&q=query&limit=20
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const provider = params.get('provider') || 'gmail';
  const emailId = params.get('id');
  const limit = parseInt(params.get('limit') || '20', 10);
  const query = params.get('q') || undefined;

  try {
    if (provider === 'gmail') {
      const accessToken = await getGmailAccessToken();
      if (!accessToken) {
        return NextResponse.json({ error: 'Not authenticated', code: 'UNAUTHORIZED' }, { status: 401 });
      }

      if (emailId) {
        const email = await getEmail(accessToken, emailId);
        if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: email });
      }

      const pageToken = params.get('pageToken') || undefined;
      const result = await listEmails(accessToken, limit, query, pageToken);
      return NextResponse.json({ success: true, data: { emails: result.emails, total: result.emails.length, nextPageToken: result.nextPageToken } });
    }

    if (provider === 'outlook') {
      const outlook = await getOutlookInstance();
      if (!outlook) {
        return NextResponse.json({ error: 'Outlook not authenticated', code: 'UNAUTHORIZED' }, { status: 401 });
      }

      if (emailId) {
        const email = await outlook.getEmail(emailId);
        if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: email });
      }

      const emails = await outlook.listEmails(limit, query);
      return NextResponse.json({ success: true, data: { emails, total: emails.length } });
    }

    if (provider === 'imap') {
      const accountId = params.get('accountId');
      if (!accountId) {
        return NextResponse.json({ error: 'accountId required for IMAP' }, { status: 400 });
      }

      const imapAccount = getImapAccount(accountId);
      if (!imapAccount) {
        return NextResponse.json({ error: 'IMAP account not found', code: 'UNAUTHORIZED' }, { status: 401 });
      }

      const imap = new IMAPProvider(
        { host: imapAccount.imapHost, port: imapAccount.imapPort, secure: imapAccount.imapSecure, auth: { user: imapAccount.username, pass: imapAccount.password } },
        { host: imapAccount.smtpHost, port: imapAccount.smtpPort, secure: imapAccount.smtpSecure },
        imapAccount.name
      );

      if (emailId) {
        const email = await imap.getEmail(emailId);
        if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: email });
      }

      const emails = await imap.listEmails(limit, query);
      return NextResponse.json({ success: true, data: { emails, total: emails.length } });
    }

    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (error) {
    console.error(`Email API error (${provider}):`, error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// POST /api/mail - send or perform actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider = 'gmail', action, emailId, to, subject, body: emailBody, replyToId, starred } = body;

    if (provider === 'gmail') {
      const accessToken = await getGmailAccessToken();
      if (!accessToken) {
        return NextResponse.json({ error: 'Not authenticated', code: 'UNAUTHORIZED' }, { status: 401 });
      }

      switch (action) {
        case 'send':
          await sendEmail(accessToken, to, subject, emailBody, replyToId);
          return NextResponse.json({ success: true });
        case 'markRead':
          await markAsRead(accessToken, emailId);
          return NextResponse.json({ success: true });
        case 'archive':
          await archiveEmail(accessToken, emailId);
          return NextResponse.json({ success: true });
        case 'delete':
          await deleteEmail(accessToken, emailId);
          return NextResponse.json({ success: true });
        case 'star':
          await starEmail(accessToken, emailId, starred);
          return NextResponse.json({ success: true });
      }
    }

    if (provider === 'outlook') {
      const outlook = await getOutlookInstance();
      if (!outlook) {
        return NextResponse.json({ error: 'Outlook not authenticated', code: 'UNAUTHORIZED' }, { status: 401 });
      }

      switch (action) {
        case 'send':
          await outlook.sendEmail(to, subject, emailBody, replyToId);
          return NextResponse.json({ success: true });
        case 'markRead':
          await outlook.markAsRead(emailId);
          return NextResponse.json({ success: true });
        case 'archive':
          await outlook.archiveEmail(emailId);
          return NextResponse.json({ success: true });
        case 'delete':
          await outlook.deleteEmail(emailId);
          return NextResponse.json({ success: true });
        case 'star':
          await outlook.starEmail(emailId, starred);
          return NextResponse.json({ success: true });
      }
    }

    if (provider === 'imap') {
      const { accountId } = body;
      if (!accountId) {
        return NextResponse.json({ error: 'accountId required for IMAP' }, { status: 400 });
      }

      const imapAccount = getImapAccount(accountId);
      if (!imapAccount) {
        return NextResponse.json({ error: 'IMAP account not found', code: 'UNAUTHORIZED' }, { status: 401 });
      }

      const imap = new IMAPProvider(
        { host: imapAccount.imapHost, port: imapAccount.imapPort, secure: imapAccount.imapSecure, auth: { user: imapAccount.username, pass: imapAccount.password } },
        { host: imapAccount.smtpHost, port: imapAccount.smtpPort, secure: imapAccount.smtpSecure },
        imapAccount.name
      );

      switch (action) {
        case 'send':
          await imap.sendEmail(to, subject, emailBody, replyToId);
          return NextResponse.json({ success: true });
        case 'markRead':
          await imap.markAsRead(emailId);
          return NextResponse.json({ success: true });
        case 'archive':
          await imap.archiveEmail(emailId);
          return NextResponse.json({ success: true });
        case 'delete':
          await imap.deleteEmail(emailId);
          return NextResponse.json({ success: true });
        case 'star':
          await imap.starEmail(emailId, starred);
          return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Email action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
