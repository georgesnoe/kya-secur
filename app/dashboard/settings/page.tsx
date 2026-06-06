"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
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

export default function SettingsPage() {
    const [faceEnabled, setFaceEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch(api("/api/settings/scan"));
                if (!res.ok) throw new Error();
                const data = await res.json();
                setFaceEnabled(data.faceEnabled);
            } catch {
                toast.error("Erreur lors du chargement des paramètres");
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleToggle = async (newValue: boolean) => {
        setFaceEnabled(newValue);
        setSaving(true);
        try {
            const res = await fetch(api("/api/settings/scan"), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faceEnabled: newValue }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save");
            }
            toast.success("Paramètres enregistrés");
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la sauvegarde");
            setFaceEnabled(!newValue);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Chargement des paramètres…
            </div>
        );
    }

    return (
        <>
            <Toaster richColors />
            <Card className="mx-auto max-w-lg">
                <CardHeader>
                    <CardTitle>Paramètres de scan</CardTitle>
                    <CardDescription>
                        Activer ou désactiver la reconnaissance faciale.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="font-medium">Scan facial</p>
                            <p className="text-sm text-muted-foreground">
                                Autoriser les utilisateurs à s'authentifier via la reconnaissance faciale
                            </p>
                        </div>
                        <Switch
                            checked={faceEnabled}
                            onCheckedChange={(v) => handleToggle(v)}
                            disabled={saving}
                        />
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
