import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-svh">
            {/* Sidebar */}
            <aside className="flex w-64 flex-col border-r bg-sidebar p-4 max-sm:hidden">
                <Link
                    href="/dashboard/users"
                    className="mb-6 text-lg font-semibold tracking-tight"
                >
                    Kya Secur
                </Link>
                <nav className="flex flex-col gap-1">
                    <Link
                        href="/dashboard/users"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        Users
                    </Link>
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex flex-1 flex-col">
                {/* Top bar */}
                <header className="flex h-14 items-center gap-4 border-b px-6 lg:h-16">
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Back to site
                    </Link>
                    <div className="ml-auto text-sm text-muted-foreground">
                        Admin Dashboard
                    </div>
                </header>
                <div className="flex-1 p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
