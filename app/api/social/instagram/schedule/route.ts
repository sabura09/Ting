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
        const res = await query(
            'SELECT * FROM instagram_posts WHERE LOWER(user_email) = LOWER($1) ORDER BY scheduled_at DESC', 
            [email]
        );

        return NextResponse.json({ posts: res.rows });

    } catch (error: any) {
        console.error('Error fetching scheduled posts:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const body = await req.json();
        const { mediaUrl, caption, scheduledAt } = body;

        if (!mediaUrl) {
            return NextResponse.json({ error: 'Media URL is required.' }, { status: 400 });
        }
        if (!scheduledAt) {
            return NextResponse.json({ error: 'Scheduled time is required.' }, { status: 400 });
        }

        const scheduledTime = new Date(scheduledAt);
        if (isNaN(scheduledTime.getTime())) {
            return NextResponse.json({ error: 'Invalid scheduled time format.' }, { status: 400 });
        }

        const res = await query(`
            INSERT INTO instagram_posts (user_email, media_url, caption, scheduled_at, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'scheduled', NOW(), NOW())
            RETURNING *
        `, [email, mediaUrl, caption || '', scheduledTime.toISOString()]);

        return NextResponse.json({
            success: true,
            post: res.rows[0]
        });

    } catch (error: any) {
        console.error('Error scheduling post:', error);
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
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
        }

        // Only allow deleting posts owned by the session user
        const res = await query(
            'DELETE FROM instagram_posts WHERE id = $1 AND LOWER(user_email) = LOWER($2) RETURNING *',
            [id, email]
        );

        if (res.rowCount === 0) {
            return NextResponse.json({ error: 'Post not found or unauthorized.' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Scheduled post canceled successfully.',
            post: res.rows[0]
        });

    } catch (error: any) {
        console.error('Error deleting scheduled post:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
