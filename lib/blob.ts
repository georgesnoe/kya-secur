import { put } from "@vercel/blob";

export async function uploadFaceToBlob(
    file: File | Blob,
    userId: string,
): Promise<string> {
    const blob = await put(`faces/${userId}`, file, {
        access: "public",
        addRandomSuffix: true,
    });
    return blob.url;
}
