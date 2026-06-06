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
        const foundUser = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!foundUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user: foundUser });
    } catch (error) {
        console.error("Get user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, email, role, faceImage, scanEnabled } = body;

        const existingUser = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const [updatedUser] = await db
            .update(user)
            .set({
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(role !== undefined && { role }),
                ...(faceImage !== undefined && { faceImage }),
                ...(scanEnabled !== undefined && { scanEnabled }),
            })
            .where(eq(user.id, id))
            .returning();

        return NextResponse.json({ user: updatedUser });
    } catch (error: any) {
        console.error("Update user error:", error);
        if (error?.code === "23505") {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        const existingUser = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await db.delete(user).where(eq(user.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
