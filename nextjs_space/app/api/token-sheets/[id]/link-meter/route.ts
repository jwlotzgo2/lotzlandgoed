export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { meterId } = await request.json();

    if (!meterId) {
      return NextResponse.json(
        { error: "Meter ID is required" },
        { status: 400 }
      );
    }

    // Link all available tokens from this sheet to the specified meter
    await prisma.token.updateMany({
      where: {
        tokenSheetId: params.id,
        status: "AVAILABLE",
      },
      data: { meterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Link meter error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
