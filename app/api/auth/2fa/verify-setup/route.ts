import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyTOTP, decryptSecret, generateRecoveryCodes } from '@/lib/totp';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null;
        const userAgent = req.headers.get('user-agent') || null;

        const { code } = await req.json();
        if (!code) {
            return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
        }

        const user = await db.getUser(session.email);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.twoFactorEnabled) {
            return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
        }

        if (!user.twoFactorSecret) {
            return NextResponse.json({ error: '2FA setup has not been initiated' }, { status: 400 });
        }

        // 1. Decrypt secret and verify TOTP code
        const secret = decryptSecret(user.twoFactorSecret);
        const isValid = verifyTOTP(secret, code);

        if (!isValid) {
            await db.log2FAEvent(user.email, '2fa_failed_setup_attempt', ip, userAgent);
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 2. Enable 2FA in user profile
        await db.updateTwoFactor(user.email, user.twoFactorSecret, true);

        // 3. Generate and hash recovery codes
        const recoveryCodes = generateRecoveryCodes(8);
        const hashedCodes = await Promise.all(
            recoveryCodes.map(code => bcrypt.hash(code, 10))
        );

        // 4. Save hashed recovery codes
        await db.saveRecoveryCodes(user.email, hashedCodes);

        // 5. Log audit event
        await db.log2FAEvent(user.email, '2fa_enabled', ip, userAgent);

        return NextResponse.json({
            success: true,
            recoveryCodes
        });
    } catch (error: any) {
        console.error('[2FA Verify Setup Route Error]:', error);
        return NextResponse.json({ error: 'Failed to verify 2FA setup' }, { status: 500 });
    }
}
