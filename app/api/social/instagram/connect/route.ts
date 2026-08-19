import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/pg';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const body = await req.json();
        const { instagramBusinessAccountId, pageAccessToken, username } = body;

        if (!instagramBusinessAccountId || !pageAccessToken) {
            return NextResponse.json({ error: 'Instagram Business Account ID and Page Access Token are required.' }, { status: 400 });
        }

        const res = await query(`
            INSERT INTO instagram_agents (
                user_email, instagram_business_account_id, page_access_token, username, is_active, updated_at
            )
            VALUES ($1, $2, $3, $4, true, NOW())
            ON CONFLICT (user_email) DO UPDATE SET
                instagram_business_account_id = EXCLUDED.instagram_business_account_id,
                page_access_token = EXCLUDED.page_access_token,
                username = EXCLUDED.username,
                is_active = true,
                updated_at = NOW()
            RETURNING *
        `, [email, instagramBusinessAccountId, pageAccessToken, username || 'mock_instagram_user']);

        return NextResponse.json({
            success: true,
            status: 'connected',
            settings: res.rows[0]
        });

    } catch (error: any) {
        console.error('Error connecting Instagram agent:', error);
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

        const res = await query(`
            UPDATE instagram_agents 
            SET is_active = false, 
                instagram_business_account_id = null, 
                page_access_token = null,
                updated_at = NOW()
            WHERE LOWER(user_email) = LOWER($1)
            RETURNING *
        `, [email]);

        return NextResponse.json({
            success: true,
            status: 'disconnected',
            settings: res.rows[0]
        });

    } catch (error: any) {
        console.error('Error disconnecting Instagram agent:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
