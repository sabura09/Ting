import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/lib/market-data';
import type { MarketType } from '@/lib/market-data';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol');
        const type = (searchParams.get('type') || 'stock') as MarketType;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
        }

        const quote = await getQuote(symbol, type);
        return NextResponse.json(quote);
    } catch (error: any) {
        console.error('Quote API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch quote' },
            { status: 500 }
        );
    }
}
