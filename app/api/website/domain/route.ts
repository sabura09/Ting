import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return new NextResponse("Unauthorized", { status: 401 });
        const email = (session as any).email;

        const body = await req.json();
        const { domain, websiteId } = body;

        if (!domain || !websiteId) {
            return new NextResponse("Missing domain or websiteId", { status: 400 });
        }

        // Verify the user owns the website
        const website = await db.getWebsite(websiteId);
        if (!website || website.userEmail !== email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if domain already exists anywhere
        const existingDomain = await db.getCustomDomain(domain);
        if (existingDomain) {
            return new NextResponse("Domain is already in use", { status: 400 });
        }

        const newDomain = {
            id: uuidv4(),
            domain: domain.toLowerCase(),
            websiteId,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.addCustomDomain(newDomain);

        return NextResponse.json({ success: true, domain: newDomain });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return new NextResponse("Unauthorized", { status: 401 });
        const email = (session as any).email;

        const url = new URL(req.url);
        const websiteId = url.searchParams.get('websiteId');

        if (!websiteId) {
            return new NextResponse("Missing websiteId", { status: 400 });
        }

        // Verify ownership
        const website = await db.getWebsite(websiteId);
        if (!website || website.userEmail !== email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const domains = await db.listCustomDomainsByWebsite(websiteId);
        return NextResponse.json(domains);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return new NextResponse("Unauthorized", { status: 401 });
        const email = (session as any).email;

        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        const websiteId = url.searchParams.get('websiteId');

        if (!id || !websiteId) {
            return new NextResponse("Missing id or websiteId", { status: 400 });
        }

        // Verify ownership
        const website = await db.getWebsite(websiteId);
        if (!website || website.userEmail !== email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const domain = await db.getCustomDomainById(id);
        if (!domain || domain.websiteId !== websiteId) {
            return new NextResponse("Domain not found", { status: 404 });
        }

        await db.deleteCustomDomain(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
