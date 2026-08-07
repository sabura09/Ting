import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyVerificationToken } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // 1. Verify token signature and expiry
        const verification = verifyVerificationToken(token);
        if (!verification.valid || !verification.email) {
            return NextResponse.json({ error: verification.error || 'Invalid or expired token' }, { status: 400 });
        }

        // 2. Fetch user and check status
        const user = await db.getUser(verification.email);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ success: true, message: 'Email is already verified' });
        }

        // 3. Update user status in DB
        await db.saveUser({
            ...user,
            emailVerified: true,
            emailVerificationToken: undefined,
            emailVerificationExpiresAt: undefined
        });

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully! You can now log in.'
        });
    } catch (error: any) {
        console.error('[Verify Email API Error]:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
