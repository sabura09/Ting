
import { db, GameProject } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, name, code, prompt, genre, visualStyle, previewImage } = body;
        const userEmail = (session as any).email;

        if (!userEmail) {
            return NextResponse.json({ error: "User email not found in session" }, { status: 500 });
        }

        let project: GameProject;

        if (id) {
            // Update existing
            const existing = await db.getGame(id);
            if (existing && existing.userEmail !== userEmail) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            project = {
                id,
                userEmail,
                name: name || existing?.name || "Untitled Game",
                code: code || existing?.code || "",
                prompt: prompt || existing?.prompt || "",
                genre: genre || existing?.genre || "arcade",
                visualStyle: visualStyle || existing?.visualStyle || "pixel-art",
                createdAt: existing?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                previewImage: previewImage || existing?.previewImage
            };
        } else {
            // Create new
            project = {
                id: uuidv4(),
                userEmail,
                name: name || "Untitled Game",
                code: code || "",
                prompt: prompt || "",
                genre: genre || "arcade",
                visualStyle: visualStyle || "pixel-art",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                previewImage
            };
        }

        await db.saveGame(project);
        return NextResponse.json({ success: true, project });

    } catch (error) {
        console.error("Save game error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = (session as any).email;

        if (!userEmail) {
            return NextResponse.json({ error: "User email not found in session" }, { status: 500 });
        }

        const projects = await db.listGames(userEmail);

        return NextResponse.json(projects);

    } catch (error) {
        console.error("List games error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const userEmail = (session as any).email;

        if (!userEmail) {
            return NextResponse.json({ error: "User email not found in session" }, { status: 500 });
        }

        const existing = await db.getGame(id);
        if (existing && existing.userEmail !== userEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.deleteGame(id!);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Delete game error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
