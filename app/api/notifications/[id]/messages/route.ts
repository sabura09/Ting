import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/notifications/[id]/messages - Get conversation messages
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify user has access to this notification
        const { notifications } = await db.getUserNotifications(session.email, { limit: 1000 });
        const hasAccess = notifications.some((n: any) => n.id === id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        const messages = await db.getNotificationMessages(id);

        // Mark admin messages as read for this user
        await db.markConversationMessagesRead(id, session.email);

        return NextResponse.json({ messages });
    } catch (error: any) {
        console.error('User notification messages GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST /api/notifications/[id]/messages - User sends a reply
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { message } = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const notification = await db.getNotification(id);
        if (!notification) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        if (!notification.allow_replies) {
            return NextResponse.json({ error: 'Replies are not allowed for this notification' }, { status: 400 });
        }

        const newMessage = await db.addNotificationMessage({
            notificationId: id,
            senderEmail: session.email,
            senderRole: 'user',
            message: message.trim()
        });

        return NextResponse.json({ success: true, message: newMessage });
    } catch (error: any) {
        console.error('User notification messages POST error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
