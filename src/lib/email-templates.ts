import type { EmailTemplate } from '@/types/email';

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'template-thank-you',
    name: 'Thank You',
    subject: 'Thank you for your email',
    body: `Hi,

Thank you for reaching out. I appreciate your email and will get back to you as soon as possible.

Best regards`,
    category: 'thank-you',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'template-meeting-request',
    name: 'Meeting Request',
    subject: 'Meeting Request: [Topic]',
    body: `Hi,

I would like to schedule a meeting to discuss [topic].

Would you be available on [date] at [time]? If not, please let me know your availability and I will do my best to accommodate.

Best regards`,
    category: 'meeting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'template-followup',
    name: 'Follow Up',
    subject: 'Following up on our conversation',
    body: `Hi,

I wanted to follow up on our previous conversation regarding [topic].

Please let me know if you have any updates or if there's anything else I can help with.

Best regards`,
    category: 'followup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'template-confirmation',
    name: 'Confirmation',
    subject: 'Re: Confirmation',
    body: `Hi,

I'm writing to confirm that I have received your email and the information has been noted.

If you need anything else, please don't hesitate to reach out.

Best regards`,
    category: 'reply',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'template-out-of-office',
    name: 'Out of Office Response',
    subject: 'Re: Out of Office',
    body: `Hi,

Thank you for your email. I am currently out of the office with limited access to email.

I will respond to your message when I return on [date].

For urgent matters, please contact [alternate contact].

Best regards`,
    category: 'reply',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-memory storage (in production, use database)
let templates: EmailTemplate[] = [...DEFAULT_TEMPLATES];

export function getTemplates(): EmailTemplate[] {
  return templates;
}

export function getTemplateById(id: string): EmailTemplate | null {
  return templates.find(t => t.id === id) || null;
}

export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return templates.filter(t => t.category === category);
}

export function createTemplate(
  data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>
): EmailTemplate {
  const newTemplate: EmailTemplate = {
    ...data,
    id: `template-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  templates.push(newTemplate);
  return newTemplate;
}

export function updateTemplate(
  id: string,
  updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt'>>
): EmailTemplate | null {
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return null;

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return templates[index];
}

export function deleteTemplate(id: string): boolean {
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return false;

  templates.splice(index, 1);
  return true;
}

// Apply template variables
export function applyTemplateVariables(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `[${key}]`;
    subject = subject.replace(new RegExp(escapeRegex(placeholder), 'g'), value);
    body = body.replace(new RegExp(escapeRegex(placeholder), 'g'), value);
  }

  return { subject, body };
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
