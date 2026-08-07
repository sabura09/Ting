import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date().toISOString();

        // Fetch active banners within time range
        const { data, error } = await supabaseAdmin
            .from("announcement_banners")
            .select("*")
            .eq("is_enabled", true)
            .lte("start_date", now)
            .gte("end_date", now)
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Return the highest priority active banner (only one needed for frontend display)
        return NextResponse.json(data[0] || null);
    } catch (error: any) {
        console.error("Error fetching public banner:", error);
        return NextResponse.json({ error: "Failed to fetch banner" }, { status: 500 });
    }
}
