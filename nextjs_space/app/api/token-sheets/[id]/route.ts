export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tokenSheet = await prisma.tokenSheet.findUnique({
      where: { id: params.id },
      include: {
        tokens: {
          include: {
            meter: { select: { meterNumber: true } },
          },
        },
      },
    });

    if (!tokenSheet) {
      return NextResponse.json({ error: "Token sheet not found" }, { status: 404 });
    }

    return NextResponse.json(tokenSheet);
  } catch (error) {
    console.error("Get token sheet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if any tokens from this sheet have been used
    const usedTokens = await prisma.token.count({
      where: {
        tokenSheetId: params.id,
        status: { not: "AVAILABLE" },
      },
    });

    if (usedTokens > 0) {
      return NextResponse.json(
        { error: "Cannot delete sheet with used tokens" },
        { status: 400 }
      );
    }

    // Delete tokens first, then the sheet
    await prisma.token.deleteMany({ where: { tokenSheetId: params.id } });
    await prisma.tokenSheet.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete token sheet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
