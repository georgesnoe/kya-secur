import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const foundUser = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!foundUser?.faceImage) {
            return NextResponse.json({ error: "No face image found" }, { status: 404 });
        }

        // Fetch the image from Vercel Blob (signed URL works server-side)
        const response = await fetch(foundUser.faceImage);

        if (!response.ok) {
            console.error("Blob fetch failed:", response.status, response.statusText);
            return NextResponse.json({ error: "Failed to fetch face image" }, { status: 502 });
        }

        const blob = await response.blob();

        return new NextResponse(blob, {
            headers: {
                "Content-Type": response.headers.get("content-type") || "image/jpeg",
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("Face image proxy error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
