import crypto from 'crypto';
import { headers } from 'next/headers';
import { sendEmail } from './email';
import { db } from './db';

const EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || 'email-verification-fallback-secret';
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate an HMAC-signed verification token containing email + expiry.
 */
export function generateVerificationToken(email: string): { token: string; expiresAt: Date } {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    const payload = `${email.toLowerCase()}|${expiresAt.getTime()}`;
    const signature = crypto
        .createHmac('sha256', EMAIL_VERIFICATION_SECRET)
        .update(payload)
        .digest('hex');

    const token = Buffer.from(`${payload}|${signature}`).toString('base64url');

    return { token, expiresAt };
}

/**
 * Verify a verification token's signature and expiry.
 * Returns the email if valid, null otherwise.
 */
export function verifyVerificationToken(token: string): { email: string; valid: boolean; error?: string } {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const parts = decoded.split('|');

        if (parts.length !== 3) {
            return { email: '', valid: false, error: 'Invalid token format' };
        }

        const [email, expiresAtStr, signature] = parts;
        const expiresAt = parseInt(expiresAtStr, 10);

        // Verify signature
        const payload = `${email}|${expiresAtStr}`;
        const expectedSignature = crypto
            .createHmac('sha256', EMAIL_VERIFICATION_SECRET)
            .update(payload)
            .digest('hex');

        const sigBuffer = Buffer.from(signature);
        const expectedSigBuffer = Buffer.from(expectedSignature);

        if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
            return { email: '', valid: false, error: 'Invalid token signature' };
        }

        // Check expiry
        if (Date.now() > expiresAt) {
            return { email, valid: false, error: 'Verification token has expired' };
        }

        return { email, valid: true };
    } catch (error) {
        console.error('[EmailVerification] Token verification error:', error);
        return { email: '', valid: false, error: 'Invalid verification token' };
    }
}

/**
 * Send a verification email with a branded HTML template.
 */
export async function sendVerificationEmail(
    email: string,
    name: string,
    token: string
): Promise<{ success: boolean; error?: string }> {
    let settings;
    try {
        settings = await db.getSettings();
    } catch {
        settings = { metadata: {} };
    }

    const siteName = settings.metadata?.siteName || 'AI Suite';
    let origin = '';
    try {
        const headersList = await headers();
        const host = headersList.get('x-forwarded-host') || headersList.get('host');
        const proto = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
        if (host) origin = `${proto}://${host}`;
    } catch (e) {}

    // Prioritize dynamic origin (or env var) over DB setting to ensure correct URL in emails
    const siteUrl = origin || process.env.NEXT_PUBLIC_APP_URL || settings.metadata?.siteUrl || 'http://localhost:3000';
    const verifyUrl = `${siteUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 32px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${siteName}</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 8px 0; color: #18181b; font-size: 22px; font-weight: 700;">Verify your email address</h2>
                                <p style="margin: 0 0 24px 0; color: #71717a; font-size: 15px; line-height: 1.6;">
                                    Hi ${name || 'there'},<br><br>
                                    Thank you for signing up for ${siteName}! Please confirm your email address by clicking the button below.
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding: 8px 0 32px;">
                                            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                                                Verify Email Address
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 13px;">
                                    If the button doesn't work, copy and paste this link into your browser:
                                </p>
                                <p style="margin: 0 0 24px 0; word-break: break-all; color: #6366f1; font-size: 13px;">
                                    ${verifyUrl}
                                </p>
                                <div style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
                                    <p style="margin: 0; color: #a1a1aa; font-size: 13px; line-height: 1.5;">
                                        This link will expire in ${TOKEN_EXPIRY_HOURS} hours. If you did not create an account, you can safely ignore this email.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
                                <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                                    &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;

    return sendEmail({
        to: email,
        subject: `Verify your email — ${siteName}`,
        html,
    });
}
