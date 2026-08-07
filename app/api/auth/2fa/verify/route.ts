import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { verifyTOTP, decryptSecret } from '@/lib/totp';
import { check2FARateLimit, recordAttempt, resetAttempts } from '@/lib/rate-limiter';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null;
        const userAgent = req.headers.get('user-agent') || null;

        const { tempToken, code } = await req.json();

        if (!tempToken || !code) {
            return NextResponse.json({ error: 'Missing temporary token or verification code' }, { status: 400 });
        }

        // 1. Verify temporary JWT
        let payload: any;
        try {
            payload = jwt.verify(tempToken, JWT_SECRET);
            if (!payload.temp || !payload.email) {
                return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
            }
        } catch (err) {
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }

        const email = payload.email.toLowerCase();

        // 2. Sliding window rate limit check
        const rateLimit = check2FARateLimit(email);
        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: `Too many 2FA verification attempts. Please try again in ${Math.ceil((rateLimit.retryAfterMs || 0) / 1000)} seconds.`
            }, { status: 429 });
        }

        const user = await db.getUser(email);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return NextResponse.json({ error: '2FA is not enabled for this user' }, { status: 400 });
        }

        // 3. Verify the code (either TOTP or Recovery Code)
        let isValid = false;
        let isRecovery = false;

        // Try verifying as TOTP first
        const secret = decryptSecret(user.twoFactorSecret);
        isValid = verifyTOTP(secret, code);

        // Try verifying as recovery code if not valid TOTP and format matches XXXX-XXXX
        if (!isValid && /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/.test(code.trim())) {
            isValid = await db.verifyAndUseRecoveryCode(email, code.trim());
            isRecovery = isValid;
        }

        if (!isValid) {
            recordAttempt(`2fa:${email}`);
            await db.log2FAEvent(email, '2fa_failed_attempt', ip, userAgent, { code_attempted: isRecovery ? 'recovery_code' : 'totp' });
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 4. Reset rate limiter and log success
        resetAttempts(`2fa:${email}`);
        await db.log2FAEvent(email, isRecovery ? '2fa_recovery_used' : '2fa_verified', ip, userAgent);

        // 5. Create active session
        let role = user.role;
        
        await createSession({ 
            id: user.id, 
            email: user.email, 
            role, 
            name: user.name, 
            disabledFeatures: user.disabledFeatures || [] 
        });

        const tokens = await db.getTokenBalance(user.email);
        const planDetails = await db.getUserPlan(user.email);

        return NextResponse.json({
            success: true,
            user: {
                email: user.email,
                name: user.name,
                role,
                tokens: tokens.balance,
                planName: planDetails.planName,
                aiTools: planDetails.aiTools
            }
        });
    } catch (error: any) {
        console.error('[2FA Verify Route Error]:', error);
        return NextResponse.json({ error: 'Failed to verify 2FA code' }, { status: 500 });
    }
}
