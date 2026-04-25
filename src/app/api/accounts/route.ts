import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { EmailAccount } from '@/types/email';
import { getImapAccounts } from '@/lib/imap-store';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accounts: EmailAccount[] = [];

    // Check Gmail account
    const gmailUser = cookieStore.get('gmail_user')?.value;
    const gmailToken = cookieStore.get('gmail_access_token')?.value;
    if (gmailUser && gmailToken) {
      try {
        const userData = JSON.parse(gmailUser);
        accounts.push({
          id: `gmail-${userData.email}`,
          email: userData.email,
          provider: 'gmail',
          name: userData.name || userData.email,
          isConnected: true,
          picture: userData.picture,
          isPrimary: true,
        });
      } catch {
        // Invalid cookie data
      }
    }

    // Check Outlook account
    const outlookUser = cookieStore.get('outlook_user')?.value;
    const outlookToken = cookieStore.get('outlook_access_token')?.value;
    if (outlookUser && outlookToken) {
      try {
        const userData = JSON.parse(outlookUser);
        accounts.push({
          id: `outlook-${userData.email}`,
          email: userData.email,
          provider: 'outlook',
          name: userData.name || userData.email,
          isConnected: true,
          isPrimary: accounts.length === 0,
        });
      } catch {
        // Invalid cookie data
      }
    }

    // Check IMAP accounts (from file store)
    const imapAccounts = getImapAccounts();
    for (const imap of imapAccounts) {
      accounts.push({
        id: imap.id,
        email: imap.email,
        provider: 'imap',
        name: imap.name,
        isConnected: true,
        isPrimary: accounts.length === 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: { accounts },
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    const cookieStore = await cookies();

    if (accountId.startsWith('gmail-')) {
      cookieStore.delete('gmail_access_token');
      cookieStore.delete('gmail_refresh_token');
      cookieStore.delete('gmail_user');
    } else if (accountId.startsWith('outlook-')) {
      cookieStore.delete('outlook_access_token');
      cookieStore.delete('outlook_refresh_token');
      cookieStore.delete('outlook_user');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing account:', error);
    return NextResponse.json(
      { error: 'Failed to remove account' },
      { status: 500 }
    );
  }
}
