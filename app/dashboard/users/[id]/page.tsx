"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Toaster, toast } from "sonner";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    qrcode: string | null;
    faceImage: string | null;
}

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("user");
    const [faceImage, setFaceImage] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`/api/users/${id}`);
                if (!res.ok) throw new Error("User not found");
                const data = await res.json();
                const user: User = data.user;
                setName(user.name);
                setEmail(user.email);
                setRole(user.role);
                setFaceImage(user.faceImage);
            } catch {
                toast.error("Failed to load user");
                router.push("/dashboard/users");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error("Name and email are required");
            return;
        }
        setSaving(true);

        try {
            let newFaceImage = faceImage;

            // Upload new face image if provided
            if (file) {
                const uploadForm = new FormData();
                uploadForm.append("file", file);
                uploadForm.append("userId", id);

                const uploadRes = await fetch("/api/upload/face", {
                    method: "POST",
                    body: uploadForm,
                });

                if (!uploadRes.ok) {
                    throw new Error("Failed to upload face image");
                }

                const uploadData = await uploadRes.json();
                newFaceImage = uploadData.url;
            }

            const res = await fetch(`/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    role,
                    ...(newFaceImage !== faceImage && { faceImage: newFaceImage }),
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update user");
            }

            toast.success("User updated successfully");
            router.push("/dashboard/users");
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Loading user…
            </div>
        );
    }

    return (
        <>
            <Toaster richColors />
            <Card className="mx-auto max-w-lg">
                <CardHeader>
                    <CardTitle>Edit User</CardTitle>
                    <CardDescription>Update user information and role.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="face">Face Image</Label>
                            {faceImage && (
                                <div className="mb-2 overflow-hidden rounded-xl border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={faceImage}
                                        alt="Current face"
                                        className="h-32 w-full object-cover"
                                    />
                                </div>
                            )}
                            <Input
                                id="face"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty to keep the current image.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/dashboard/users")}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}
