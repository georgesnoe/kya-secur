import { NextRequest, NextResponse } from "next/server";
import { uploadFaceToBlob } from "@/lib/blob";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const userId = formData.get("userId") as string | null;

        if (!file || !userId) {
            return NextResponse.json({ error: "File and userId are required" }, { status: 400 });
        }

        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "File must be an image" }, { status: 400 });
        }

        const url = await uploadFaceToBlob(file, userId);

        return NextResponse.json({ url });
    } catch (error) {
        console.error("Face upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
