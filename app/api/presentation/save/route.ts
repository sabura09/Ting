import { db, PresentationProject } from "@/lib/db";
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
        const { id, name, slides, messages } = body;
        const userEmail = (session as any).email;

        if (!userEmail) {
            return NextResponse.json({ error: "User email not found in session" }, { status: 500 });
        }

        let project: PresentationProject;

        if (id) {
            // Update existing
            const existing = await db.getPresentation(id);
            if (existing && existing.userEmail !== userEmail) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            project = {
                id,
                userEmail,
                name: name || existing?.name || "Untitled Presentation",
                slides: slides || existing?.slides || [],
                messages: messages || existing?.messages || [],
                createdAt: existing?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            // Create new
            project = {
                id: uuidv4(),
                userEmail,
                name: name || "Untitled Presentation",
                slides: slides || [],
                messages: messages || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        await db.savePresentation(project);
        return NextResponse.json({ success: true, project });

    } catch (error) {
        console.error("Save presentation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        const userEmail = (session as any).email;
        if (!userEmail) {
            return NextResponse.json({ error: "User email not found in session" }, { status: 500 });
        }

        if (!id) {
            const projects = await db.listPresentations(userEmail);
            return NextResponse.json(projects);
        }

        const project = await db.getPresentation(id);
        if (!project) {
            return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
        }

        if (project.userEmail !== userEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(project);

    } catch (error) {
        console.error("Get presentations error:", error);
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

        const existing = await db.getPresentation(id);
        if (existing && existing.userEmail !== userEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.deletePresentation(id);
        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
