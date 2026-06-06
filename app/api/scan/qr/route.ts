import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/lib/db";
import { user, scanSettings, scanLog } from "@/lib/schema";

export async function POST(request: NextRequest) {
    try {
        const faceScanEnabled = await db
            .select()
            .from(scanSettings)
            .where(eq(scanSettings.id, "default"))
            .limit(1)
            .then((rows) => (rows[0] ? rows[0].faceEnabled : true));

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

        const userScanAllowed = foundUser.scanEnabled ?? true;

        // Log the QR scan attempt
        await db.insert(scanLog).values({
            id: crypto.randomUUID(),
            userId: foundUser.id,
            type: "qr",
            match: userScanAllowed,
            qrCode: qrcode,
        });

        return NextResponse.json({
            success: true,
            match: userScanAllowed,
            needFaceScan: userScanAllowed && faceScanEnabled,
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
