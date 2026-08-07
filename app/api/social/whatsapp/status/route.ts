import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export async function GET(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const manager = WhatsAppManager.getInstance();

        // Retrieve connection status and QR code purely from in-memory maps
        const status = manager.getStatus(email);
        const qr = manager.getQr(email);

        return NextResponse.json({
            status,
            qr
        });

    } catch (error: any) {
        console.error('Error fetching WhatsApp status:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
