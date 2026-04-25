import { google } from 'googleapis';
import type { Email, EmailAccount } from '@/types/email';
import type { EmailProvider } from './types';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google'
);

type EmailPayload = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: EmailPayload[] | null;
};

function parseEmailHeader(headers: { name: string; value: string }[], name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function parseEmailBody(payload: EmailPayload): { text: string; html: string } {
  let text = '';
  let html = '';

  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    if (payload.mimeType === 'text/plain') {
      text = decoded;
    } else if (payload.mimeType === 'text/html') {
      html = decoded;
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const { text: t, html: h } = parseEmailBody(part);
      if (t) text = t;
      if (h) html = h;
    }
  }

  return { text, html };
}

export class GmailProvider implements EmailProvider {
  private accessToken: string;
  private refreshToken?: string;
  private userInfo: { email: string; name: string; picture?: string } | null = null;
  private connected = false;

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async connect(): Promise<void> {
    oauth2Client.setCredentials({
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
    });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    this.userInfo = {
      email: data.email || '',
      name: data.name || '',
      picture: data.picture || undefined,
    };
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.userInfo = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAccount(): EmailAccount {
    return {
      id: `gmail-${this.userInfo?.email || 'unknown'}`,
      email: this.userInfo?.email || '',
      provider: 'gmail',
      name: this.userInfo?.name || '',
      isConnected: this.connected,
    };
  }

  async listEmails(maxResults = 20, query?: string): Promise<Email[]> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });

    const messages = listResponse.data.messages || [];
    const emails: Email[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;

      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const message = msgResponse.data;
      const headers = (message.payload?.headers || []) as { name: string; value: string }[];
      const { text, html } = parseEmailBody(message.payload || {});

      const attachments = (message.payload?.parts || []).filter(
        (p) => p.filename && p.filename.length > 0
      );
      const attachmentBytes = attachments.reduce(
        (sum, a) => sum + (a.body?.size || 0),
        0
      );

      emails.push({
        id: message.id || '',
        threadId: message.threadId || undefined,
        from: parseEmailHeader(headers, 'From'),
        to: parseEmailHeader(headers, 'To').split(',').map(s => s.trim()).filter(Boolean),
        subject: parseEmailHeader(headers, 'Subject'),
        snippet: message.snippet || '',
        bodyText: text,
        bodyHtml: html,
        hasAttachments: attachments.length > 0,
        attachmentsTotalBytes: attachmentBytes,
        receivedAt: new Date(parseInt(message.internalDate || '0', 10)).toISOString(),
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED') || false,
        labels: message.labelIds || [],
      });
    }

    return emails;
  }

  async getEmail(id: string): Promise<Email | null> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      });

      const message = response.data;
      const headers = (message.payload?.headers || []) as { name: string; value: string }[];
      const { text, html } = parseEmailBody(message.payload || {});

      const attachments = (message.payload?.parts || []).filter(
        (p) => p.filename && p.filename.length > 0
      );
      const attachmentBytes = attachments.reduce(
        (sum, a) => sum + (a.body?.size || 0),
        0
      );

      return {
        id: message.id || '',
        threadId: message.threadId || undefined,
        from: parseEmailHeader(headers, 'From'),
        to: parseEmailHeader(headers, 'To').split(',').map(s => s.trim()).filter(Boolean),
        subject: parseEmailHeader(headers, 'Subject'),
        snippet: message.snippet || '',
        bodyText: text,
        bodyHtml: html,
        hasAttachments: attachments.length > 0,
        attachmentsTotalBytes: attachmentBytes,
        receivedAt: new Date(parseInt(message.internalDate || '0', 10)).toISOString(),
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED') || false,
        labels: message.labelIds || [],
      };
    } catch {
      return null;
    }
  }

  async sendEmail(to: string[], subject: string, body: string, replyToId?: string): Promise<void> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = [
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: replyToId,
      },
    });
  }

  async markAsRead(emailId: string): Promise<void> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  async archiveEmail(emailId: string): Promise<void> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });
  }

  async deleteEmail(emailId: string): Promise<void> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.trash({
      userId: 'me',
      id: emailId,
    });
  }

  async starEmail(emailId: string, starred: boolean): Promise<void> {
    oauth2Client.setCredentials({ access_token: this.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: starred
        ? { addLabelIds: ['STARRED'] }
        : { removeLabelIds: ['STARRED'] },
    });
  }
}

export function getGmailAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
  });
}

export async function getGmailTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshGmailAccessToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}
