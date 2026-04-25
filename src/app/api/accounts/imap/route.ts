import { NextRequest, NextResponse } from 'next/server';
import { addImapAccount, getImapAccounts, removeImapAccount } from '@/lib/imap-store';
import { IMAPProvider } from '@/lib/email-providers/imap-provider';

// POST /api/accounts/imap - Add IMAP account (tests connection first)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, username, password } = body;

    if (!email || !imapHost || !username || !password) {
      return NextResponse.json({ error: 'email, imapHost, username, and password are required' }, { status: 400 });
    }

    // Test IMAP connection
    const provider = new IMAPProvider(
      { host: imapHost, port: imapPort || 993, secure: imapSecure !== false, auth: { user: username, pass: password } },
      { host: smtpHost || imapHost.replace('imap', 'smtp'), port: smtpPort || 587, secure: smtpSecure || false },
      name || email
    );

    try {
      await provider.connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      return NextResponse.json({ error: `IMAP connection failed: ${msg}` }, { status: 400 });
    }

    // Save account
    const account = addImapAccount({
      name: name || email,
      email,
      imapHost,
      imapPort: imapPort || 993,
      imapSecure: imapSecure !== false,
      smtpHost: smtpHost || imapHost.replace('imap', 'smtp'),
      smtpPort: smtpPort || 587,
      smtpSecure: smtpSecure || false,
      username,
      password,
    });

    return NextResponse.json({
      success: true,
      data: { id: account.id, email: account.email, name: account.name },
    });
  } catch (error) {
    console.error('Error adding IMAP account:', error);
    return NextResponse.json({ error: 'Failed to add account' }, { status: 500 });
  }
}

// GET /api/accounts/imap - List IMAP accounts
export async function GET() {
  try {
    const accounts = getImapAccounts();
    return NextResponse.json({
      success: true,
      data: accounts.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        imapHost: a.imapHost,
        smtpHost: a.smtpHost,
      })),
    });
  } catch (error) {
    console.error('Error listing IMAP accounts:', error);
    return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 });
  }
}

// DELETE /api/accounts/imap - Remove IMAP account
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const removed = removeImapAccount(id);
    if (!removed) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing IMAP account:', error);
    return NextResponse.json({ error: 'Failed to remove account' }, { status: 500 });
  }
}
