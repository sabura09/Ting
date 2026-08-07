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

        // Fetch unique contact conversations sorted by the most recent activity.
        // We use DISTINCT ON (sender_number) to get the latest interaction record.
        const res = await query(
            `WITH ranked_logs AS (
                SELECT 
                    sender_number,
                    sender_name,
                    message_text,
                    reply_text,
                    status,
                    created_at,
                    ROW_NUMBER() OVER(PARTITION BY sender_number ORDER BY created_at DESC) as rn
                FROM whatsapp_logs
                WHERE LOWER(user_email) = LOWER($1)
            )
            SELECT 
                sender_number,
                sender_name,
                message_text,
                reply_text,
                status,
                created_at
            FROM ranked_logs
            WHERE rn = 1
            ORDER BY created_at DESC`,
            [email]
        );

        return NextResponse.json({
            conversations: res.rows
        });
    } catch (error: any) {
        console.error('Error fetching WhatsApp conversations:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
