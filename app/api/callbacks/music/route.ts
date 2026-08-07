import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const data = await req.json();
        console.log("Kie.ai Callback Received:", data);

        // Here you could update a database record, send a notification, etc.
        // For now we just log it and return success.

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Callback Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
