import type { Email, EmailAccount } from '@/types/email';

export interface EmailProviderConfig {
  type: 'gmail' | 'outlook' | 'imap';
  credentials: Record<string, string>;
}

export interface EmailProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getAccount(): EmailAccount;
  listEmails(maxResults?: number, query?: string): Promise<Email[]>;
  getEmail(id: string): Promise<Email | null>;
  sendEmail(to: string[], subject: string, body: string, replyToId?: string): Promise<void>;
  markAsRead(emailId: string): Promise<void>;
  archiveEmail(emailId: string): Promise<void>;
  deleteEmail(emailId: string): Promise<void>;
  starEmail(emailId: string, starred: boolean): Promise<void>;
}

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface OutlookConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}
