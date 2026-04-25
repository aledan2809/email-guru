import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    google_client_id: !!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.includes('your-'),
    google_client_secret: !!process.env.GOOGLE_CLIENT_SECRET && !process.env.GOOGLE_CLIENT_SECRET.includes('your-'),
    google_redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
    anthropic_key: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-'),
  };

  const allOk = checks.google_client_id && checks.google_client_secret && checks.anthropic_key;

  return NextResponse.json({
    service: 'E-mail Guru API',
    status: allOk ? 'ready' : 'setup_required',
    timestamp: new Date().toISOString(),
    checks,
    setup_hint: !allOk ? 'Configure .env.local with valid Google OAuth and Anthropic credentials' : null,
  });
}
