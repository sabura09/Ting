
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getFeatureById } from "@/lib/features";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { feature, model } = await req.json();
        const userEmail = (session as any).email as string;

        const settings = await db.getSettings();
        const featureData = getFeatureById(feature);
        const actualCost = settings.aiLimits?.[feature] ?? featureData?.tokenCost ?? 10;

        const tokenData = await db.getTokenBalance(userEmail);

        if (tokenData.balance < actualCost) {
            return NextResponse.json({ error: "Insufficient tokens" }, { status: 403 });
        }

        await db.updateTokenBalance(userEmail, actualCost, 'consume', feature || 'website-generation', model);

        return NextResponse.json({ success: true, remaining: tokenData.balance - actualCost });

    } catch (error) {
        console.error("Token deduction error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
