import { notifyAdmins } from "@/lib/notifications";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { TOKEN_PRICE } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};

    if (userRole !== "ADMIN") {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        meter: { select: { meterNumber: true } },
        tokens: { select: { id: true, tokenValue: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const {
      meterId,
      quantity,
      proofUrl,
      cloudStoragePath,
      isPublic,
      referenceNumber,
      paymentDate,
    } = await request.json();

    if (!meterId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Meter and quantity are required" },
        { status: 400 }
      );
    }

    // Verify user owns this meter
    const meter = await prisma.meter.findFirst({
      where: { id: meterId, userId },
    });

    if (!meter) {
      return NextResponse.json(
        { error: "Meter not found or not assigned to you" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        meterId,
        quantity,
        totalAmount: quantity * TOKEN_PRICE,
        proofUrl,
        cloudStoragePath,
        referenceNumber,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        status: "PENDING",
      },
    });

    // Notify admins of new payment
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
    const meter = await prisma.meter.findUnique({ where: { id: meterId }, select: { meterNumber: true } });
    await notifyAdmins({
      title: "New Payment Submitted",
      message: `${user?.name} (${user?.phone}) submitted payment for ${quantity} token(s) on meter ${meter?.meterNumber}. Amount: R${(quantity * TOKEN_PRICE).toLocaleString()}`,
      type: "INFO",
      link: "/admin/payments",
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
