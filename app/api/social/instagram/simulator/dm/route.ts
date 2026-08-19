import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { processDmReply } from '@/lib/instagram/manager';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const body = await req.json();
        const { senderUsername, messageText } = body;

        if (!senderUsername) {
            return NextResponse.json({ error: 'Sender username is required.' }, { status: 400 });
        }
        if (!messageText) {
            return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
        }

        const senderId = `mock_user_${senderUsername.toLowerCase().trim()}`;
        const result = await processDmReply(email, senderId, senderUsername, messageText);

        return NextResponse.json({
            success: true,
            replyText: result.replyText,
            error: result.error
        });

    } catch (error: any) {
        console.error('Error in Instagram DM Simulator:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
