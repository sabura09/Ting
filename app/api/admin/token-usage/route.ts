import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Daily usage
        const dailyUsageRes = await query(`
            SELECT date_trunc('day', timestamp) as date, SUM(amount) as tokens 
            FROM token_logs 
            WHERE action='consume' 
            GROUP BY date 
            ORDER BY date ASC
            LIMIT 30
        `);

        // Top tools
        const topToolsRes = await query(`
            SELECT feature as tool, SUM(amount) as tokens 
            FROM token_logs 
            WHERE action='consume' AND feature IS NOT NULL
            GROUP BY feature 
            ORDER BY tokens DESC 
            LIMIT 10
        `);

        // Top users
        const topUsersRes = await query(`
            SELECT t.email, u.name, SUM(t.amount) as tokens 
            FROM token_logs t 
            LEFT JOIN users u ON t.email = u.email 
            WHERE t.action='consume' 
            GROUP BY t.email, u.name 
            ORDER BY tokens DESC 
            LIMIT 10
        `);

        return NextResponse.json({
            dailyUsage: dailyUsageRes.rows.map(r => ({
                date: r.date instanceof Date ? r.date.toLocaleDateString() : new Date(r.date).toLocaleDateString(),
                tokens: Number(r.tokens)
            })),
            topTools: topToolsRes.rows.map(r => ({
                tool: r.tool,
                tokens: Number(r.tokens)
            })),
            topUsers: topUsersRes.rows.map(r => ({
                email: r.email,
                name: r.name || r.email.split('@')[0],
                tokens: Number(r.tokens)
            }))
        });
    } catch (error: any) {
        console.error("Error fetching token usage stats:", error);
        return NextResponse.json({ error: 'Failed to fetch token usage stats' }, { status: 500 });
    }
}
