export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl } from "@/lib/s3";

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

    // Regular users can only see their own payments
    if (userRole !== "ADMIN" && payment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get signed URL for proof if exists
    let proofSignedUrl = null;
    if (payment.cloudStoragePath) {
      proofSignedUrl = await getFileUrl(payment.cloudStoragePath, payment.isPublic);
    }

    return NextResponse.json({ ...payment, proofSignedUrl });
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
