import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import dns from 'dns';

const resolveCname = (domain: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        dns.resolveCname(domain, (err, addresses) => {
            if (err) resolve([]);
            else resolve(addresses);
        });
    });
};

const resolveA = (domain: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        dns.resolve4(domain, (err, addresses) => {
            if (err) resolve([]);
            else resolve(addresses);
        });
    });
};

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return new NextResponse("Unauthorized", { status: 401 });
        const email = (session as any).email;

        const body = await req.json();
        const { id, websiteId } = body;

        if (!id || !websiteId) {
            return new NextResponse("Missing id or websiteId", { status: 400 });
        }

        // Verify the user owns the website
        const website = await db.getWebsite(websiteId);
        if (!website || website.userEmail !== email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const domainRecord = await db.getCustomDomainById(id);
        if (!domainRecord || domainRecord.websiteId !== websiteId) {
            return new NextResponse("Domain not found", { status: 404 });
        }

        const expectedCname = process.env.NEXT_PUBLIC_APP_CNAME || 'cname.vercel-dns.com';
        const expectedIp = process.env.NEXT_PUBLIC_APP_IP || '76.76.21.21';

        // Check CNAME first
        const cnames = await resolveCname(domainRecord.domain);
        let isVerified = false;

        if (cnames.includes(expectedCname)) {
            isVerified = true;
        } else {
            // Check A Record
            const ips = await resolveA(domainRecord.domain);
            if (ips.includes(expectedIp)) {
                isVerified = true;
            }
        }

        if (isVerified) {
            await db.updateCustomDomainStatus(id, 'active');
            return NextResponse.json({ success: true, status: 'active' });
        } else {
            // Wait for propagation
            return NextResponse.json({ success: true, status: 'pending', message: 'DNS records not yet propagated' });
        }
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
