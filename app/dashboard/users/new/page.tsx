"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
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

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function api(path: string) {
    return `${API}${path}`;
}

async function fetchWithTimeout(
    input: RequestInfo,
    init?: RequestInit,
    timeoutMs = 15000
) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

export default function NewUserPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("user");
    const [file, setFile] = useState<File | null>(null);
    const [scanEnabled, setScanEnabled] = useState(true);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error("Le nom et l'email sont requis");
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

                const uploadRes = await fetchWithTimeout(api("/api/upload/face"), {
                    method: "POST",
                    body: uploadForm,
                });

                if (!uploadRes.ok) {
                    throw new Error("Échec du téléversement de l'image");
                }

                const uploadData = await uploadRes.json();
                faceImage = uploadData.url;
            }

            // Step 2: Create user
            const res = await fetchWithTimeout(api("/api/users"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    role,
                    faceImage,
                    scanEnabled,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create user");
            }

            toast.success("Utilisateur créé avec succès");
            router.push("/dashboard/users");
        } catch (err: any) {
            toast.error(err.message || "Une erreur est survenue");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Toaster richColors />
            <Card className="mx-auto max-w-lg">
                <CardHeader>
                    <CardTitle>Créer un utilisateur</CardTitle>
                    <CardDescription>
                        Ajoutez un nouvel utilisateur au système. Un code QR unique sera généré automatiquement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom</Label>
                            <Input
                                id="name"
                                placeholder="Jean Dupont"
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
                            <Select value={role} onValueChange={(v) => { if (v) setRole(v); }}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Utilisateur</SelectItem>
                                    <SelectItem value="admin">Administrateur</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="face">Photo du visage</Label>
                            <Input
                                id="face"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Téléversez une photo de visage claire pour la reconnaissance faciale.
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium text-sm">Scan activé</p>
                                <p className="text-xs text-muted-foreground">
                                    Autoriser cet utilisateur à s'authentifier via scans
                                </p>
                            </div>
                            <Switch
                                checked={scanEnabled}
                                onCheckedChange={setScanEnabled}
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/dashboard/users")}
                                disabled={saving}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Création…" : "Créer l'utilisateur"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}
