import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scanSettings } from "@/lib/schema";

async function getSettings() {
    const rows = await db
        .select()
        .from(scanSettings)
        .where(eq(scanSettings.id, "default"))
        .limit(1);
    return rows[0] ?? null;
}

async function ensureSettings() {
    const existing = await getSettings();
    if (!existing) {
        await db.insert(scanSettings).values({ id: "default" });
    }
}

export async function GET() {
    try {
        await ensureSettings();
        const settings = await getSettings();
        return NextResponse.json({
            faceEnabled: settings?.faceEnabled ?? true,
        });
    } catch (error) {
        console.error("Get settings error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { faceEnabled } = body;

        await ensureSettings();

        await db
            .update(scanSettings)
            .set({
                ...(faceEnabled !== undefined && { faceEnabled }),
            })
            .where(eq(scanSettings.id, "default"));

        const updated = await getSettings();
        return NextResponse.json({
            faceEnabled: updated?.faceEnabled ?? true,
        });
    } catch (error) {
        console.error("Update settings error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
