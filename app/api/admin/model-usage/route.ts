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

        // Daily model usage (count of requests)
        const dailyUsageRes = await query(`
            SELECT date_trunc('day', timestamp) as date, COUNT(*) as count 
            FROM token_logs 
            WHERE action='consume' AND model IS NOT NULL
            GROUP BY date 
            ORDER BY date ASC
            LIMIT 30
        `);

        // Top tools using models
        const topToolsRes = await query(`
            SELECT feature as tool, COUNT(*) as count 
            FROM token_logs 
            WHERE action='consume' AND model IS NOT NULL AND feature IS NOT NULL
            GROUP BY feature 
            ORDER BY count DESC 
            LIMIT 10
        `);

        // Most popular models
        const popularModelsRes = await query(`
            SELECT model, COUNT(*) as count, SUM(amount) as tokens
            FROM token_logs 
            WHERE action='consume' AND model IS NOT NULL
            GROUP BY model 
            ORDER BY count DESC 
            LIMIT 10
        `);

        return NextResponse.json({
            dailyUsage: dailyUsageRes.rows.map(r => ({
                date: r.date instanceof Date ? r.date.toLocaleDateString() : new Date(r.date).toLocaleDateString(),
                count: Number(r.count)
            })),
            topTools: topToolsRes.rows.map(r => ({
                tool: r.tool,
                count: Number(r.count)
            })),
            popularModels: popularModelsRes.rows.map(r => ({
                model: r.model,
                count: Number(r.count),
                tokens: Number(r.tokens)
            }))
        });
    } catch (error: any) {
        console.error("Error fetching model usage stats:", error);
        return NextResponse.json({ error: 'Failed to fetch model usage stats' }, { status: 500 });
    }
}
