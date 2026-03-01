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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const paymentWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      paymentWhere.createdAt = dateFilter;
    }

    // Total approved payments
    const approvedPayments = await prisma.payment.aggregate({
      where: { ...paymentWhere, status: "APPROVED" },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Pending payments
    const pendingPayments = await prisma.payment.count({
      where: { ...paymentWhere, status: "PENDING" },
    });

    // Total tokens
    const totalTokens = await prisma.token.count();
    const usedTokens = await prisma.token.count({ where: { status: "USED" } });
    const availableTokens = await prisma.token.count({ where: { status: "AVAILABLE" } });

    // Tokens per meter
    const tokensByMeter = await prisma.meter.findMany({
      select: {
        id: true,
        meterNumber: true,
        user: { select: { name: true } },
        _count: {
          select: { tokens: true },
        },
        tokens: {
          where: { status: "AVAILABLE" },
          select: { id: true },
        },
      },
    });

    const meterStats = tokensByMeter.map((m) => ({
      meterId: m.id,
      meterNumber: m.meterNumber,
      userName: m.user?.name ?? "Unassigned",
      totalTokens: m._count.tokens,
      availableTokens: m.tokens.length,
    }));

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: "APPROVED",
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const monthlyRevenue: { [key: string]: number } = {};
    monthlyPayments.forEach((p) => {
      const month = p.createdAt.toISOString().substring(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.totalAmount;
    });

    // User count
    const totalUsers = await prisma.user.count({ where: { role: "USER" } });
    const activeUsers = await prisma.user.count({ where: { role: "USER", isActive: true } });

    return NextResponse.json({
      revenue: {
        total: approvedPayments._sum.totalAmount || 0,
        approvedPayments: approvedPayments._count,
        pendingPayments,
      },
      tokens: {
        total: totalTokens,
        used: usedTokens,
        available: availableTokens,
      },
      meterStats,
      monthlyRevenue,
      users: {
        total: totalUsers,
        active: activeUsers,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
