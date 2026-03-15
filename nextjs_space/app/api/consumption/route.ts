export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;
    const { searchParams } = new URL(request.url);
    const meterId = searchParams.get("meterId");

    // Fetch all approved payments — one payment = one token purchase
    const payments = await prisma.payment.findMany({
      where: {
        ...(userRole !== "ADMIN" ? { userId } : {}),
        ...(meterId ? { meterId } : {}),
        status: "APPROVED",
      },
      include: {
        meter: { select: { meterNumber: true, id: true } },
        user: { select: { name: true } },
      },
      orderBy: { verifiedAt: "asc" },
    });

    // One event per token quantity (expand quantity > 1)
    const events = payments.flatMap((p) => {
      const date = p.verifiedAt ?? p.createdAt;
      return Array.from({ length: p.quantity }, (_, i) => ({
        date,
        meterNumber: p.meter.meterNumber,
        meterId: p.meterId,
        userName: p.user?.name ?? "Unknown",
        amount: p.totalAmount / p.quantity,
        isHistorical: (p as any).isHistorical ?? false,
        paymentId: p.id,
      }));
    });

    // Get unique meters for admin
    const meters = Array.from(
      new Map(payments.map((p) => [p.meterId, p.meter.meterNumber])).entries()
    ).map(([id, meterNumber]) => ({ id, meterNumber }));

    const now = new Date();

    // Monthly aggregation — last 24 months
    const monthly = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (23 - i), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthEvents = events.filter((e) => {
        const dt = new Date(e.date!);
        return dt >= d && dt <= monthEnd;
      });
      return {
        month: d.toLocaleString("en-ZA", { month: "short" }),
        year: d.getFullYear(),
        label: d.toLocaleString("en-ZA", { month: "short", year: "2-digit" }),
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        count: monthEvents.length,
        amount: monthEvents.reduce((s, e) => s + e.amount, 0),
        season: getSeason(d.getMonth()),
      };
    });

    // Seasonal averages — tokens per month by season
    const seasonalMonthlyAvg = computeSeasonalMonthlyAvg(monthly);

    // Per-meter breakdown for admin
    const byMeter = meters.map((m) => {
      const meterEvents = events.filter((e) => e.meterId === m.id);
      const intervals = computeIntervals(meterEvents);
      const lastEvent = meterEvents[meterEvents.length - 1];
      const daysSinceLast = lastEvent
        ? Math.floor((now.getTime() - new Date(lastEvent.date!).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const currentSeason = getSeason(now.getMonth());
      const seasonAvg = seasonalMonthlyAvg[m.id]?.[currentSeason] ?? null;
      const overallAvg = intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : null;
      const avgDays = seasonAvg ?? overallAvg;
      const predictedDays = avgDays && daysSinceLast !== null
        ? Math.max(0, Math.round(avgDays - daysSinceLast))
        : null;

      return {
        meterId: m.id,
        meterNumber: m.meterNumber,
        totalTokens: meterEvents.length,
        daysSinceLast,
        avgDaysBetween: overallAvg ? Math.round(overallAvg) : null,
        predictedNextDays: predictedDays,
        urgency: getUrgency(predictedDays, avgDays),
        lastPurchase: lastEvent?.date ?? null,
      };
    });

    // Overall trend (last 3 vs prior 3 months)
    const last3 = monthly.slice(-3).reduce((s, m) => s + m.count, 0);
    const prior3 = monthly.slice(-6, -3).reduce((s, m) => s + m.count, 0);
    const trend = prior3 === 0 ? "neutral" : last3 > prior3 ? "up" : last3 < prior3 ? "down" : "neutral";
    const trendPct = prior3 > 0 ? Math.round(((last3 - prior3) / prior3) * 100) : 0;

    // Current season info
    const currentSeason = getSeason(now.getMonth());

    return NextResponse.json({
      events: events.slice(-100), // last 100 for timeline
      monthly,
      byMeter,
      meters,
      trend,
      trendPct,
      currentSeason,
      totalTokens: events.length,
      totalSpend: events.reduce((s, e) => s + e.amount, 0),
    });
  } catch (error) {
    console.error("Consumption API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getSeason(month: number): string {
  if (month >= 11 || month <= 1) return "Summer";
  if (month >= 2 && month <= 4) return "Autumn";
  if (month >= 5 && month <= 7) return "Winter";
  return "Spring";
}

function computeIntervals(events: any[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    const diff = (new Date(events[i].date!).getTime() - new Date(events[i - 1].date!).getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < 120) intervals.push(diff);
  }
  return intervals;
}

function computeSeasonalMonthlyAvg(monthly: any[]): Record<string, Record<string, number | null>> {
  // Returns avg days between purchases per season per meter (simplified: use overall monthly count)
  const seasons = ["Summer", "Autumn", "Winter", "Spring"];
  const result: Record<string, Record<string, number | null>> = { all: {} };
  seasons.forEach((season) => {
    const seasonMonths = monthly.filter((m) => m.season === season && m.count > 0);
    result.all[season] = seasonMonths.length > 0
      ? Math.round(30 / (seasonMonths.reduce((s, m) => s + m.count, 0) / seasonMonths.length))
      : null;
  });
  return result;
}

function getUrgency(predictedDays: number | null, avgDays: number | null): "ok" | "soon" | "overdue" | "unknown" {
  if (predictedDays === null) return "unknown";
  if (predictedDays <= 0) return "overdue";
  if (avgDays && predictedDays <= avgDays * 0.25) return "soon";
  return "ok";
}
