"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
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

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function api(path: string) {
    return `${API}${path}`;
}

async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    qrcode: string | null;
    faceImage: string | null;
    scanEnabled: boolean;
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
    const [scanEnabled, setScanEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetchWithTimeout(api(`/api/users/${id}`));
                if (!res.ok) throw new Error("User not found");
                const data = await res.json();
                const user: User = data.user;
                setName(user.name);
                setEmail(user.email);
                setRole(user.role);
                setFaceImage(user.faceImage);
                setScanEnabled(user.scanEnabled ?? true);
            } catch {
                toast.error("Erreur lors du chargement de l'utilisateur");
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
            toast.error("Le nom et l'email sont requis");
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

                const uploadRes = await fetchWithTimeout(api("/api/upload/face"), {
                    method: "POST",
                    body: uploadForm,
                });

                if (!uploadRes.ok) {
                    throw new Error("Échec du téléversement de l'image");
                }

                const uploadData = await uploadRes.json();
                newFaceImage = uploadData.url;
            }

            const res = await fetchWithTimeout(api(`/api/users/${id}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    role,
                    scanEnabled,
                    ...(newFaceImage !== faceImage && { faceImage: newFaceImage }),
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update user");
            }

            toast.success("Utilisateur mis à jour avec succès");
            router.push("/dashboard/users");
        } catch (err: any) {
            toast.error(err.message || "Une erreur est survenue");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Chargement de l'utilisateur…
            </div>
        );
    }

    return (
        <>
            <Toaster richColors />
            <Card className="mx-auto max-w-lg">
                <CardHeader>
                    <CardTitle>Modifier l'utilisateur</CardTitle>
                    <CardDescription>Mettre à jour les informations et le rôle de l'utilisateur.</CardDescription>
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
                            {faceImage && (
                                <div className="mb-2 overflow-hidden rounded-xl border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`/api/users/${id}/face`}
                                        alt="Visage actuel"
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
                                Laissez vide pour conserver l'image actuelle.
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
                                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}
