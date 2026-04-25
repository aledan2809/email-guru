export type EmailProvider = 'gmail' | 'outlook' | 'imap';

export type ClassifyEmailRequest = {
  provider: EmailProvider;
  accountId: string;
  email: {
    id: string;
    from: string;
    subject: string;
    bodyText?: string;
    hasAttachments?: boolean;
    attachmentsTotalBytes?: number;
    receivedAt?: string;
  };
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: string[] };

const PROVIDERS: EmailProvider[] = ['gmail', 'outlook', 'imap'];
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

type Category =
  | 'invoice'
  | 'business-opportunity'
  | 'client-communication'
  | 'service-alert'
  | 'spam'
  | 'storage-review'
  | 'other';

const CATEGORY_RULES: Array<{ category: Category; keywords: string[] }> = [
  { category: 'invoice', keywords: ['invoice', 'factura', 'payment due', 'billing'] },
  {
    category: 'business-opportunity',
    keywords: ['partnership', 'proposal', 'lead', 'opportunity', 'collaboration'],
  },
  {
    category: 'client-communication',
    keywords: ['client', 'meeting', 'feedback', 'project update', 'status'],
  },
  { category: 'service-alert', keywords: ['down', 'incident', 'error', 'failed', 'outage'] },
  { category: 'spam', keywords: ['lottery', 'winner', 'crypto profit', 'urgent transfer'] },
  {
    category: 'storage-review',
    keywords: ['attachment', 'archive', 'mailbox full', 'storage'],
  },
];

export function validateClassifyEmailRequest(
  payload: unknown,
): ValidationResult<ClassifyEmailRequest> {
  const issues: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { ok: false, issues: ['Payload must be a JSON object.'] };
  }

  const data = payload as Partial<ClassifyEmailRequest>;
  const email = data.email as Partial<ClassifyEmailRequest['email']> | undefined;
  const provider =
    typeof data.provider === 'string'
      ? (data.provider.trim().toLowerCase() as EmailProvider)
      : undefined;
  const accountId = typeof data.accountId === 'string' ? data.accountId.trim() : '';
  const emailId = typeof email?.id === 'string' ? email.id.trim() : '';
  const emailFrom = typeof email?.from === 'string' ? email.from.trim() : '';
  const emailSubject = typeof email?.subject === 'string' ? email.subject.trim() : '';
  const emailBodyText = typeof email?.bodyText === 'string' ? email.bodyText.trim() : undefined;

  if (!provider || !PROVIDERS.includes(provider)) {
    issues.push('provider is required and must be one of: gmail, outlook, imap.');
  }

  if (!accountId || accountId.length < 2) {
    issues.push('accountId is required and must be at least 2 characters.');
  }

  if (!email || typeof email !== 'object') {
    issues.push('email is required and must be an object.');
  } else {
    if (!emailId) {
      issues.push('email.id is required and must be a string.');
    }
    if (!emailFrom) {
      issues.push('email.from is required and must be a string.');
    } else if (!emailFrom.includes('@')) {
      issues.push('email.from must contain a valid email address.');
    }
    if (!emailSubject) {
      issues.push('email.subject is required and must be a string.');
    }
    if (email.bodyText !== undefined && typeof email.bodyText !== 'string') {
      issues.push('email.bodyText must be a string when provided.');
    }
    if (email.hasAttachments !== undefined && typeof email.hasAttachments !== 'boolean') {
      issues.push('email.hasAttachments must be a boolean when provided.');
    }
    if (
      email.attachmentsTotalBytes !== undefined &&
      (typeof email.attachmentsTotalBytes !== 'number' ||
        !Number.isFinite(email.attachmentsTotalBytes) ||
        email.attachmentsTotalBytes < 0 ||
        email.attachmentsTotalBytes > MAX_ATTACHMENT_BYTES)
    ) {
      issues.push(
        `email.attachmentsTotalBytes must be a finite non-negative number up to ${MAX_ATTACHMENT_BYTES} when provided.`,
      );
    }
    if (email.receivedAt !== undefined) {
      if (typeof email.receivedAt !== 'string') {
        issues.push('email.receivedAt must be an ISO date string when provided.');
      } else if (Number.isNaN(Date.parse(email.receivedAt))) {
        issues.push('email.receivedAt must be a valid ISO date string when provided.');
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    data: {
      provider: provider as EmailProvider,
      accountId,
      email: {
        id: emailId,
        from: emailFrom,
        subject: emailSubject,
        bodyText: emailBodyText,
        hasAttachments: email?.hasAttachments ?? false,
        attachmentsTotalBytes: email?.attachmentsTotalBytes ?? 0,
        receivedAt: email?.receivedAt,
      },
    },
  };
}

export function classifyEmail(input: ClassifyEmailRequest) {
  const searchableText = `${input.email.subject} ${input.email.bodyText ?? ''}`.toLowerCase();
  let selectedCategory: Category = 'other';
  const reasons: string[] = [];

  for (const rule of CATEGORY_RULES) {
    const matched = rule.keywords.filter((kw) => searchableText.includes(kw));
    if (matched.length > 0) {
      selectedCategory = rule.category;
      reasons.push(`Matched keywords: ${matched.join(', ')}`);
      break;
    }
  }

  if (selectedCategory === 'storage-review') {
    const largeAttachment =
      input.email.hasAttachments && (input.email.attachmentsTotalBytes ?? 0) > 5 * 1024 * 1024;
    if (largeAttachment) {
      reasons.push('Detected large attachments (>5MB).');
    }
  }

  const confidence = selectedCategory === 'other' ? 0.45 : 0.78;

  return {
    category: selectedCategory,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['No strong keyword signals detected.'],
    suggestedAction: 'review',
  };
}
