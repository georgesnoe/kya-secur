"use client";

import { useEffect, useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
    type ColumnFiltersState,
    type FilterFn,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Toaster, toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function api(path: string) {
    return `${API}${path}`;
}

interface ScanLog {
    id: string;
    userId: string;
    type: "qr" | "face";
    match: boolean;
    qrCode: string | null;
    faceResult: string | null;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
    userRole: string | null;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

const columnHelper = createColumnHelper<ScanLog>();

export default function ScansPage() {
    const [data, setData] = useState<ScanLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([
        { id: "createdAt", desc: true },
    ]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [matchFilter, setMatchFilter] = useState<string>("all");

    const fetchScans = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(pagination.page));
            params.set("pageSize", String(pagination.pageSize));
            if (typeFilter !== "all") params.set("type", typeFilter);
            if (matchFilter !== "all") params.set("match", matchFilter);
            if (globalFilter) params.set("name", globalFilter);

            const res = await fetch(api(`/api/scans?${params.toString()}`));
            if (!res.ok) throw new Error("Failed to load scans");
            const result = await res.json();
            setData(result.logs ?? []);
            setPagination(result.pagination);
        } catch {
            toast.error("Erreur lors du chargement des journaux");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScans();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.pageSize, typeFilter, matchFilter, globalFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchScans();
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor("createdAt", {
                header: "Date & Heure",
                cell: (info) => {
                    const date = new Date(info.getValue());
                    return date.toLocaleString();
                },
            }),
            columnHelper.accessor("userName", {
                header: "User",
                cell: (info) => info.getValue() ?? "Inconnu",
            }),
            columnHelper.accessor("userEmail", {
                header: "Email",
                cell: (info) => info.getValue() ?? "—",
            }),
            columnHelper.accessor("type", {
                header: "Type",
                cell: (info) => (
                    <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${info.getValue() === "qr"
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                    >
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor("match", {
                header: "Correspondance",
                cell: (info) => (
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${info.getValue()
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                            }`}
                    >
                        {info.getValue() ? "Oui" : "Non"}
                    </span>
                ),
            }),
            columnHelper.accessor("faceResult", {
                header: "Résultat facial",
                cell: (info) => info.getValue() ?? "—",
            }),
            columnHelper.accessor("qrCode", {
                header: "Code QR",
                cell: (info) =>
                    info.getValue() ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {info.getValue()!.slice(0, 8)}…
                        </code>
                    ) : (
                        "—"
                    ),
            }),
        ],
        [],
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        pageCount: pagination.totalPages,
    });

    return (
        <>
            <Toaster richColors />
            <Card>
                <CardHeader>
                    <CardTitle>Historique des scans</CardTitle>
                    <CardDescription>
                        Consultez tous les tentatives de scan avec filtres et tri.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <Input
                                placeholder="Rechercher par nom…"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="w-56"
                            />
                            <Button type="submit" size="sm">
                                Rechercher
                            </Button>
                        </form>

                        <Select
                            value={typeFilter}
                            onValueChange={(v) => {
                                if (!v) return;
                                setPagination((prev) => ({ ...prev, page: 1 }));
                                setTypeFilter(v);
                            }}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="qr">QR</SelectItem>
                                <SelectItem value="face">Visage</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={matchFilter}
                            onValueChange={(v) => {
                                if (!v) return;
                                setPagination((prev) => ({ ...prev, page: 1 }));
                                setMatchFilter(v);
                            }}
                        >
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les résultats</SelectItem>
                                <SelectItem value="true">Correspondance</SelectItem>
                                <SelectItem value="false">Aucune</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="text-sm text-muted-foreground">
                            {pagination.total} scan{pagination.total !== 1 ? "s" : ""} au total
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                            Chargement des journaux…
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead
                                                    key={header.id}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={
                                                        header.column.getCanSort()
                                                            ? "cursor-pointer select-none"
                                                            : ""
                                                    }
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {{
                                                        asc: " ↑",
                                                        desc: " ↓",
                                                    }[header.column.getIsSorted() as string] ?? ""}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="py-12 text-center text-muted-foreground"
                                            >
                                                Aucun journal de scan trouvé.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Page {pagination.page} sur {pagination.totalPages}
                                </span>
                                <Select
                                    value={String(pagination.pageSize)}
                                    onValueChange={(v) => {
                                        if (!v) return;
                                        setPagination((prev) => ({
                                            ...prev,
                                            page: 1,
                                            pageSize: Number(v),
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPagination((prev) => ({ ...prev, page: 1 }))
                                    }
                                    disabled={pagination.page <= 1}
                                >
                                    Premier
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPagination((prev) => ({
                                            ...prev,
                                            page: prev.page - 1,
                                        }))
                                    }
                                    disabled={pagination.page <= 1}
                                >
                                    Précédent
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPagination((prev) => ({
                                            ...prev,
                                            page: prev.page + 1,
                                        }))
                                    }
                                    disabled={pagination.page >= pagination.totalPages}
                                >
                                    Suivant
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPagination((prev) => ({
                                            ...prev,
                                            page: prev.totalPages,
                                        }))
                                    }
                                    disabled={pagination.page >= pagination.totalPages}
                                >
                                    Dernier
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
