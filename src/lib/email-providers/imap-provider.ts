import { ImapFlow, type FetchMessageObject } from 'imapflow';
import nodemailer from 'nodemailer';
import type { Email, EmailAccount } from '@/types/email';
import type { EmailProvider, IMAPConfig } from './types';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
}

export class IMAPProvider implements EmailProvider {
  private config: IMAPConfig;
  private smtpConfig: SMTPConfig;
  private accountName: string;
  private connected = false;

  constructor(config: IMAPConfig, smtpConfig: SMTPConfig, accountName: string) {
    this.config = config;
    this.smtpConfig = smtpConfig;
    this.accountName = accountName;
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
      logger: false,
    });
  }

  async connect(): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      this.connected = true;
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAccount(): EmailAccount {
    return {
      id: `imap-${this.config.auth.user}`,
      email: this.config.auth.user,
      provider: 'imap',
      name: this.accountName,
      isConnected: this.connected,
    };
  }

  private parseAddress(addr: { name?: string; address?: string } | undefined): string {
    if (!addr) return 'Unknown';
    if (addr.name && addr.address) return `${addr.name} <${addr.address}>`;
    return addr.address || addr.name || 'Unknown';
  }

  private parseAddressList(list: { name?: string; address?: string }[] | undefined): string[] {
    if (!list || !Array.isArray(list)) return [];
    return list.map(a => a.address || '').filter(Boolean);
  }

  private msgToEmail(msg: FetchMessageObject, bodyText?: string, bodyHtml?: string): Email {
    const env = msg.envelope || {} as Record<string, unknown>;
    const flags = msg.flags || new Set<string>();

    return {
      id: String(msg.uid),
      threadId: (env as { messageId?: string }).messageId || undefined,
      from: this.parseAddress((env as { from?: { name?: string; address?: string }[] }).from?.[0]),
      to: this.parseAddressList((env as { to?: { name?: string; address?: string }[] }).to),
      subject: (env as { subject?: string }).subject || '(no subject)',
      snippet: (bodyText || '').slice(0, 200).replace(/\s+/g, ' ').trim(),
      bodyText: bodyText || undefined,
      bodyHtml: bodyHtml || undefined,
      hasAttachments: false,
      receivedAt: (env as { date?: Date }).date?.toISOString() || new Date().toISOString(),
      isRead: flags.has('\\Seen'),
      isStarred: flags.has('\\Flagged'),
      labels: Array.from(flags).filter(f => !f.startsWith('\\')),
    };
  }

  async listEmails(maxResults = 20, query?: string): Promise<Email[]> {
    const client = this.createClient();
    const emails: Email[] = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Search for messages
        let uids: number[];
        if (query) {
          // Basic IMAP search
          const searchCriteria: Record<string, unknown> = {};
          if (query.includes('is:starred')) {
            searchCriteria.flagged = true;
          } else if (query.includes('in:sent')) {
            // Would need to open Sent folder instead
          } else {
            searchCriteria.or = [
              { subject: query.replace(/^in:\w+\s*/, '') },
              { from: query.replace(/^in:\w+\s*/, '') },
            ];
          }
          uids = await client.search(searchCriteria, { uid: true }) as unknown as number[];
        } else {
          uids = await client.search({ all: true }, { uid: true }) as unknown as number[];
        }

        // Get most recent messages
        const recentUids = uids.slice(-maxResults).reverse();

        if (recentUids.length > 0) {
          const uidRange = recentUids.join(',');
          for await (const msg of client.fetch(uidRange, {
            uid: true,
            envelope: true,
            flags: true,
            source: true,
          }, { uid: true })) {
            // Parse body from source
            let bodyText = '';
            let bodyHtml = '';
            if (msg.source) {
              const source = msg.source.toString();
              // Simple extraction from MIME
              const textMatch = source.match(/Content-Type: text\/plain[^\r\n]*\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\.\r?\n|$)/i);
              const htmlMatch = source.match(/Content-Type: text\/html[^\r\n]*\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\.\r?\n|$)/i);
              if (textMatch) bodyText = textMatch[1].trim();
              if (htmlMatch) bodyHtml = htmlMatch[1].trim();
              if (!bodyText && !bodyHtml) {
                // Single-part message
                const bodyStart = source.indexOf('\r\n\r\n');
                if (bodyStart > -1) bodyText = source.slice(bodyStart + 4).trim();
              }
            }

            emails.push(this.msgToEmail(msg, bodyText, bodyHtml));
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }

    return emails;
  }

  async getEmail(id: string): Promise<Email | null> {
    const client = this.createClient();

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        for await (const msg of client.fetch(id, {
          uid: true,
          envelope: true,
          flags: true,
          source: true,
        }, { uid: true })) {
          let bodyText = '';
          let bodyHtml = '';
          if (msg.source) {
            const source = msg.source.toString();
            const textMatch = source.match(/Content-Type: text\/plain[^\r\n]*\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\.\r?\n|$)/i);
            const htmlMatch = source.match(/Content-Type: text\/html[^\r\n]*\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\.\r?\n|$)/i);
            if (textMatch) bodyText = textMatch[1].trim();
            if (htmlMatch) bodyHtml = htmlMatch[1].trim();
            if (!bodyText && !bodyHtml) {
              const bodyStart = source.indexOf('\r\n\r\n');
              if (bodyStart > -1) bodyText = source.slice(bodyStart + 4).trim();
            }
          }
          return this.msgToEmail(msg, bodyText, bodyHtml);
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }

    return null;
  }

  async sendEmail(to: string[], subject: string, body: string, _replyToId?: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
    });

    await transporter.sendMail({
      from: this.config.auth.user,
      to: to.join(', '),
      subject,
      html: body,
    });
  }

  async markAsRead(emailId: string): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        await client.messageFlagsAdd(emailId, ['\\Seen'], { uid: true });
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async archiveEmail(emailId: string): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Try to move to Archive, fall back to marking as read
        try {
          await client.messageMove(emailId, 'Archive', { uid: true });
        } catch {
          // Archive folder doesn't exist, try "All Mail"
          try {
            await client.messageMove(emailId, '[Gmail]/All Mail', { uid: true });
          } catch {
            // Just mark as read as fallback
            await client.messageFlagsAdd(emailId, ['\\Seen'], { uid: true });
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Try to move to Trash, fall back to setting \Deleted flag
        try {
          await client.messageMove(emailId, 'Trash', { uid: true });
        } catch {
          await client.messageFlagsAdd(emailId, ['\\Deleted'], { uid: true });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async starEmail(emailId: string, starred: boolean): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        if (starred) {
          await client.messageFlagsAdd(emailId, ['\\Flagged'], { uid: true });
        } else {
          await client.messageFlagsRemove(emailId, ['\\Flagged'], { uid: true });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }
}

// Common IMAP configurations for popular providers
export const IMAP_PRESETS: Record<string, { imap: Omit<IMAPConfig, 'auth'>; smtp: SMTPConfig }> = {
  yahoo: {
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
  },
  aol: {
    imap: { host: 'imap.aol.com', port: 993, secure: true },
    smtp: { host: 'smtp.aol.com', port: 465, secure: true },
  },
  icloud: {
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false },
  },
  zoho: {
    imap: { host: 'imap.zoho.com', port: 993, secure: true },
    smtp: { host: 'smtp.zoho.com', port: 465, secure: true },
  },
  custom: {
    imap: { host: '', port: 993, secure: true },
    smtp: { host: '', port: 587, secure: false },
  },
};
