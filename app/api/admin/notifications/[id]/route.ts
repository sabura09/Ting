import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/notifications/[id] - Get single notification with details
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const notification = await db.getNotification(id);

        if (!notification) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        const recipients = await db.getNotificationRecipients(id);
        const messages = await db.getNotificationMessages(id);

        return NextResponse.json({
            notification,
            recipients,
            messages
        });
    } catch (error: any) {
        console.error('Admin notification detail error:', error);
        return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
    }
}
