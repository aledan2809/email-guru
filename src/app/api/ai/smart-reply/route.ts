import { NextRequest, NextResponse } from 'next/server';
import { generateSmartReplies } from '@/lib/ai-classifier';
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

    const replies = await generateSmartReplies(email);

    return NextResponse.json({
      success: true,
      data: {
        emailId: email.id,
        replies,
      },
    });
  } catch (error) {
    console.error('Smart reply error:', error);
    return NextResponse.json(
      { error: 'Failed to generate smart replies' },
      { status: 500 }
    );
  }
}
