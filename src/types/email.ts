export type EmailProvider = 'gmail' | 'outlook' | 'imap';

// Built-in categories
export type BuiltinCategory =
  | 'invoice'
  | 'business-opportunity'
  | 'client-communication'
  | 'service-alert'
  | 'spam'
  | 'storage-review'
  | 'other';

// Category can be built-in or custom (any string)
export type EmailCategory = BuiltinCategory | (string & {});

export type CustomCategory = {
  id: string;
  name: string;
  color: string; // tailwind color class like 'bg-pink-500'
  gmailLabel?: string; // Gmail label to sync, e.g. 'EmailGuru/Newsletters'
  createdAt: string;
};

export type EmailClassification = {
  category: EmailCategory;
  categoryName?: string; // Human-readable name for auto-created categories
  confidence: number;
  reasons: string[];
  suggestedAction: string;
};

export type Email = {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  hasAttachments: boolean;
  attachmentsTotalBytes?: number;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  classification?: EmailClassification;
};

export type EmailAccount = {
  id: string;
  email: string;
  provider: EmailProvider;
  name: string;
  isConnected: boolean;
  picture?: string;
  isPrimary?: boolean;
};

export type ClassificationRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  action: RuleAction;
  createdAt: string;
  updatedAt: string;
};

export type RuleCondition = {
  field: 'from' | 'to' | 'subject' | 'body' | 'hasAttachments';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'is';
  value: string | boolean;
  caseSensitive?: boolean;
};

export type RuleAction = {
  type: 'classify' | 'label' | 'archive' | 'delete' | 'star' | 'markRead';
  category?: EmailCategory;
  label?: string;
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'reply' | 'followup' | 'meeting' | 'thank-you' | 'custom';
  createdAt: string;
  updatedAt: string;
};

export type InvoiceData = {
  emailId: string;
  vendor: string;
  amount: number;
  currency: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  confidence: number;
  extractedAt: string;
};

export type ScheduledJob = {
  id: string;
  type: 'classify' | 'invoice-extract' | 'cleanup';
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  accountId?: string;
};

export type ComposeEmail = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  replyToId?: string;
};

export type SmartReply = {
  id: string;
  text: string;
  tone: 'professional' | 'friendly' | 'brief';
};
