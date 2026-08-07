import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateGroundedResponseV3 } from '@/lib/rag';

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        console.error("[ROUTE] JSON_PARSE_FAIL: Request body is empty or malformed");
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    try {
        const session: any = await getSession();
        const { prompt, supportEmail, image } = body;

        let targetUserEmail = session?.email || supportEmail || 'admin@example.com';

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        const settings = await db.getSettings();
        const cost = settings.aiLimits['live-chat'] || 15;
        const balance = await db.getTokenBalance(targetUserEmail);

        if (targetUserEmail !== 'admin@example.com' && balance.balance < cost) {
            return NextResponse.json({
                error: 'Insufficient tokens.'
            }, { status: 402 });
        }

        const answer = await generateGroundedResponseV3(
            targetUserEmail, 
            prompt || "Analyze the uploaded image based on the document context.", 
            image
        );

        if (targetUserEmail !== 'admin@example.com') {
            await db.updateTokenBalance(targetUserEmail, cost, 'consume', 'Live Chat RAG', 'gemini-2.5-flash');
        }

        return NextResponse.json({
            content: answer,
            text: answer
        });

    } catch (error: any) {
        console.error('Chat RAG Error [ROUTE]:', error.message);
        return NextResponse.json({
            error: error.message || 'Request failed'
        }, { status: 500 });
    }
}
