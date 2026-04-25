import type { Email, EmailAccount } from '@/types/email';
import type { EmailProvider, OutlookConfig } from './types';

const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

interface OutlookMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  hasAttachments: boolean;
  receivedDateTime: string;
  isRead: boolean;
  flag: { flagStatus: string };
}

export class OutlookProvider implements EmailProvider {
  private config: OutlookConfig;
  private userInfo: { email: string; name: string } | null = null;
  private connected = false;

  constructor(config: OutlookConfig) {
    this.config = config;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.config.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${MICROSOFT_GRAPH_API}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401 && this.config.refreshToken) {
      await this.refreshToken();
      return this.fetchWithAuth(endpoint, options);
    }

    return response;
  }

  private async refreshToken(): Promise<void> {
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken || '',
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.config.accessToken = data.access_token;
    if (data.refresh_token) {
      this.config.refreshToken = data.refresh_token;
    }
  }

  async connect(): Promise<void> {
    const response = await this.fetchWithAuth('/me');
    if (!response.ok) {
      throw new Error('Failed to connect to Outlook');
    }

    const data = await response.json();
    this.userInfo = {
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
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
      id: `outlook-${this.userInfo?.email || 'unknown'}`,
      email: this.userInfo?.email || '',
      provider: 'outlook',
      name: this.userInfo?.name || '',
      isConnected: this.connected,
    };
  }

  async listEmails(maxResults = 20, query?: string): Promise<Email[]> {
    let endpoint = `/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc`;

    if (query) {
      endpoint += `&$search="${encodeURIComponent(query)}"`;
    }

    const response = await this.fetchWithAuth(endpoint);
    if (!response.ok) {
      throw new Error('Failed to fetch emails');
    }

    const data = await response.json();
    const messages: OutlookMessage[] = data.value || [];

    return messages.map((msg) => this.convertToEmail(msg));
  }

  async getEmail(id: string): Promise<Email | null> {
    const response = await this.fetchWithAuth(`/me/messages/${id}`);
    if (!response.ok) {
      return null;
    }

    const msg: OutlookMessage = await response.json();
    return this.convertToEmail(msg);
  }

  private convertToEmail(msg: OutlookMessage): Email {
    return {
      id: msg.id,
      threadId: msg.conversationId,
      from: `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>`,
      to: msg.toRecipients.map(r => r.emailAddress.address),
      subject: msg.subject,
      snippet: msg.bodyPreview,
      bodyText: msg.body.contentType === 'text' ? msg.body.content : undefined,
      bodyHtml: msg.body.contentType === 'html' ? msg.body.content : undefined,
      hasAttachments: msg.hasAttachments,
      receivedAt: msg.receivedDateTime,
      isRead: msg.isRead,
      isStarred: msg.flag?.flagStatus === 'flagged',
      labels: [],
    };
  }

  async sendEmail(to: string[], subject: string, body: string, replyToId?: string): Promise<void> {
    const message = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: to.map(email => ({
          emailAddress: { address: email },
        })),
      },
      saveToSentItems: true,
    };

    const endpoint = replyToId
      ? `/me/messages/${replyToId}/reply`
      : '/me/sendMail';

    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(replyToId ? { comment: body } : message),
    });

    if (!response.ok && response.status !== 202) {
      throw new Error('Failed to send email');
    }
  }

  async markAsRead(emailId: string): Promise<void> {
    await this.fetchWithAuth(`/me/messages/${emailId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    });
  }

  async archiveEmail(emailId: string): Promise<void> {
    const archiveFolderResponse = await this.fetchWithAuth('/me/mailFolders/archive');
    if (!archiveFolderResponse.ok) {
      throw new Error('Archive folder not found');
    }

    const archiveFolder = await archiveFolderResponse.json();

    await this.fetchWithAuth(`/me/messages/${emailId}/move`, {
      method: 'POST',
      body: JSON.stringify({ destinationId: archiveFolder.id }),
    });
  }

  async deleteEmail(emailId: string): Promise<void> {
    await this.fetchWithAuth(`/me/messages/${emailId}/move`, {
      method: 'POST',
      body: JSON.stringify({ destinationId: 'deleteditems' }),
    });
  }

  async starEmail(emailId: string, starred: boolean): Promise<void> {
    await this.fetchWithAuth(`/me/messages/${emailId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        flag: { flagStatus: starred ? 'flagged' : 'notFlagged' },
      }),
    });
  }
}

export function getOutlookAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
    response_mode: 'query',
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function getOutlookTokensFromCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}
