import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from("announcement_banners")
            .select("*")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching admin banners:", error);
        return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        
        const { data, error } = await supabaseAdmin
            .from("announcement_banners")
            .insert([{
                message: body.message,
                start_date: body.start_date,
                end_date: body.end_date,
                bg_gradient: body.bg_gradient,
                text_color: body.text_color || "#ffffff",
                is_enabled: body.is_enabled ?? true,
                is_dismissible: body.is_dismissible ?? true,
                button_text: body.button_text,
                button_link: body.button_link,
                priority: body.priority || 0,
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error creating banner:", error);
        return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Banner ID is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("announcement_banners")
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error updating banner:", error);
        return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Banner ID is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("announcement_banners")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting banner:", error);
        return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
    }
}
