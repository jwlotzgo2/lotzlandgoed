export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tokenSheetId = searchParams.get("tokenSheetId");

    const tokens = await prisma.token.findMany({
      where: tokenSheetId ? { tokenSheetId } : {},
      include: {
        meter: {
          select: { meterNumber: true },
        },
        payment: {
          select: {
            id: true,
            referenceNumber: true,
            user: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Get tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}