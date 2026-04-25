import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getNotifications, clearNotifications } from '@/lib/watch-store';

// Get pending new email notifications for the current user
export async function GET(request: NextRequest) {
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

    // Get optional 'since' parameter for incremental updates
    const since = request.nextUrl.searchParams.get('since') || undefined;

    const notifications = getNotifications(userEmail, since);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

// Clear all notifications for the current user
export async function DELETE() {
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

    clearNotifications(userEmail);

    return NextResponse.json({
      success: true,
      data: {
        cleared: true,
      },
    });
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to clear notifications' },
      { status: 500 }
    );
  }
}
