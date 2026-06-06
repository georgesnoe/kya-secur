import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function GET() {
    try {
        const users = await db.select().from(user).orderBy(user.createdAt);
        return NextResponse.json({ users });
    } catch (error) {
        console.error("List users error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, role, faceImage, scanEnabled } = body;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        const qrcode = crypto.randomUUID();

        const [newUser] = await db
            .insert(user)
            .values({
                id: crypto.randomUUID(),
                name,
                email,
                role: role || "user",
                qrcode,
                faceImage: faceImage || null,
                scanEnabled: scanEnabled !== undefined ? scanEnabled : true,
            })
            .returning();

        return NextResponse.json({ user: newUser }, { status: 201 });
    } catch (error: any) {
        console.error("Create user error:", error);
        if (error?.message?.includes("unique") || error?.code === "23505") {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
