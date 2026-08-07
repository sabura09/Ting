import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[API/Auth/Me] GET request received');
        const session: any = await getSession();
        console.log('[API/Auth/Me] Session:', session ? 'Found' : 'Not Found');

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.getUser(session.email);
        console.log('[API/Auth/Me] User lookup:', user ? 'Found' : 'Not Found');

        if (!user) {
            await destroySession();
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        const tokens = await db.getTokenBalance(session.email);
        const planDetails = await db.getUserPlan(session.email);
        const settings = await db.getSettings();
        const defaultTokens = settings.defaultTokens || 1000;
        const tokenLimit = planDetails.tokens || defaultTokens;

        return NextResponse.json({
            user: {
                email: user.email,
                name: user.name,
                role: user.role,
                tokens: tokens.balance,
                tokenLimit: tokenLimit,
                disabledFeatures: user.disabledFeatures || [],
                planId: planDetails.planId,
                planName: planDetails.planName,
                aiTools: planDetails.aiTools,
                twoFactorEnabled: user.twoFactorEnabled || false
            }
        });
    } catch (error) {
        console.error('[API/Auth/Me] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

