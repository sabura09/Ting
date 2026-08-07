import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email-verification';

export async function POST(req: Request) {
    try {
        const { name, email: rawEmail, password, recaptchaToken } = await req.json();

        if (!name || !rawEmail || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const email = rawEmail.toLowerCase();

        // 1. Verify reCAPTCHA token
        const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'admin-register', 0.5);
        if (!recaptchaResult.success) {
            return NextResponse.json({ error: recaptchaResult.error || 'reCAPTCHA verification failed' }, { status: 400 });
        }

        const existingUser = await db.getUser(email);
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Force admin role for this route
        const role = 'admin';

        // 2. Generate verification token
        const { token, expiresAt } = generateVerificationToken(email);

        const newUser: any = {
            name,
            email,
            password: hashedPassword,
            role,
            status: 'active',
            createdAt: new Date().toISOString(),
            emailVerified: false,
            emailVerificationToken: token,
            emailVerificationExpiresAt: expiresAt.toISOString()
        };

        await db.saveUser(newUser);

        // 3. Send verification email
        const emailResult = await sendVerificationEmail(email, name, token);
        if (!emailResult.success) {
            console.warn('[AdminRegister] Failed to send email verification:', emailResult.error);
        }

        return NextResponse.json({
            success: true,
            requiresVerification: true,
            message: 'Admin registration successful. Please check your email to verify your account.'
        });
    } catch (error: any) {
        console.error('Admin Registration Error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
