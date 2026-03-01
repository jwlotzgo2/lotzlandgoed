export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tokenSheets = await prisma.tokenSheet.findMany({
      include: {
        _count: {
          select: { tokens: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tokenSheets);
  } catch (error) {
    console.error("Get token sheets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, fileUrl, cloudStoragePath, isPublic, uploadType, tokens, meterId } =
      await request.json();

    if (!name || !uploadType) {
      return NextResponse.json(
        { error: "Name and upload type are required" },
        { status: 400 }
      );
    }

    const tokenSheet = await prisma.tokenSheet.create({
      data: {
        name,
        fileUrl,
        cloudStoragePath,
        isPublic: isPublic || false,
        uploadType,
       
      },
    });

    // If tokens provided (from CSV parsing), create them
    if (tokens && Array.isArray(tokens) && tokens.length > 0) {
      await prisma.token.createMany({
        data: tokens.map((tokenValue: string) => ({
          tokenValue: tokenValue.trim(),
          tokenSheetId: tokenSheet.id,
          meterId: meterId || null,
          status: "AVAILABLE",
        })),
      });
    }

    return NextResponse.json(tokenSheet);
  } catch (error) {
    console.error("Create token sheet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
