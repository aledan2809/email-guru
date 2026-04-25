import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { watchInbox, stopWatch, getUserInfo } from '@/lib/gmail';
import { saveSubscription, getSubscription, removeSubscription } from '@/lib/watch-store';

// Start watching Gmail inbox for new emails via Pub/Sub
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('gmail_access_token')?.value;
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get the Pub/Sub topic name from environment
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      return NextResponse.json(
        { success: false, error: 'GMAIL_PUBSUB_TOPIC not configured' },
        { status: 500 }
      );
    }

    // Get user info
    const userInfo = await getUserInfo(accessToken);
    if (!userInfo.email) {
      return NextResponse.json(
        { success: false, error: 'Could not get user email' },
        { status: 500 }
      );
    }

    // Start watching
    const { historyId, expiration } = await watchInbox(accessToken, topicName);

    // Save subscription
    saveSubscription({
      email: userInfo.email,
      historyId,
      expiration,
      createdAt: new Date().toISOString(),
      accessToken,
      refreshToken,
    });

    return NextResponse.json({
      success: true,
      data: {
        email: userInfo.email,
        historyId,
        expiration,
        expirationDate: new Date(parseInt(expiration)).toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to start Gmail watch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start watch' },
      { status: 500 }
    );
  }
}

// Get current watch status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('gmail_user')?.value;

    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    let userEmail: string;
    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      userEmail = user.email;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid user cookie' },
        { status: 400 }
      );
    }

    const subscription = getSubscription(userEmail);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          watching: false,
          email: userEmail,
        },
      });
    }

    const isExpired = new Date(parseInt(subscription.expiration)) < new Date();

    return NextResponse.json({
      success: true,
      data: {
        watching: !isExpired,
        email: userEmail,
        historyId: subscription.historyId,
        expiration: subscription.expiration,
        expirationDate: new Date(parseInt(subscription.expiration)).toISOString(),
        expired: isExpired,
      },
    });
  } catch (error) {
    console.error('Failed to get watch status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

// Stop watching
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('gmail_access_token')?.value;
    const userCookie = cookieStore.get('gmail_user')?.value;

    if (!accessToken || !userCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    let userEmail: string;
    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      userEmail = user.email;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid user cookie' },
        { status: 400 }
      );
    }

    // Stop watching with Gmail API
    await stopWatch(accessToken);

    // Remove subscription from store
    removeSubscription(userEmail);

    return NextResponse.json({
      success: true,
      data: {
        email: userEmail,
        watching: false,
      },
    });
  } catch (error) {
    console.error('Failed to stop Gmail watch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to stop watch' },
      { status: 500 }
    );
  }
}
