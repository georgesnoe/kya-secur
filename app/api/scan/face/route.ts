import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { openai, OPENAI_MODEL } from "@/lib/openai";

export async function POST(request: NextRequest) {
    try {
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

        // Compare faces using OpenAI vision
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
                            image_url: { url: foundUser.faceImage },
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
        const isMatch = answer === "YES";

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
