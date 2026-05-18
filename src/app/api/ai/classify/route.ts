import { NextRequest, NextResponse } from 'next/server';
import { classifyEmailWithAI } from '@/lib/ai-classifier';
import type { Email } from '@/types/email';

const RATE_LIMIT_MAX = 20;
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
    return NextResponse.json({ error: 'Rate limit exceeded — max 20 requests/minute' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const email = body.email as Email;

    if (!email || !email.id) {
      return NextResponse.json(
        { error: 'Email data is required' },
        { status: 400 }
      );
    }

    const customCategories = body.customCategories || [];
    const userPrefs = body.userPrefs || [];
    const classification = await classifyEmailWithAI(email, undefined, customCategories, userPrefs);

    return NextResponse.json({
      success: true,
      data: {
        emailId: email.id,
        classification,
      },
    });
  } catch (error) {
    console.error('AI classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify email' },
      { status: 500 }
    );
  }
}
