import { put } from "@vercel/blob";

export async function uploadFaceToBlob(
    file: File | Blob,
    userId: string,
): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blob = await put(`faces/${userId}`, buffer, {
        access: "private",
        addRandomSuffix: true,
    });
    return blob.url;
}
