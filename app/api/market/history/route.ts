import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/market-data';
import type { MarketType, TimeInterval } from '@/lib/market-data';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol');
        const type = (searchParams.get('type') || 'stock') as MarketType;
        const interval = (searchParams.get('interval') || '1d') as TimeInterval;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
        }

        const validIntervals: TimeInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];
        if (!validIntervals.includes(interval)) {
            return NextResponse.json(
                { error: `Invalid interval. Valid: ${validIntervals.join(', ')}` },
                { status: 400 }
            );
        }

        const bars = await getHistory(symbol, type, interval);
        return NextResponse.json({ symbol, type, interval, bars });
    } catch (error: any) {
        console.error('History API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch history' },
            { status: 500 }
        );
    }
}
