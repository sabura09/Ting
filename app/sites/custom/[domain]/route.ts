import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, context: { params: Promise<{ domain: string }> }) {
    const params = await context.params;
    const domain = params.domain;
    
    try {
        const customDomainRow = await db.getCustomDomain(domain);

        if (!customDomainRow || customDomainRow.status !== 'active') {
            return new NextResponse(
                `<html><body><h1>Domain Not Active</h1><p>The domain <b>${domain}</b> is not active or has not been configured properly.</p></body></html>`, 
                { 
                    status: 404,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
            );
        }

        const website = await db.getWebsite(customDomainRow.websiteId);

        if (!website) {
            return new NextResponse(
                `<html><body><h1>Website Not Found</h1><p>The project linked to this domain no longer exists.</p></body></html>`, 
                { 
                    status: 404,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
            );
        }

        return new NextResponse(website.code, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
