import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/notifications - Get user's notifications
export async function GET(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const severity = searchParams.get('severity') || undefined;
        const isRead = searchParams.get('isRead');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const countOnly = searchParams.get('countOnly') === 'true';

        // Fast path for just getting unread count (used by polling)
        if (countOnly) {
            const unreadCount = await db.getUnreadNotificationCount(session.email);
            return NextResponse.json({ unreadCount });
        }

        const result = await db.getUserNotifications(session.email, {
            severity,
            isRead: isRead !== null ? isRead === 'true' : undefined,
            limit,
            offset
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('User notifications GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

// PATCH /api/notifications - Mark as read / mark all as read / delete
export async function PATCH(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, notificationId } = body;

        switch (action) {
            case 'markRead':
                if (!notificationId) {
                    return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
                }
                await db.markNotificationRead(notificationId, session.email);
                break;

            case 'markAllRead':
                await db.markAllNotificationsRead(session.email);
                break;

            case 'delete':
                if (!notificationId) {
                    return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
                }
                await db.deleteUserNotification(notificationId, session.email);
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('User notifications PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
}
