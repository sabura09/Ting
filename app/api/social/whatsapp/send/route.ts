import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const body = await req.json();
        const { contact, message } = body;

        if (!contact || !message) {
            return NextResponse.json({ error: 'Contact and message are required' }, { status: 400 });
        }

        const manager = WhatsAppManager.getInstance();
        await manager.init();

        await manager.sendManualMessage(email, contact, message);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error sending manual WhatsApp message:', error);
        return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
    }
}
