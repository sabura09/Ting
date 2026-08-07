import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, context: { params: Promise<{ subdomain: string }> }) {
    const params = await context.params;
    const subdomain = params.subdomain;
    
    try {
        const website = await db.getWebsiteBySubdomain(subdomain);

        if (!website) {
            return new NextResponse(
                `<html><body><h1>Website Not Found</h1><p>The subdomain <b>${subdomain}</b> does not exist or has been removed.</p></body></html>`, 
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
