import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/pg';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export async function GET(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Initialize connection manager (auto-starts active agents once)
        const manager = WhatsAppManager.getInstance();
        await manager.init();

        const email = session.email.toLowerCase();
        const res = await query('SELECT * FROM whatsapp_agents WHERE LOWER(user_email) = LOWER($1)', [email]);
        
        let settings = res.rows[0];
        if (!settings) {
            settings = {
                user_email: email,
                is_active: false,
                reply_target: 'all',
                target_numbers: [],
                system_prompt: 'You are a helpful and friendly AI assistant.',
                model_id: 'gemini-2.5-flash',
                phone_number: null,
                tone: 'friendly',
                personality: 'professional',
                reply_behavior: 'auto',
                response_delay: 0
            };
        }

        // Include current connection status and QR code from the manager
        const connectionStatus = manager.getStatus(email);
        const qr = manager.getQr(email);
 
        return NextResponse.json({
            settings,
            status: connectionStatus,
            qr
        });

    } catch (error: any) {
        console.error('Error fetching WhatsApp settings:', error);
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
        
        const { systemPrompt, modelId, replyTarget, targetNumbers, tone, personality, replyBehavior, responseDelay } = body;

        // Upsert configuration settings
        const res = await query(`
            INSERT INTO whatsapp_agents (
                user_email, system_prompt, model_id, reply_target, target_numbers, 
                tone, personality, reply_behavior, response_delay, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (user_email) DO UPDATE SET
                system_prompt = EXCLUDED.system_prompt,
                model_id = EXCLUDED.model_id,
                reply_target = EXCLUDED.reply_target,
                target_numbers = EXCLUDED.target_numbers,
                tone = EXCLUDED.tone,
                personality = EXCLUDED.personality,
                reply_behavior = EXCLUDED.reply_behavior,
                response_delay = EXCLUDED.response_delay,
                updated_at = NOW()
            RETURNING *
        `, [
            email, 
            systemPrompt || 'You are a helpful and friendly AI assistant.', 
            modelId || 'gemini-2.5-flash', 
            replyTarget || 'all', 
            targetNumbers || [],
            tone || 'friendly',
            personality || 'professional',
            replyBehavior || 'auto',
            responseDelay !== undefined ? parseInt(responseDelay, 10) : 0
        ]);

        return NextResponse.json({
            success: true,
            settings: res.rows[0]
        });

    } catch (error: any) {
        console.error('Error saving WhatsApp settings:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
