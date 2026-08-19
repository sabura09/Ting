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
        
        // Fetch DM logs
        const dmsRes = await query(
            'SELECT * FROM instagram_dm_logs WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', 
            [email]
        );

        // Fetch Comment logs
        const commentsRes = await query(
            'SELECT * FROM instagram_comments_logs WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', 
            [email]
        );

        return NextResponse.json({
            dms: dmsRes.rows,
            comments: commentsRes.rows
        });

    } catch (error: any) {
        console.error('Error fetching Instagram logs:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
