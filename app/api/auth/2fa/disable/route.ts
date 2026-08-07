import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { query } from '@/lib/pg';
import bcrypt from 'bcryptjs';
import { verifyTOTP, decryptSecret } from '@/lib/totp';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null;
        const userAgent = req.headers.get('user-agent') || null;

        const { password, code } = await req.json();

        if (!password || !code) {
            return NextResponse.json({ error: 'Password and verification code are required' }, { status: 400 });
        }

        const user = await db.getUser(session.email);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return NextResponse.json({ error: '2FA is not enabled for this user' }, { status: 400 });
        }

        // 1. Verify password
        const isPasswordMatch = await bcrypt.compare(password, user.password || '');
        if (!isPasswordMatch) {
            await db.log2FAEvent(user.email, '2fa_disable_failed_password', ip, userAgent);
            return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
        }

        // 2. Verify TOTP or recovery code
        let isValid = false;
        let isRecovery = false;

        const secret = decryptSecret(user.twoFactorSecret);
        isValid = verifyTOTP(secret, code);

        if (!isValid && /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/.test(code.trim())) {
            isValid = await db.verifyAndUseRecoveryCode(user.email, code.trim());
            isRecovery = isValid;
        }

        if (!isValid) {
            await db.log2FAEvent(user.email, '2fa_disable_failed_code', ip, userAgent);
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 3. Disable 2FA
        await db.updateTwoFactor(user.email, null, false);
        
        // 4. Delete recovery codes
        await query('DELETE FROM two_factor_recovery_codes WHERE LOWER(user_email) = LOWER($1)', [user.email]);

        // 5. Log audit event
        await db.log2FAEvent(user.email, '2fa_disabled', ip, userAgent);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[2FA Disable Route Error]:', error);
        return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
    }
}
