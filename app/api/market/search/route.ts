import { NextRequest, NextResponse } from 'next/server';
import { searchMarket } from '@/lib/market-data';
import type { MarketType } from '@/lib/market-data';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const type = searchParams.get('type') as MarketType | undefined;

        if (!query || query.length < 1) {
            return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
        }

        const results = await searchMarket(query, type || undefined);
        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to search' },
            { status: 500 }
        );
    }
}
