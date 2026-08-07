import { NextRequest, NextResponse } from 'next/server';
import { getTrending } from '@/lib/market-data';
import type { MarketType } from '@/lib/market-data';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = (searchParams.get('type') || 'crypto') as MarketType;

        const results = await getTrending(type);
        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('Trending API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch trending' },
            { status: 500 }
        );
    }
}
