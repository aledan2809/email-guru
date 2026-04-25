import { google } from 'googleapis';
import type { Email } from '@/types/email';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google'
);

export function getAuthUrl() {
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

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function setCredentials(tokens: { access_token?: string | null; refresh_token?: string | null }) {
  oauth2Client.setCredentials(tokens);
}

export async function refreshAccessToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

export async function getUserInfo(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

function parseEmailHeader(headers: { name: string; value: string }[], name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

type EmailPayload = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: EmailPayload[] | null;
};

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

export async function listEmails(accessToken: string, maxResults = 20, query?: string, pageToken?: string): Promise<{ emails: Email[]; nextPageToken?: string }> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query,
    pageToken: pageToken || undefined,
  });

  const messages = listResponse.data.messages || [];
  const nextPageToken = listResponse.data.nextPageToken || undefined;
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

  return { emails, nextPageToken };
}

export async function getEmail(accessToken: string, emailId: string): Promise<Email | null> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
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

export async function sendEmail(
  accessToken: string,
  to: string[],
  subject: string,
  body: string,
  replyToId?: string
) {
  oauth2Client.setCredentials({ access_token: accessToken });
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

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId: replyToId,
    },
  });

  return response.data;
}

export async function markAsRead(accessToken: string, emailId: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

export async function archiveEmail(accessToken: string, emailId: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
}

export async function deleteEmail(accessToken: string, emailId: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.messages.trash({
    userId: 'me',
    id: emailId,
  });
}

export async function starEmail(accessToken: string, emailId: string, starred: boolean) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: starred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] },
  });
}

// ---- Gmail Push Notifications (Pub/Sub) ----

// Start watching for new emails via Gmail Push Notifications
export async function watchInbox(accessToken: string, topicName: string): Promise<{
  historyId: string;
  expiration: string;
}> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    },
  });

  return {
    historyId: response.data.historyId || '',
    expiration: response.data.expiration || '',
  };
}

// Stop watching for push notifications
export async function stopWatch(accessToken: string): Promise<void> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.stop({
    userId: 'me',
  });
}

// Get history since a given historyId to find new messages
export async function getHistory(accessToken: string, startHistoryId: string): Promise<{
  messages: { id: string; threadId: string }[];
  historyId: string;
}> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    });

    const messages: { id: string; threadId: string }[] = [];
    const history = response.data.history || [];

    for (const h of history) {
      if (h.messagesAdded) {
        for (const msg of h.messagesAdded) {
          if (msg.message?.id && msg.message?.threadId) {
            messages.push({
              id: msg.message.id,
              threadId: msg.message.threadId,
            });
          }
        }
      }
    }

    return {
      messages,
      historyId: response.data.historyId || startHistoryId,
    };
  } catch (error) {
    // History may be invalid/expired, return empty
    console.error('Gmail history fetch error:', error);
    return { messages: [], historyId: startHistoryId };
  }
}

// ---- Gmail Label Sync ----

// Get or create a Gmail label by name (supports nested like "EmailGuru/Invoice")
export async function getOrCreateLabel(accessToken: string, labelName: string): Promise<string> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // List existing labels
  const { data } = await gmail.users.labels.list({ userId: 'me' });
  const existing = (data.labels || []).find(l => l.name === labelName);
  if (existing?.id) return existing.id;

  // Create label
  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  });

  return created.data.id || '';
}

// Apply a Gmail label to an email
export async function applyLabel(accessToken: string, emailId: string, labelName: string): Promise<void> {
  const labelId = await getOrCreateLabel(accessToken, labelName);
  if (!labelId) return;

  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: {
      addLabelIds: [labelId],
    },
  });
}
