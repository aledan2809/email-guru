import { NextRequest, NextResponse } from 'next/server';
import { classifyEmailWithAI } from '@/lib/ai-classifier';
import type { Email, EmailClassification } from '@/types/email';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ipCounters = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);
  if (!entry || entry.resetAt < now) {
    ipCounters.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'local';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded — max 10 batch requests/minute' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const emails = body.emails as Email[];

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array is required' },
        { status: 400 }
      );
    }

    if (emails.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 emails can be classified at once' },
        { status: 400 }
      );
    }

    const results: { emailId: string; classification: EmailClassification }[] = [];

    for (const email of emails) {
      if (!email.id) continue;

      try {
        const classification = await classifyEmailWithAI(email);
        results.push({ emailId: email.id, classification });
      } catch (error) {
        console.error(`Failed to classify email ${email.id}:`, error);
        results.push({
          emailId: email.id,
          classification: {
            category: 'other',
            confidence: 0.3,
            reasons: ['Classification failed'],
            suggestedAction: 'Manual review required',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    console.error('Batch classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify emails' },
      { status: 500 }
    );
  }
}
