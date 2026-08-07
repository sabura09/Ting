import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/pg';

export async function GET(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();

        // Fetch last 50 auto-reply logs
        const res = await query(
            `SELECT id, sender_number, sender_name, message_text, reply_text, tokens_consumed, status, error_message, created_at
             FROM whatsapp_logs 
             WHERE LOWER(user_email) = LOWER($1) 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [email]
        );

        return NextResponse.json({
            logs: res.rows
        });

    } catch (error: any) {
        console.error('Error fetching WhatsApp logs:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
