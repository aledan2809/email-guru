import type { Email, EmailClassification, ClassificationRule, RuleCondition } from '@/types/email';

// Default rules that come with the app
export const DEFAULT_RULES: ClassificationRule[] = [
  {
    id: 'rule-invoice-keywords',
    name: 'Invoice Detection',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'subject', operator: 'contains', value: 'invoice', caseSensitive: false },
    ],
    action: { type: 'classify', category: 'invoice' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-invoice-factura',
    name: 'Romanian Invoice (Factura)',
    enabled: true,
    priority: 1,
    conditions: [
      { field: 'subject', operator: 'contains', value: 'factura', caseSensitive: false },
    ],
    action: { type: 'classify', category: 'invoice' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-service-alert',
    name: 'Service Alerts',
    enabled: true,
    priority: 2,
    conditions: [
      { field: 'from', operator: 'contains', value: 'noreply', caseSensitive: false },
      { field: 'subject', operator: 'regex', value: '(alert|warning|outage|down|error|failed)', caseSensitive: false },
    ],
    action: { type: 'classify', category: 'service-alert' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-spam-unsubscribe',
    name: 'Promotional Emails',
    enabled: true,
    priority: 10,
    conditions: [
      { field: 'body', operator: 'contains', value: 'unsubscribe', caseSensitive: false },
    ],
    action: { type: 'classify', category: 'spam' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-large-attachments',
    name: 'Large Attachments',
    enabled: true,
    priority: 5,
    conditions: [
      { field: 'hasAttachments', operator: 'is', value: true },
    ],
    action: { type: 'classify', category: 'storage-review' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function evaluateCondition(email: Email, condition: RuleCondition): boolean {
  let fieldValue: string | boolean;

  switch (condition.field) {
    case 'from':
      fieldValue = email.from;
      break;
    case 'to':
      fieldValue = email.to.join(', ');
      break;
    case 'subject':
      fieldValue = email.subject;
      break;
    case 'body':
      fieldValue = email.bodyText || email.snippet || '';
      break;
    case 'hasAttachments':
      fieldValue = email.hasAttachments;
      break;
    default:
      return false;
  }

  // Handle boolean comparisons
  if (condition.operator === 'is') {
    return fieldValue === condition.value;
  }

  // String comparisons
  if (typeof fieldValue !== 'string' || typeof condition.value !== 'string') {
    return false;
  }

  const searchValue = condition.caseSensitive
    ? condition.value
    : condition.value.toLowerCase();
  const compareValue = condition.caseSensitive
    ? fieldValue
    : fieldValue.toLowerCase();

  switch (condition.operator) {
    case 'contains':
      return compareValue.includes(searchValue);
    case 'equals':
      return compareValue === searchValue;
    case 'startsWith':
      return compareValue.startsWith(searchValue);
    case 'endsWith':
      return compareValue.endsWith(searchValue);
    case 'regex':
      try {
        const flags = condition.caseSensitive ? '' : 'i';
        const regex = new RegExp(condition.value, flags);
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateRule(email: Email, rule: ClassificationRule): boolean {
  if (!rule.enabled) return false;

  // All conditions must match (AND logic)
  return rule.conditions.every(condition => evaluateCondition(email, condition));
}

export function applyRules(email: Email, rules: ClassificationRule[]): EmailClassification | null {
  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateRule(email, rule)) {
      if (rule.action.type === 'classify' && rule.action.category) {
        return {
          category: rule.action.category,
          confidence: 0.9, // High confidence for rule-based classification
          reasons: [`Matched rule: ${rule.name}`],
          suggestedAction: getActionForCategory(rule.action.category),
        };
      }
    }
  }

  return null;
}

function getActionForCategory(category: string): string {
  const actionMap: Record<string, string> = {
    'invoice': 'Save to invoices folder and add to accounting queue',
    'business-opportunity': 'Flag for review and schedule follow-up',
    'client-communication': 'Review and respond within 24 hours',
    'service-alert': 'Check affected service immediately',
    'spam': 'Move to spam and block sender',
    'storage-review': 'Download attachments and archive email',
    'other': 'Review manually',
  };

  return actionMap[category] || 'Review manually';
}

// Storage helpers using localStorage on client side
export function saveRules(rules: ClassificationRule[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('email_guru_rules', JSON.stringify(rules));
  }
}

export function loadRules(): ClassificationRule[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('email_guru_rules');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_RULES;
      }
    }
  }
  return DEFAULT_RULES;
}

export function addRule(rule: Omit<ClassificationRule, 'id' | 'createdAt' | 'updatedAt'>): ClassificationRule {
  const newRule: ClassificationRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rules = loadRules();
  rules.push(newRule);
  saveRules(rules);

  return newRule;
}

export function updateRule(id: string, updates: Partial<ClassificationRule>): ClassificationRule | null {
  const rules = loadRules();
  const index = rules.findIndex(r => r.id === id);

  if (index === -1) return null;

  rules[index] = {
    ...rules[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveRules(rules);
  return rules[index];
}

export function deleteRule(id: string): boolean {
  const rules = loadRules();
  const newRules = rules.filter(r => r.id !== id);

  if (newRules.length === rules.length) return false;

  saveRules(newRules);
  return true;
}
