import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/pg';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

async function getUserEmail(req: NextRequest): Promise<string | null> {
    const session = req.cookies.get('session')?.value;
    if (!session) return null;
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(session, secret);
        return payload.email as string;
    } catch { return null; }
}

// GET — List user alerts
export async function GET(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await query(
            'SELECT * FROM trading_alerts WHERE user_email = $1 ORDER BY created_at DESC LIMIT 50',
            [email]
        );
        return NextResponse.json({ alerts: result.rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST — Create alert
export async function POST(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { symbol, marketType, condition, threshold } = body;

        if (!symbol || !marketType || !condition || threshold === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const validConditions = ['price_above', 'price_below', 'rsi_above', 'rsi_below', 'macd_cross', 'ema_cross', 'volume_spike'];
        if (!validConditions.includes(condition)) {
            return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO trading_alerts (user_email, symbol, market_type, condition, threshold) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [email, symbol, marketType, condition, threshold]
        );

        return NextResponse.json({ alert: result.rows[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE — Remove alert
export async function DELETE(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });

        await query(
            'DELETE FROM trading_alerts WHERE id = $1 AND user_email = $2',
            [id, email]
        );
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
