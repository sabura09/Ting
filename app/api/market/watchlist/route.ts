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

// GET — Fetch user's watchlists
export async function GET(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await query(
            'SELECT * FROM trading_watchlists WHERE user_email = $1 ORDER BY is_default DESC, created_at ASC',
            [email]
        );

        // Create default watchlist if none exists
        if (result.rows.length === 0) {
            const defaultSymbols = JSON.stringify([
                { symbol: 'BTC', type: 'crypto', addedAt: new Date().toISOString() },
                { symbol: 'ETH', type: 'crypto', addedAt: new Date().toISOString() },
                { symbol: 'AAPL', type: 'stock', addedAt: new Date().toISOString() },
                { symbol: 'TSLA', type: 'stock', addedAt: new Date().toISOString() },
            ]);
            const inserted = await query(
                'INSERT INTO trading_watchlists (user_email, name, symbols, is_default) VALUES ($1, $2, $3, true) RETURNING *',
                [email, 'My Watchlist', defaultSymbols]
            );
            return NextResponse.json({ watchlists: inserted.rows });
        }

        return NextResponse.json({ watchlists: result.rows });
    } catch (error: any) {
        console.error('Watchlist GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST — Create watchlist or add symbol
export async function POST(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { action, watchlistId, name, symbol, type } = body;

        if (action === 'create') {
            const result = await query(
                'INSERT INTO trading_watchlists (user_email, name, symbols) VALUES ($1, $2, $3) RETURNING *',
                [email, name || 'Untitled', '[]']
            );
            return NextResponse.json({ watchlist: result.rows[0] });
        }

        if (action === 'add_symbol' && watchlistId && symbol && type) {
            const result = await query(
                `UPDATE trading_watchlists 
                 SET symbols = symbols || $1::jsonb, updated_at = now() 
                 WHERE id = $2 AND user_email = $3 
                 RETURNING *`,
                [JSON.stringify([{ symbol, type, addedAt: new Date().toISOString() }]), watchlistId, email]
            );
            return NextResponse.json({ watchlist: result.rows[0] });
        }

        if (action === 'remove_symbol' && watchlistId && symbol) {
            // Remove symbol from JSONB array
            const watchlist = await query(
                'SELECT symbols FROM trading_watchlists WHERE id = $1 AND user_email = $2',
                [watchlistId, email]
            );
            if (watchlist.rows.length === 0) {
                return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
            }
            const symbols = (watchlist.rows[0].symbols || []).filter(
                (s: any) => s.symbol !== symbol
            );
            const result = await query(
                'UPDATE trading_watchlists SET symbols = $1, updated_at = now() WHERE id = $2 AND user_email = $3 RETURNING *',
                [JSON.stringify(symbols), watchlistId, email]
            );
            return NextResponse.json({ watchlist: result.rows[0] });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Watchlist POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE — Delete watchlist
export async function DELETE(req: NextRequest) {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Watchlist ID required' }, { status: 400 });

        await query(
            'DELETE FROM trading_watchlists WHERE id = $1 AND user_email = $2',
            [id, email]
        );
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Watchlist DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
