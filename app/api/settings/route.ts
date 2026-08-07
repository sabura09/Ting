import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await db.getSettings();

        // Return ONLY non-sensitive data
        return NextResponse.json({
            defaultTokens: data.defaultTokens,
            aiLimits: data.aiLimits,
            paymentEnabled: data.paymentEnabled,
            paymentGateway: data.paymentGateway || 'stripe',
            stripePublicKey: data.stripePublicKey,
            paypalClientId: data.paypalClientId,
            paypalMode: data.paypalMode || 'sandbox',
            showAiSettings: data.showAiSettings,
            showDemoMode: data.showDemoMode,
            metadata: {
                ...data.metadata,
                siteName: data.metadata?.siteName,
                siteUrl: data.metadata?.siteUrl,
                logoUrl: data.metadata?.logoUrl,
                primaryColor: data.metadata?.primaryColor,
                defaultTheme: data.metadata?.defaultTheme,
            }
        });
    } catch (error) {
        console.error("Error fetching public settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}
