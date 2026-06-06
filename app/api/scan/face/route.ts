import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/lib/db";
import { user, scanSettings, scanLog } from "@/lib/schema";
import { openai, OPENAI_MODEL } from "@/lib/openai";

export async function POST(request: NextRequest) {
    try {
        // Check if face scan is enabled
        const settings = await db
            .select()
            .from(scanSettings)
            .where(eq(scanSettings.id, "default"))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (settings && !settings.faceEnabled) {
            return NextResponse.json(
                { success: false, error: "Face scan is disabled", match: false, needFaceScan: false },
                { status: 403 },
            );
        }

        const body = await request.json();
        const { userId, image } = body;

        if (!userId || !image) {
            return NextResponse.json(
                { success: false, error: "userId and image are required", match: false, needFaceScan: false },
                { status: 400 },
            );
        }

        const foundUser = await db
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!foundUser) {
            return NextResponse.json(
                { success: false, error: "User not found", match: false, needFaceScan: false },
                { status: 404 },
            );
        }

        if (!foundUser.faceImage) {
            return NextResponse.json(
                { success: false, error: "User has no stored face image", match: false, needFaceScan: false },
                { status: 400 },
            );
        }

        // Check if user has scan disabled
        if (!foundUser.scanEnabled) {
            // Log the disabled scan attempt
            await db.insert(scanLog).values({
                id: crypto.randomUUID(),
                userId: foundUser.id,
                type: "face",
                match: false,
                faceResult: "SKIPPED",
            });

            return NextResponse.json({
                success: true,
                match: false,
                needFaceScan: false,
                data: {
                    id: foundUser.id,
                    name: foundUser.name,
                    email: foundUser.email,
                    role: foundUser.role,
                    qrcode: foundUser.qrcode,
                },
            });
        }

        // Compare faces using OpenAI vision
        // Fetch the stored face image via Vercel Blob SDK
        let storedFaceBase64: string;
        try {
            const result = await get(foundUser.faceImage, { access: "private" });

            if (!result || result.statusCode !== 200) {
                throw new Error("Blob retrieve failed");
            }

            const chunks: Uint8Array[] = [];
            const reader = result.stream.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
            storedFaceBase64 = Buffer.from(combined).toString("base64");
        } catch {
            return NextResponse.json(
                { success: false, error: "Failed to retrieve stored face image", match: false, needFaceScan: false },
                { status: 502 },
            );
        }

        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Compare these two faces carefully. Are they the same person? Answer with ONLY 'YES' or 'NO'.",
                        },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/jpeg;base64,${storedFaceBase64}` },
                        },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/jpeg;base64,${image}` },
                        },
                    ],
                },
            ],
            max_tokens: 10,
        });

        const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "NO";
        console.log(answer)
        const isMatch = answer === "YES";

        // Log the face scan result
        await db.insert(scanLog).values({
            id: crypto.randomUUID(),
            userId: foundUser.id,
            type: "face",
            match: isMatch,
            faceResult: answer,
        });

        if (isMatch) {
            return NextResponse.json({
                success: true,
                match: true,
                needFaceScan: false,
                data: {
                    id: foundUser.id,
                    name: foundUser.name,
                    email: foundUser.email,
                    role: foundUser.role,
                    qrcode: foundUser.qrcode,
                },
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: "Face does not match",
                match: false,
                needFaceScan: true,
                data: {
                    id: foundUser.id,
                    name: foundUser.name,
                    email: foundUser.email,
                    role: foundUser.role,
                    qrcode: foundUser.qrcode,
                },
            },
            { status: 401 },
        );
    } catch (error) {
        console.error("Face scan error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error", match: false, needFaceScan: false },
            { status: 500 },
        );
    }
}
