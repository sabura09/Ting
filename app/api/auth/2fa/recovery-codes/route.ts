import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateRecoveryCodes } from '@/lib/totp';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null;
        const userAgent = req.headers.get('user-agent') || null;

        const { password } = await req.json();
        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        const user = await db.getUser(session.email);
        if (!user || !user.twoFactorEnabled) {
            return NextResponse.json({ error: '2FA is not enabled for this user' }, { status: 400 });
        }

        // 1. Verify password
        const isPasswordMatch = await bcrypt.compare(password, user.password || '');
        if (!isPasswordMatch) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
        }

        // 2. Generate and hash new recovery codes
        const recoveryCodes = generateRecoveryCodes(8);
        const hashedCodes = await Promise.all(
            recoveryCodes.map(code => bcrypt.hash(code, 10))
        );

        // 3. Save new hashed recovery codes (replaces old ones in DB)
        await db.saveRecoveryCodes(user.email, hashedCodes);

        // 4. Log audit event
        await db.log2FAEvent(user.email, '2fa_recovery_codes_regenerated', ip, userAgent);

        return NextResponse.json({
            success: true,
            recoveryCodes
        });
    } catch (error: any) {
        console.error('[2FA Recovery Codes Route Error]:', error);
        return NextResponse.json({ error: 'Failed to regenerate recovery codes' }, { status: 500 });
    }
}
