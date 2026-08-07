import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        // Parse request as multipart/form-data
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Unsupported Content-Type. Form must be multipart/form-data.' }, { status: 400 });
        }

        const formData = await req.formData();
        
        // Spam protection (Honeypot field)
        const honeypot = formData.get('honeypot') as string;
        if (honeypot && honeypot.trim() !== '') {
            console.warn('[Custom Requirement API] Honeypot field filled. Rejecting submission silently.');
            return NextResponse.json({ success: true, message: 'Requirement submitted successfully.' });
        }

        const email = formData.get('email') as string;
        const requirement = formData.get('requirement') as string;
        const budgetStr = formData.get('budget') as string;
        const file = formData.get('file') as File | null;

        // Server-Side Validations
        if (!email || !requirement || !budgetStr) {
            return NextResponse.json({ error: 'All fields (Email, Requirement, Budget) are required.' }, { status: 400 });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        // Requirement minimum length validation
        if (requirement.trim().length < 20) {
            return NextResponse.json({ error: 'Custom requirement description must be at least 20 characters long.' }, { status: 400 });
        }

        // Budget validation
        const budget = parseFloat(budgetStr);
        if (isNaN(budget) || budget <= 0) {
            return NextResponse.json({ error: 'Budget must be a positive number greater than 0.' }, { status: 400 });
        }

        // File validation (optional)
        const attachments: any[] = [];
        let fileNameStr = 'No attachment provided';

        if (file && file.size > 0) {
            // Limit file size to 10MB
            const MAX_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
                return NextResponse.json({ error: 'File size exceeds the 10 MB limit.' }, { status: 400 });
            }

            // Acceptable extensions & mime types
            const fileName = file.name;
            const fileExt = fileName.split('.').pop()?.toLowerCase();
            const allowedExtensions = ['pdf', 'doc', 'docx'];
            const allowedMimeTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            if (!allowedExtensions.includes(fileExt || '') && !allowedMimeTypes.includes(file.type)) {
                return NextResponse.json({ error: 'Invalid file format. Only PDF, DOC, and DOCX files are allowed.' }, { status: 400 });
            }

            fileNameStr = fileName;

            // Convert file to buffer for nodemailer attachment
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            attachments.push({
                filename: fileName,
                content: buffer,
                contentType: file.type || 'application/octet-stream'
            });
        }

        // Fetch System Settings
        const settings = await db.getSettings();
        const siteName = settings.metadata?.siteName || 'AI Suite';
        
        // Take recipient/admin email from configured SMTP settings, fallback to standard locations
        const adminEmail = settings.metadata?.smtp?.from || process.env.SMTP_FROM || settings.metadata?.smtp?.user;

        if (!adminEmail) {
            console.error('[Custom Requirement API] Error: Admin/Recipient email is not configured in SMTP settings.');
            return NextResponse.json({ error: 'Server configuration error: Recipient email is not configured.' }, { status: 500 });
        }

        const subject = 'New Customisation Requirement Request';
        const submissionDate = new Date().toUTCString();

        // Compile HTML email body
        const html = `
            <div style="font-family: 'Outfit', 'Inter', sans-serif; padding: 40px; color: #1e1b4b; background-color: #f8fafc; border-radius: 24px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 32px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid #f1f5f9;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; padding: 16px; border-radius: 20px; background: #8b5cf615; color: #8b5cf6;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                    </div>
                    
                    <h2 style="text-align: center; color: #1e1b4b; font-size: 24px; font-weight: 800; margin-bottom: 24px; margin-top: 0;">New Customisation Requirement Request</h2>
                    
                    <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 24px 0; margin-bottom: 24px;">
                        <div style="margin-bottom: 20px;">
                            <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Client Email Address</span>
                            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #0f172a;">${email}</p>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Budget</span>
                            <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: #8b5cf6;">$${budget.toLocaleString()}</p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Submission Date & Time</span>
                            <p style="margin: 4px 0 0; font-size: 15px; color: #334155;">${submissionDate}</p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Attached File Name</span>
                            <p style="margin: 4px 0 0; font-size: 15px; color: #334155; font-weight: 500;">${fileNameStr}</p>
                        </div>

                        <div>
                            <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Requirement Details</span>
                            <div style="margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">${requirement}</div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                        This email was generated automatically by the ${siteName} system portal in response to a visitor submitting the Custom Requirement form.
                    </div>
                </div>
            </div>
        `;

        // Send the email with optional attachments
        const emailResult = await sendEmail({
            to: adminEmail,
            subject,
            html,
            attachments
        });

        if (emailResult.success) {
            return NextResponse.json({ success: true, message: 'Your requirement request has been submitted successfully.' });
        } else {
            console.error('[Custom Requirement API] SMTP Send Error:', emailResult.error);
            return NextResponse.json({ error: 'Failed to send requirement email. Please try again later.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Custom Requirement API] Unexpected Exception:', error);
        return NextResponse.json({ error: 'An unexpected server error occurred. Please try again.' }, { status: 500 });
    }
}
