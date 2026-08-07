import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get all domains
export async function GET() {
    try {
        const websites = await db.listAllWebsites();
        return NextResponse.json({ domains: websites });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Delete a domain
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
        }

        await db.deleteWebsite(id);
        return NextResponse.json({ message: 'Domain deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
