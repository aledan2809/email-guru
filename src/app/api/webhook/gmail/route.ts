import { NextRequest, NextResponse } from 'next/server';
import { getEmail, getHistory } from '@/lib/gmail';
import {
  getSubscription,
  updateHistoryId,
  addNotification,
  getAllSubscriptions,
} from '@/lib/watch-store';
import { saveClassification } from '@/lib/classification-store';
import { logDebug, logWarn, logError } from '@/lib/logger';
import crypto from 'crypto';

// Gmail Push Notification webhook endpoint
// Receives notifications from Google Pub/Sub when new emails arrive

/**
 * Verifies webhook authentication using Bearer token or HMAC signature
 */
function verifyWebhookAuth(request: NextRequest, body: any): boolean {
  // Method 1: Bearer token authentication (recommended for Pub/Sub)
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.GMAIL_WEBHOOK_TOKEN;

  if (expectedToken && authHeader) {
    const bearerToken = authHeader.replace('Bearer ', '');
    if (bearerToken === expectedToken) {
      return true;
    }
  }

  // Method 2: HMAC signature verification (fallback)
  const signature = request.headers.get('X-Goog-Signature') || request.headers.get('X-Hub-Signature');
  const webhookSecret = process.env.GMAIL_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    const receivedSignature = signature.replace(/^(sha256=|sha1=)/, '');

    if (crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )) {
      return true;
    }
  }

  // Development mode: allow without auth if no tokens are configured
  if (!expectedToken && !webhookSecret && process.env.NODE_ENV === 'development') {
    logWarn('[Webhook] No authentication configured - allowing request in development mode');
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook authentication first
    if (!verifyWebhookAuth(request, body)) {
      logWarn('[Webhook] Unauthorized access attempt from:', request.headers.get('x-forwarded-for') || 'unknown');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate Pub/Sub message format
    const message = body.message;
    if (!message || !message.data) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // Decode base64 data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    let pushData: { emailAddress: string; historyId: string };

    try {
      pushData = JSON.parse(decodedData);
    } catch {
      logError('Failed to parse push notification data:', decodedData);
      return NextResponse.json({ error: 'Invalid push data' }, { status: 400 });
    }

    const { emailAddress, historyId } = pushData;

    if (!emailAddress || !historyId) {
      return NextResponse.json({ error: 'Missing emailAddress or historyId' }, { status: 400 });
    }

    logDebug(`[Webhook] New push notification for ${emailAddress}, historyId: ${historyId}`);

    // Find the subscription for this email
    const subscription = getSubscription(emailAddress);
    if (!subscription) {
      logDebug(`[Webhook] No active subscription for ${emailAddress}`);
      // Acknowledge anyway to prevent retries
      return NextResponse.json({ success: true, message: 'No active subscription' });
    }

    // Get new messages since last known historyId
    const { messages, historyId: newHistoryId } = await getHistory(
      subscription.accessToken,
      subscription.historyId
    );

    // Update stored historyId
    updateHistoryId(emailAddress, newHistoryId);

    logDebug(`[Webhook] Found ${messages.length} new messages for ${emailAddress}`);

    // Process each new message
    for (const msg of messages) {
      // Add notification for the client
      addNotification({
        email: emailAddress,
        messageId: msg.id,
        threadId: msg.threadId,
      });

      // Optionally auto-classify the new email
      if (process.env.AUTO_CLASSIFY_NEW_EMAILS === 'true') {
        try {
          const email = await getEmail(subscription.accessToken, msg.id);
          if (email) {
            // Call classification API internally
            const classifyResponse = await fetch(`${getBaseUrl(request)}/api/ai/classify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });

            if (classifyResponse.ok) {
              const classifyData = await classifyResponse.json();
              if (classifyData.data?.classification) {
                // Save classification
                saveClassification(emailAddress, msg.id, classifyData.data.classification);
                logDebug(`[Webhook] Auto-classified email ${msg.id} as ${classifyData.data.classification.category}`);
              }
            }
          }
        } catch (classifyError) {
          logError(`[Webhook] Failed to auto-classify email ${msg.id}:`, classifyError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: messages.length,
      historyId: newHistoryId,
    });
  } catch (error) {
    logError('[Webhook] Error processing push notification:', error);
    // Return 200 to acknowledge and prevent retries
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET endpoint to check webhook status
export async function GET() {
  const subscriptions = getAllSubscriptions();
  return NextResponse.json({
    success: true,
    data: {
      activeSubscriptions: subscriptions.length,
      subscriptions: subscriptions.map(s => ({
        email: s.email,
        expiration: s.expiration,
        historyId: s.historyId,
      })),
    },
  });
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3101';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
}
