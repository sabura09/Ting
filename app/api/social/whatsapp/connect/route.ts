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
        const manager = WhatsAppManager.getInstance();
        await manager.init();

        // Start connection
        await manager.connect(email);

        return NextResponse.json({
            success: true,
            status: manager.getStatus(email)
        });

    } catch (error: any) {
        console.error('Error starting WhatsApp connection:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const manager = WhatsAppManager.getInstance();
        await manager.init();

        // Terminate connection and clear session
        await manager.disconnect(email);

        return NextResponse.json({
            success: true,
            status: 'disconnected'
        });

    } catch (error: any) {
        console.error('Error disconnecting WhatsApp:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
