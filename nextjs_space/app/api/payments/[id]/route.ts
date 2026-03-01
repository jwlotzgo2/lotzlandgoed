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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, phone: true } },
        meter: { select: { meterNumber: true } },
        tokens: { select: { id: true, tokenValue: true, status: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (userRole !== "ADMIN" && payment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build proof URL - use proofUrl if available, otherwise construct from cloudStoragePath
    let proofSignedUrl: string | null = payment.proofUrl ?? null;
    if (!proofSignedUrl && payment.cloudStoragePath) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dousyjcui";
      proofSignedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${payment.cloudStoragePath}`;
    }

    return NextResponse.json({ ...payment, proofSignedUrl });
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
