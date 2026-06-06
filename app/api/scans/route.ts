import { NextRequest, NextResponse } from "next/server";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { scanLog, user } from "@/lib/schema";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const match = searchParams.get("match");
        const name = searchParams.get("name");
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

        const conditions = [];

        if (type === "qr" || type === "face") {
            conditions.push(eq(scanLog.type, type));
        }

        if (match === "true") {
            conditions.push(eq(scanLog.match, true));
        } else if (match === "false") {
            conditions.push(eq(scanLog.match, false));
        }

        if (name) {
            conditions.push(like(user.name, `%${name}%`));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const totalResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(scanLog)
            .leftJoin(user, eq(scanLog.userId, user.id))
            .where(where);

        const total = Number(totalResult[0]?.count ?? 0);
        const totalPages = Math.ceil(total / pageSize);

        const logs = await db
            .select({
                id: scanLog.id,
                userId: scanLog.userId,
                type: scanLog.type,
                match: scanLog.match,
                qrCode: scanLog.qrCode,
                faceResult: scanLog.faceResult,
                createdAt: scanLog.createdAt,
                userName: user.name,
                userEmail: user.email,
                userRole: user.role,
            })
            .from(scanLog)
            .leftJoin(user, eq(scanLog.userId, user.id))
            .where(where)
            .orderBy(desc(scanLog.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        return NextResponse.json({
            logs,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error("List scans error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
