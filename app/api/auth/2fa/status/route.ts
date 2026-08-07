import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.getUser(session.email);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            enabled: !!user.twoFactorEnabled
        });
    } catch (error: any) {
        console.error('[2FA Status Route Error]:', error);
        return NextResponse.json({ error: 'Failed to retrieve 2FA status' }, { status: 500 });
    }
}
