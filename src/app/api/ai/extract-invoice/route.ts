import { NextResponse } from 'next/server';
import { aiRouter } from '@/lib/ai-router';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    const prompt = `Extract invoice data from this email. If no invoice data is found, respond with just: null

From: ${email.from}
Subject: ${email.subject}
Body: ${(email.bodyText || email.snippet || '').slice(0, 500)}

Respond with ONLY valid JSON (or null if not an invoice):
{
  "vendor": "company name",
  "amount": 123.45,
  "currency": "USD/EUR/RON",
  "invoiceNumber": "INV-123 or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "confidence": 0.0-1.0
}`;

    const response = await aiRouter.chat({
      messages: [{ role: 'user', content: prompt }],
      provider: 'auto',
      maxTokens: 500,
      taskHint: 'extraction',
    });

    const result = response.content.trim();

    if (result.toLowerCase() === 'null') {
      return NextResponse.json({ data: null });
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const invoiceData = {
        ...JSON.parse(jsonMatch[0]),
        emailId: email.id,
        extractedAt: new Date().toISOString(),
      };
      return NextResponse.json({ data: invoiceData });
    }

    return NextResponse.json({ data: null });
  } catch (error) {
    console.error('Invoice extraction error:', error);
    return NextResponse.json({ error: 'Invoice extraction failed' }, { status: 500 });
  }
}
