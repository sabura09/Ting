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

// GET — Fetch portfolio
export async function GET(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await query(
            'SELECT * FROM trading_portfolio WHERE user_email = $1 ORDER BY created_at DESC',
            [email]
        );
        return NextResponse.json({ holdings: result.rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST — Add or update position
export async function POST(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { action, symbol, marketType, quantity, entryPrice, holdingId } = body;

        if (action === 'add') {
            if (!symbol || !marketType || !quantity || !entryPrice) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // Check if position already exists
            const existing = await query(
                'SELECT * FROM trading_portfolio WHERE user_email = $1 AND symbol = $2 AND market_type = $3',
                [email, symbol, marketType]
            );

            if (existing.rows.length > 0) {
                // Average into existing position
                const pos = existing.rows[0];
                const totalQty = parseFloat(pos.quantity) + quantity;
                const avgPrice = ((parseFloat(pos.quantity) * parseFloat(pos.avg_entry_price)) + (quantity * entryPrice)) / totalQty;

                const result = await query(
                    `UPDATE trading_portfolio 
                     SET quantity = $1, avg_entry_price = $2, updated_at = now() 
                     WHERE id = $3 AND user_email = $4 RETURNING *`,
                    [totalQty, avgPrice, pos.id, email]
                );
                return NextResponse.json({ holding: result.rows[0] });
            }

            const result = await query(
                `INSERT INTO trading_portfolio (user_email, symbol, market_type, quantity, avg_entry_price) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [email, symbol, marketType, quantity, entryPrice]
            );
            return NextResponse.json({ holding: result.rows[0] });
        }

        if (action === 'close' && holdingId) {
            await query(
                'DELETE FROM trading_portfolio WHERE id = $1 AND user_email = $2',
                [holdingId, email]
            );
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
