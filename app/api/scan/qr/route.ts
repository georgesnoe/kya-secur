import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrcode } = body;

        if (!qrcode || typeof qrcode !== "string") {
            return NextResponse.json(
                { success: false, error: "QR code is required", match: false, needFaceScan: false },
                { status: 400 },
            );
        }

        const foundUser = await db
            .select()
            .from(user)
            .where(eq(user.qrcode, qrcode))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!foundUser) {
            return NextResponse.json(
                { success: false, error: "Invalid QR code", match: false, needFaceScan: false },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            match: true,
            needFaceScan: true,
            data: {
                id: foundUser.id,
                name: foundUser.name,
                email: foundUser.email,
                role: foundUser.role,
                qrcode: foundUser.qrcode,
                faceImage: foundUser.faceImage,
            },
        });
    } catch (error) {
        console.error("QR scan error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error", match: false, needFaceScan: false },
            { status: 500 },
        );
    }
}
