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
        const res = await query('SELECT * FROM instagram_agents WHERE LOWER(user_email) = LOWER($1)', [email]);
        
        let settings = res.rows[0];
        if (!settings) {
            settings = {
                user_email: email,
                is_active: false,
                instagram_business_account_id: null,
                page_access_token: null,
                username: 'mock_instagram_user',
                system_prompt: 'You are a helpful and friendly AI assistant for Instagram.',
                model_id: 'gemini-2.5-flash',
                tone: 'friendly',
                personality: 'professional',
                dm_reply_behavior: 'auto',
                comment_reply_behavior: 'auto',
                response_delay: 0
            };
        }

        return NextResponse.json({ settings });

    } catch (error: any) {
        console.error('Error fetching Instagram settings:', error);
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
        
        const { 
            systemPrompt, 
            modelId, 
            tone, 
            personality, 
            dmReplyBehavior, 
            commentReplyBehavior, 
            responseDelay,
            username,
            instagramBusinessAccountId,
            pageAccessToken,
            isActive
        } = body;

        // Upsert configuration settings
        const res = await query(`
            INSERT INTO instagram_agents (
                user_email, system_prompt, model_id, tone, personality, 
                dm_reply_behavior, comment_reply_behavior, response_delay, 
                username, instagram_business_account_id, page_access_token, is_active, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (user_email) DO UPDATE SET
                system_prompt = EXCLUDED.system_prompt,
                model_id = EXCLUDED.model_id,
                tone = EXCLUDED.tone,
                personality = EXCLUDED.personality,
                dm_reply_behavior = EXCLUDED.dm_reply_behavior,
                comment_reply_behavior = EXCLUDED.comment_reply_behavior,
                response_delay = EXCLUDED.response_delay,
                username = EXCLUDED.username,
                instagram_business_account_id = EXCLUDED.instagram_business_account_id,
                page_access_token = EXCLUDED.page_access_token,
                is_active = EXCLUDED.is_active,
                updated_at = NOW()
            RETURNING *
        `, [
            email, 
            systemPrompt || 'You are a helpful and friendly AI assistant for Instagram.', 
            modelId || 'gemini-2.5-flash', 
            tone || 'friendly',
            personality || 'professional',
            dmReplyBehavior || 'auto',
            commentReplyBehavior || 'auto',
            responseDelay !== undefined ? parseInt(responseDelay, 10) : 0,
            username || 'mock_instagram_user',
            instagramBusinessAccountId || null,
            pageAccessToken || null,
            isActive !== undefined ? !!isActive : false
        ]);

        return NextResponse.json({
            success: true,
            settings: res.rows[0]
        });

    } catch (error: any) {
        console.error('Error saving Instagram settings:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
