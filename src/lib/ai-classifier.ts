import { execFileSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import type { Email, EmailClassification, SmartReply, ClassificationRule } from '@/types/email';
import { applyRules, DEFAULT_RULES } from './classification-rules';

// Find claude CLI path
function getClaudePath(): string {
  const candidates = [
    process.env.CLAUDE_CLI_PATH,
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    path.join(os.homedir(), '.local', 'bin', 'claude.exe'),
    'claude',
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return 'claude';
}

// Call Claude CLI (uses OAuth session, no API credits)
async function callClaudeCLI(prompt: string): Promise<string> {
  const claudePath = getClaudePath();

  // Remove ANTHROPIC_API_KEY so CLI uses OAuth session
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  try {
    const result = execFileSync(claudePath, ['-p', '--output-format', 'text'], {
      input: prompt,
      encoding: 'utf-8',
      timeout: 30000,
      env,
      windowsHide: true,
    });
    return result.trim();
  } catch (error) {
    console.error('Claude CLI error:', error);
    throw error;
  }
}

type UserPref = { sender: string; domain: string; category: string; scope: string };

export async function classifyEmailWithAI(
  email: Email,
  customRules?: ClassificationRule[],
  customCategories?: { id: string; name: string }[],
  userPrefs?: UserPref[]
): Promise<EmailClassification> {
  // First, try to classify using custom rules
  const rules = customRules || DEFAULT_RULES;
  const ruleBasedClassification = applyRules(email, rules);

  if (ruleBasedClassification) {
    return ruleBasedClassification;
  }

  // Build categories list including custom ones
  const customCatLines = (customCategories || [])
    .map(c => `- ${c.id}: ${c.name} (custom category)`)
    .join('\n');

  // Build user preference hints for AI
  const senderEmail = (email.from.match(/<([^>]+)>/) || [null, email.from])[1] || email.from;
  const senderDomain = senderEmail.split('@')[1] || '';
  let prefHint = '';
  if (userPrefs && userPrefs.length > 0) {
    // Find relevant prefs for this sender/domain
    const relevant = userPrefs.filter(p =>
      p.sender === senderEmail || (p.scope === 'domain' && p.domain === senderDomain)
    );
    if (relevant.length > 0) {
      const latest = relevant[relevant.length - 1];
      prefHint = `\n\nIMPORTANT - User preference: The user previously classified emails from ${latest.scope === 'domain' ? '@' + latest.domain : latest.sender} as "${latest.category}". Follow this preference unless the email clearly doesn't match.`;
    }
  }

  // Fall back to AI classification via Claude CLI (no API credits)
  const prompt = `Analyze this email and classify it into ONE category. Use an existing category if it fits, or create a NEW one if none fits well.

Existing categories:
- invoice: Bills, payments, financial documents
- business-opportunity: Partnership offers, leads, collaboration requests
- client-communication: Client messages, project updates, meetings
- service-alert: System errors, outages, service notifications
- spam: Unwanted promotional, scams, junk
- storage-review: Large attachments that may need archiving${customCatLines ? '\n' + customCatLines : ''}

You MAY create a new category if the email doesn't fit existing ones well. Use a lowercase kebab-case id (e.g. "marketing", "newsletter", "social", "finance", "travel", "shopping", "education"). Do NOT use "other" - always pick a specific category.${prefHint}

Email details:
From: ${email.from}
Subject: ${email.subject}
Body: ${(email.bodyText || email.snippet || '').slice(0, 500)}
Has Attachments: ${email.hasAttachments}

Respond with ONLY valid JSON, no other text:
{
  "category": "category-id",
  "categoryName": "Human Readable Name",
  "confidence": 0.0-1.0,
  "reasons": ["reason1", "reason2"],
  "suggestedAction": "action description"
}`;

  try {
    const text = await callClaudeCLI(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Normalize: ensure category is kebab-case
      const category = (parsed.category || 'other').toLowerCase().replace(/\s+/g, '-');
      return {
        category,
        categoryName: parsed.categoryName || category.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        confidence: parsed.confidence || 0.7,
        reasons: parsed.reasons || [],
        suggestedAction: parsed.suggestedAction || 'Review',
      };
    }

    return {
      category: 'other',
      confidence: 0.5,
      reasons: ['Could not parse AI response'],
      suggestedAction: 'Manual review required',
    };
  } catch (error) {
    console.error('AI classification error:', error);
    return {
      category: 'other',
      confidence: 0.3,
      reasons: ['AI classification failed'],
      suggestedAction: 'Manual review required',
    };
  }
}

export async function generateSmartReplies(email: Email): Promise<SmartReply[]> {
  const prompt = `Generate 3 short reply suggestions for this email:

From: ${email.from}
Subject: ${email.subject}
Body: ${(email.bodyText || email.snippet || '').slice(0, 500)}

Generate replies in 3 tones: professional, friendly, and brief.
Each reply should be 1-3 sentences maximum.

Respond with ONLY valid JSON array, no other text:
[
  { "id": "1", "text": "reply text", "tone": "professional" },
  { "id": "2", "text": "reply text", "tone": "friendly" },
  { "id": "3", "text": "reply text", "tone": "brief" }
]`;

  try {
    const text = await callClaudeCLI(prompt);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SmartReply[];
    }

    return [];
  } catch (error) {
    console.error('Smart reply generation error:', error);
    return [];
  }
}

export async function suggestEmailAction(email: Email, classification: EmailClassification): Promise<string> {
  const actionMap: Record<string, string> = {
    'invoice': 'Save to invoices folder and add to accounting queue',
    'business-opportunity': 'Flag for review and schedule follow-up',
    'client-communication': 'Review and respond within 24 hours',
    'service-alert': 'Check affected service immediately',
    'spam': 'Move to spam and block sender',
    'storage-review': 'Download attachments and archive email',
    'other': 'Review manually',
  };

  return actionMap[classification.category] || 'Review manually';
}
