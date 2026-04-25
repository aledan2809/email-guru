import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { applyLabel } from '@/lib/gmail';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('gmail_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { emailId, labelName } = await request.json();
    if (!emailId || !labelName) {
      return NextResponse.json({ error: 'emailId and labelName required' }, { status: 400 });
    }

    await applyLabel(accessToken, emailId, labelName);
    return NextResponse.json({ ok: true, label: labelName });
  } catch (error) {
    console.error('Label sync error:', error);
    return NextResponse.json({ error: 'Failed to apply label' }, { status: 500 });
  }
}
