import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/notifications - List all notifications (admin)
export async function GET(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;
        const severity = searchParams.get('severity') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const result = await db.listNotifications({ status, severity, limit, offset });
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Admin notifications GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

// POST /api/admin/notifications - Create notification
export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            title, content, description, severity, icon, iconUrl,
            isGlobal, isPinned, allowReplies, scheduledAt, expiresAt,
            status, recipients
        } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        // Determine the actual status
        let finalStatus = status || 'draft';
        if (scheduledAt && finalStatus === 'sent') {
            const scheduledDate = new Date(scheduledAt);
            if (scheduledDate > new Date()) {
                finalStatus = 'scheduled';
            }
        }

        const notification = await db.createNotification({
            title,
            content,
            description,
            severity,
            icon,
            iconUrl,
            isGlobal: isGlobal || false,
            isPinned,
            allowReplies,
            createdBy: session.email,
            scheduledAt,
            expiresAt,
            status: finalStatus
        });

        // If status is 'sent', send to recipients now
        if (finalStatus === 'sent') {
            await db.sendNotification(notification.id, isGlobal ? undefined : recipients);
        }

        return NextResponse.json({ success: true, notification });
    } catch (error: any) {
        console.error('Admin notifications POST error:', error);
        return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }
}

// PATCH /api/admin/notifications - Update notification
export async function PATCH(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, recipients, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
        }

        const existing = await db.getNotification(id);
        if (!existing) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        // Handle status transitions
        if (updates.status === 'sent' && existing.status !== 'sent') {
            // Sending the notification
            const notification = await db.updateNotification(id, updates);
            const isGlobal = updates.isGlobal !== undefined ? updates.isGlobal : existing.is_global;
            await db.sendNotification(id, isGlobal ? undefined : recipients);
            return NextResponse.json({ success: true, notification });
        }

        const notification = await db.updateNotification(id, updates);
        return NextResponse.json({ success: true, notification });
    } catch (error: any) {
        console.error('Admin notifications PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
}

// DELETE /api/admin/notifications - Delete notification
export async function DELETE(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
        }

        await db.deleteNotification(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Admin notifications DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }
}
