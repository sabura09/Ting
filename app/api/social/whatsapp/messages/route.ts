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
        const url = new URL(req.url);
        const contact = url.searchParams.get('contact');

        if (!contact) {
            return NextResponse.json({ error: 'Contact number is required' }, { status: 400 });
        }

        // Fetch logs using the raw contact JID (keep @s.whatsapp.net or @lid suffix intact)
        const res = await query(
            `SELECT id, sender_number, sender_name, message_text, reply_text, tokens_consumed, status, error_message, created_at
             FROM whatsapp_logs 
             WHERE LOWER(user_email) = LOWER($1) AND sender_number = $2
             ORDER BY created_at ASC`,
            [email, contact.trim()]
        );

        // Convert the database logs (which log user input and AI reply in one row) into sequential message items
        const messages: any[] = [];
        res.rows.forEach((row: any) => {
            if (row.status === 'manual') {
                // Outbound manual message from operator
                messages.push({
                    id: `${row.id}-out`,
                    direction: 'outbound',
                    type: 'manual',
                    text: row.reply_text,
                    timestamp: row.created_at,
                    status: 'sent'
                });
            } else {
                // Non-manual logs always represent an incoming message
                if (row.message_text && row.message_text.trim() !== '') {
                    messages.push({
                        id: `${row.id}-in`,
                        direction: 'inbound',
                        type: 'incoming',
                        text: row.message_text,
                        timestamp: new Date(new Date(row.created_at).getTime() - 1000).toISOString(),
                        sender_name: row.sender_name
                    });
                }
                
                if (row.status === 'success') {
                    if (row.reply_text && row.reply_text.trim() !== '') {
                        messages.push({
                            id: `${row.id}-out`,
                            direction: 'outbound',
                            type: 'auto_reply',
                            text: row.reply_text,
                            timestamp: row.created_at,
                            tokens_consumed: row.tokens_consumed
                        });
                    }
                } else if (row.status === 'failed') {
                    // Log error system details
                    messages.push({
                        id: `${row.id}-err`,
                        direction: 'outbound',
                        type: 'system',
                        text: `Auto-reply failed: ${row.error_message || 'Unknown error'}`,
                        timestamp: row.created_at,
                        status: 'failed'
                    });
                }
            }
        });

        return NextResponse.json({
            messages
        });

    } catch (error: any) {
        console.error('Error fetching WhatsApp messages:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
