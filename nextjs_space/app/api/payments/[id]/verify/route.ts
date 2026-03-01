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

    const { action, rejectionReason } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { meter: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: "Payment already processed" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      await prisma.payment.update({
        where: { id: params.id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || "Payment verification failed",
          verifiedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // Approve: Find available tokens for this meter and assign them
    const availableTokens = await prisma.token.findMany({
      where: {
        meterId: payment.meterId,
        status: "AVAILABLE",
      },
      take: payment.quantity,
      orderBy: { createdAt: "asc" },
    });

    if (availableTokens.length < payment.quantity) {
      return NextResponse.json(
        {
          error: `Only ${availableTokens.length} tokens available for this meter. Need ${payment.quantity}.`,
        },
        { status: 400 }
      );
    }

    // Update tokens to USED status and link to payment
    await prisma.token.updateMany({
      where: { id: { in: availableTokens.map((t) => t.id) } },
      data: {
        status: "USED",
        paymentId: payment.id,
        revealedAt: new Date(),
      },
    });

    // Update payment status
    await prisma.payment.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        verifiedAt: new Date(),
      },
    });

    // Fetch updated payment with tokens
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        tokens: { select: { id: true, tokenValue: true, status: true } },
      },
    });

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      tokens: updatedPayment?.tokens ?? [],
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
