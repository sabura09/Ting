import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email-verification';
import { checkResendRateLimit, recordAttempt } from '@/lib/rate-limiter';

export async function POST(req: Request) {
    try {
        const { email: rawEmail } = await req.json();

        if (!rawEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const email = rawEmail.toLowerCase();

        // 1. Sliding window rate limiting
        const rateLimit = checkResendRateLimit(email);
        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: `Too many resend attempts. Please try again in ${Math.ceil((rateLimit.retryAfterMs || 0) / (60 * 1000))} minutes.`
            }, { status: 429 });
        }

        const user = await db.getUser(email);

        if (!user) {
            // Return generic success to prevent email enumeration
            return NextResponse.json({
                success: true,
                message: 'If the email is registered and not verified, a new verification link has been sent.'
            });
        }

        if (user.emailVerified) {
            return NextResponse.json({
                success: true,
                message: 'Email is already verified.'
            });
        }

        // Record resend attempt
        recordAttempt(`resend:${email}`);

        // 2. Generate new verification token
        const { token, expiresAt } = generateVerificationToken(email);

        // 3. Update token in database
        await db.saveUser({
            ...user,
            emailVerificationToken: token,
            emailVerificationExpiresAt: expiresAt.toISOString()
        });

        // 4. Send verification email
        const emailResult = await sendVerificationEmail(email, user.name || '', token);
        if (!emailResult.success) {
            console.warn('[ResendVerification] Failed to send email:', emailResult.error);
            return NextResponse.json({ error: 'Failed to send verification email. Please try again later.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Verification email has been sent.'
        });
    } catch (error: any) {
        console.error('[Resend Verification Route Error]:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
