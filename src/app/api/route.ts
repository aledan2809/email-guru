import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        name: 'E-mail Guru API',
        version: 'v1',
        endpoints: [
          {
            method: 'GET',
            path: '/api',
            description: 'API index route.',
          },
          {
            method: 'GET',
            path: '/api/health',
            description: 'API health check route.',
          },
          {
            method: 'GET/POST',
            path: '/api/gmail/emails',
            description: 'Gmail email management and listing.',
          },
          {
            method: 'POST',
            path: '/api/ai/classify',
            description: 'AI-powered email classification.',
          },
          {
            method: 'POST',
            path: '/api/ai/batch-classify',
            description: 'Batch AI email classification.',
          },
          {
            method: 'GET/POST/DELETE',
            path: '/api/accounts',
            description: 'Email account management (Gmail, Outlook, IMAP).',
          },
        ],
      },
    },
    { status: 200 },
  );
}
