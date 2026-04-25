import { NextRequest, NextResponse } from 'next/server';
import { classifyEmailWithAI } from '@/lib/ai-classifier';
import type { Email } from '@/types/email';

export async function POST(request: NextRequest) {
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
