import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const startDateStr = url.searchParams.get('startDate');
        const endDateStr = url.searchParams.get('endDate');

        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.listUsers(startDate, endDate);
        const settings = await db.getSettings();
        const totalTokens = await db.getTotalDistributedTokens(startDate, endDate);
        const totalConsumedTokens = await db.getTotalConsumedTokens(startDate, endDate);
        const tokenStats = await db.getTokenUsageStats(startDate, endDate);
        const totalWebsites = await db.getTotalWebsites(startDate, endDate);

        // Simple aggregation for dashboard
        const { totalRevenue, monthlyRevenue, revenueData } = await db.getRevenueStats(startDate, endDate);
        const toolUsageData = await db.getToolUsageDistribution(startDate, endDate);
        const recentActivities = await db.getDashboardRecentActivities(startDate, endDate);

        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            totalTokensDistributed: totalTokens,
            totalTokensConsumed: totalConsumedTokens,
            totalWebsites,
            tokenUsage: tokenStats,
            totalRevenue,
            monthlyRevenue,
            revenueData,
            toolUsageData,
            recentActivities,
            systemStatus: 'Operational',
            recentUsers: users
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 5)
                .map(({ password, ...u }) => u)
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
    }
}
