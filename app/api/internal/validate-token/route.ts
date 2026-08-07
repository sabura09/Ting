import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getFeatureById } from "@/lib/features";

export async function POST(req: NextRequest) {
    try {
        const { email, featureId, model } = await req.json();
        if (!email || !featureId) {
            return NextResponse.json({ allowed: false, error: "Missing email or featureId" }, { status: 400 });
        }

        const settings = await db.getSettings();
        
        const featureData = getFeatureById(featureId);
        let cost = featureData?.tokenCost ?? 10; // default cost fallback
        let resolvedKey = featureId;

        // Dynamic key resolving to support auto-matching of future components
        if (settings.aiLimits[featureId] !== undefined) {
            cost = settings.aiLimits[featureId];
        } else {
            const candidates = [
                featureId,
                `${featureId}-generator`,
                `${featureId}-maker`,
                `${featureId}-studio`,
                featureId.replace('-generator', ''),
                featureId.replace('-maker', ''),
                featureId.replace('-studio', '')
            ];
            for (const cand of candidates) {
                if (settings.aiLimits[cand] !== undefined) {
                    cost = settings.aiLimits[cand];
                    resolvedKey = cand;
                    break;
                }
            }
        }

        const tokenData = await db.getTokenBalance(email);

        if (tokenData.balance < cost) {
            return NextResponse.json({ 
                allowed: false, 
                error: `Credits insufficient for this tool (${cost} tokens required). Please upgrade your plan or top up.` 
            }, { status: 403 });
        }

        // Deduct the tokens dynamically
        await db.updateTokenBalance(email, cost, 'consume', resolvedKey, model);

        return NextResponse.json({ 
            allowed: true, 
            cost, 
            featureId: resolvedKey,
            remaining: tokenData.balance - cost 
        });

    } catch (error: any) {
        console.error("Internal token validation error:", error);
        return NextResponse.json({ allowed: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
