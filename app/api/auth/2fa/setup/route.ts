import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateSecret, generateOTPAuthURI, encryptSecret } from '@/lib/totp';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.getUser(session.email);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.twoFactorEnabled) {
            return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
        }

        // 1. Generate new TOTP secret
        const secret = generateSecret();
        
        // 2. Generate OTP Auth URI for QR code
        const settings = await db.getSettings();

        const siteName = settings.metadata?.siteName || 'AI Suite';
        const otpauthUrl = generateOTPAuthURI(user.email, secret, siteName);

        // 3. Generate QR code as Base64 Data URL
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        // 4. Save the encrypted secret to the user's record (but two_factor_enabled remains false)
        const encryptedSecret = encryptSecret(secret);
        await db.updateTwoFactor(user.email, encryptedSecret, false);

        // Log audit event
        const ip = '127.0.0.1'; // We could parse from req but this is background logging
        await db.log2FAEvent(user.email, '2fa_setup_initiated', null, null);

        return NextResponse.json({
            success: true,
            secret,
            qrCode: qrCodeDataUrl
        });
    } catch (error: any) {
        console.error('[2FA Setup Route Error]:', error);
        return NextResponse.json({ error: 'Failed to initiate 2FA setup' }, { status: 500 });
    }
}
