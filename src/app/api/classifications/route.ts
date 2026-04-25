import { NextRequest, NextResponse } from 'next/server';
import { getClassifications, saveClassification, saveClassifications } from '@/lib/classification-store';
import type { EmailClassification } from '@/types/email';

// GET /api/classifications?account=email@example.com&ids=id1,id2,id3
export async function GET(request: NextRequest) {
  try {
    const account = request.nextUrl.searchParams.get('account');
    const ids = request.nextUrl.searchParams.get('ids');

    if (!account) {
      return NextResponse.json({ error: 'account parameter required' }, { status: 400 });
    }

    if (!ids) {
      return NextResponse.json({ success: true, data: {} });
    }

    const emailIds = ids.split(',').filter(Boolean);
    const classifications = getClassifications(account, emailIds);

    return NextResponse.json({ success: true, data: classifications });
  } catch (error) {
    console.error('Error fetching classifications:', error);
    return NextResponse.json({ error: 'Failed to fetch classifications' }, { status: 500 });
  }
}

// POST /api/classifications
// Body: { account, emailId, classification } or { account, items: [{ emailId, classification }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account } = body;

    if (!account) {
      return NextResponse.json({ error: 'account field required' }, { status: 400 });
    }

    // Bulk lookup (POST to avoid URL length limits)
    if (body.action === 'lookup' && Array.isArray(body.ids)) {
      const classifications = getClassifications(account, body.ids);
      return NextResponse.json({ success: true, data: classifications });
    }

    // Batch save
    if (body.items && Array.isArray(body.items)) {
      const items = body.items as { emailId: string; classification: EmailClassification }[];
      saveClassifications(account, items);
      return NextResponse.json({ success: true, saved: items.length });
    }

    // Single save
    const { emailId, classification } = body;
    if (!emailId || !classification) {
      return NextResponse.json({ error: 'emailId and classification required' }, { status: 400 });
    }

    saveClassification(account, emailId, classification);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving classification:', error);
    return NextResponse.json({ error: 'Failed to save classification' }, { status: 500 });
  }
}
