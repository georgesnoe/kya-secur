"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewUserPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("user");
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error("Name and email are required");
            return;
        }
        setSaving(true);

        try {
            let faceImage: string | null = null;

            // Step 1: Upload face image if provided
            if (file) {
                const uploadForm = new FormData();
                uploadForm.append("file", file);
                uploadForm.append("userId", "temp");

                const uploadRes = await fetch("/api/upload/face", {
                    method: "POST",
                    body: uploadForm,
                });

                if (!uploadRes.ok) {
                    throw new Error("Failed to upload face image");
                }

                const uploadData = await uploadRes.json();
                faceImage = uploadData.url;
            }

            // Step 2: Create user
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    role,
                    faceImage,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create user");
            }

            toast.success("User created successfully");
            router.push("/dashboard/users");
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Toaster richColors />
            <Card className="mx-auto max-w-lg">
                <CardHeader>
                    <CardTitle>Create User</CardTitle>
                    <CardDescription>
                        Add a new user to the system. A unique QR code will be generated
                        automatically.
                    </CardDescription>
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
                            <Input
                                id="face"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Upload a clear face photo for face recognition scanning.
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
                                {saving ? "Creating…" : "Create User"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}
