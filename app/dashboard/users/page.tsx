"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster, toast } from "sonner";
import QRCode from "qrcode";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    qrcode: string | null;
    faceImage: string | null;
    createdAt: string;
    scanEnabled: boolean;
}

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

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [qrUser, setQrUser] = useState<{ name: string; qrcode: string } | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(api("/api/users"));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setUsers(data.users ?? []);
        } catch {
            toast.error("Erreur lors du chargement des utilisateurs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await fetchWithTimeout(api(`/api/users/${deleteId}`), {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Utilisateur supprimé");
            setUsers((prev) => prev.filter((u) => u.id !== deleteId));
        } catch {
            toast.error("Erreur lors de la suppression");
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    // Generate QR data URL when modal opens
    useEffect(() => {
        if (!qrUser) {
            setQrDataUrl(null);
            return;
        }
        QRCode.toDataURL(qrUser.qrcode, {
            width: 700,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
        }).then(setQrDataUrl);
    }, [qrUser]);

    const handleDownloadQR = () => {
        if (!qrDataUrl || !qrUser) return;
        const link = document.createElement("a");
        link.download = `qrcode-${qrUser.name.replace(/\s+/g, "-").toLowerCase()}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    return (
        <>
            <Toaster richColors />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Utilisateurs</CardTitle>
                        <CardDescription>
                            Gérer tous les utilisateurs enregistrés dans le système.
                        </CardDescription>
                    </div>
                    <Button nativeButton={false} render={<Link href="/dashboard/users/new" />}>
                        Ajouter
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                            Chargement des utilisateurs…
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                            Aucun utilisateur trouvé. Créez votre premier utilisateur !
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Avatar</TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Code QR</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <Avatar className="size-8">
                                                <AvatarImage src={`/api/users/${user.id}/face`} />
                                                <AvatarFallback>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {user.qrcode ? (
                                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                                                    {user.qrcode.slice(0, 8)}…
                                                </code>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    Not set
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.qrcode && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setQrUser({ name: user.name, qrcode: user.qrcode! })
                                                        }
                                                    >
                                                        QR
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    nativeButton={false}
                                                    render={<Link href={`/dashboard/users/${user.id}`} />}
                                                >
                                                    Modifier
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setDeleteId(user.id)}
                                                >
                                                    Supprimer
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer l'utilisateur</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteId(null)}
                            disabled={deleting}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? "Suppression…" : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QR Code Modal */}
            <Dialog
                open={qrUser !== null}
                onOpenChange={(open) => !open && setQrUser(null)}
            >
                <DialogContent className="sm:max-w-[740px]">
                    <DialogHeader>
                        <DialogTitle>{qrUser?.name}</DialogTitle>
                        <DialogDescription>
                            Scannez ce code QR pour identifier l'utilisateur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        {qrDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={qrDataUrl}
                                alt={`QR code for ${qrUser?.name}`}
                                className="w-full max-w-[700px] rounded-xl"
                            />
                        ) : (
                            <div className="flex h-[150px] w-[150px] items-center justify-center text-sm text-muted-foreground">
                                Generating…
                            </div>
                        )}
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button variant="outline" onClick={() => setQrUser(null)}>
                            Fermer
                        </Button>
                        <Button onClick={handleDownloadQR}>Download PNG</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
