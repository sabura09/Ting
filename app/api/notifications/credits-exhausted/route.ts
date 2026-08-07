
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { domain } = await req.json();
        
        const settings = await db.getSettings();
        const siteName = settings.metadata?.siteName || 'AI Suite';
        const siteUrl = domain || process.env.NEXT_PUBLIC_APP_URL || settings.metadata?.siteUrl || 'https://mounikai.com';
        
        // Take recipient email from SMTP "From Email" settings as requested
        const adminEmail = settings.metadata?.smtp?.from;

        if (!adminEmail) {
            console.error('Notification Error: Admin/From email not configured in SMTP settings');
            return NextResponse.json({ error: 'Admin email not configured' }, { status: 400 });
        }

        const subject = `Credits Exhausted Alert - ${siteName}`;
        const html = `
            <div style="font-family: 'Outfit', 'Inter', sans-serif; padding: 40px; color: #1e1b4b; background-color: #f8fafc; border-radius: 24px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 32px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; padding: 16px; border-radius: 20px; background: #8b5cf615; color: #8b5cf6;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </div>
                    </div>
                    
                    <h2 style="text-align: center; color: #1e1b4b; font-size: 28px; font-weight: 800; margin-bottom: 16px;">Credits Exhausted</h2>
                    
                    <p style="text-align: center; color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                        Hello Admin, this is an automated alert to inform you that a user has exhausted their available credits on <strong>${siteName}</strong>.
                    </p>
                    
                    <div style="background: #f1f5f9; padding: 24px; border-radius: 16px; margin-bottom: 32px; text-align: center;">
                        <p style="margin: 0; font-weight: 600; color: #475569;">Application Domain</p>
                        <a href="${siteUrl}" style="color: #8b5cf6; text-decoration: none; font-size: 18px; font-weight: 700;">${siteUrl}</a>
                    </div>
                    
                    <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 32px;">
                        This notification was sent to you because you are configured as the primary contact for credit-related alerts.
                    </p>
                    
                    <div style="text-align: center;">
                        <a href="${siteUrl}/admin/users" style="display: inline-block; background: #8b5cf6; color: white; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; transition: all 0.2s;">
                            Manage Users
                        </a>
                    </div>
                    
                    <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="margin: 0; color: #94a3b8; font-size: 14px;">Best regards,</p>
                        <p style="margin: 4px 0 0; color: #1e1b4b; font-weight: 700;">The ${siteName} System</p>
                    </div>
                </div>
            </div>
        `;

        const result = await sendEmail({
            to: adminEmail,
            subject,
            html,
        });

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            console.error('SMTP Error:', result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Notification API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
