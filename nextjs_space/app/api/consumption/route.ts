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

    // One event per token quantity
    const events = payments.flatMap((p) => {
      // Use verifiedAt (actual payment date) shifted to SAST
      const rawDate = p.verifiedAt ?? p.createdAt;
      const date = rawDate;  // stored as UTC, consumers shift by SAST_OFFSET when comparing
      return Array.from({ length: p.quantity }, () => ({
        date,
        meterNumber: p.meter.meterNumber,
        meterId: p.meterId,
        userName: p.user?.name ?? "Unknown",
        amount: p.totalAmount / p.quantity,
        isHistorical: (p as any).isHistorical ?? false,
        paymentId: p.id,
      }));
    });

    // Build meters map including userName (from first payment for that meter)
    const metersMap = new Map<string, { id: string; meterNumber: string; userName: string }>();
    payments.forEach((p) => {
      if (!metersMap.has(p.meterId)) {
        metersMap.set(p.meterId, {
          id: p.meterId,
          meterNumber: p.meter.meterNumber,
          userName: p.user?.name ?? "Unknown",
        });
      }
    });
    const meters = Array.from(metersMap.values());

    const SAST_OFFSET = 2 * 60 * 60 * 1000; // UTC+2
    const now = new Date();
    const nowSAST = new Date(now.getTime() + SAST_OFFSET);

    // Monthly aggregation — last 36 months for "all time" filter support
    // All date comparisons in SAST to match what users see in SA
    const monthly = Array.from({ length: 36 }, (_, i) => {
      const d = new Date(Date.UTC(nowSAST.getUTCFullYear(), nowSAST.getUTCMonth() - (35 - i), 1));
      const monthEnd = new Date(Date.UTC(nowSAST.getUTCFullYear(), nowSAST.getUTCMonth() - (35 - i) + 1, 0, 21, 59, 59)); // 23:59 SAST = 21:59 UTC
      const monthEvents = events.filter((e) => {
        const dt = new Date(new Date(e.date!).getTime() + SAST_OFFSET);
        return dt >= d && dt <= monthEnd;
      });
      return {
        month: d.toLocaleString("en-ZA", { month: "short", timeZone: "Africa/Johannesburg" }),
        year: d.getUTCFullYear(),
        label: d.toLocaleString("en-ZA", { month: "short", year: "2-digit", timeZone: "Africa/Johannesburg" }),
        monthKey: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        count: monthEvents.length,
        amount: monthEvents.reduce((s, e) => s + e.amount, 0),
        season: getSeason(d.getUTCMonth()),
      };
    });

    // Per-meter breakdown
    const byMeter = meters.map((m) => {
      const meterEvents = events.filter((e) => e.meterId === m.id);
      const intervals = computeIntervals(meterEvents);
      const lastEvent = meterEvents[meterEvents.length - 1];
      const daysSinceLast = lastEvent
        ? Math.floor((nowSAST.getTime() - (new Date(lastEvent.date!).getTime() + SAST_OFFSET)) / (1000 * 60 * 60 * 24))
        : null;
      const currentSeason = getSeason(nowSAST.getUTCMonth());
      const overallAvg = intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : null;
      const seasonalAvg = computeSeasonalAvg(meterEvents, currentSeason);
      const avgDays = seasonalAvg ?? overallAvg;
      const predictedDays = avgDays && daysSinceLast !== null
        ? Math.max(0, Math.round(avgDays - daysSinceLast))
        : null;

      return {
        meterId: m.id,
        meterNumber: m.meterNumber,
        userName: m.userName,
        totalTokens: meterEvents.length,
        daysSinceLast,
        avgDaysBetween: overallAvg ? Math.round(overallAvg) : null,
        predictedNextDays: predictedDays,
        urgency: getUrgency(predictedDays, avgDays),
        lastPurchase: lastEvent?.date ?? null,
      };
    });

    // Trend: last 3 months vs prior 3
    const last3 = monthly.slice(-3).reduce((s, m) => s + m.count, 0);
    const prior3 = monthly.slice(-6, -3).reduce((s, m) => s + m.count, 0);
    const trend = prior3 === 0 ? "neutral" : last3 > prior3 ? "up" : last3 < prior3 ? "down" : "neutral";
    const trendPct = prior3 > 0 ? Math.round(((last3 - prior3) / prior3) * 100) : 0;
    const currentSeason = getSeason(nowSAST.getUTCMonth());

    return NextResponse.json({
      events: events.slice(-200),
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

function computeSeasonalAvg(events: any[], season: string): number | null {
  const seasonEvents = events.filter((e) => getSeason(new Date(e.date!).getMonth()) === season);
  if (seasonEvents.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < seasonEvents.length; i++) {
    const diff = (new Date(seasonEvents[i].date!).getTime() - new Date(seasonEvents[i - 1].date!).getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < 120) intervals.push(diff);
  }
  return intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
}

function getUrgency(predictedDays: number | null, avgDays: number | null): "ok" | "soon" | "overdue" | "unknown" {
  if (predictedDays === null) return "unknown";
  if (predictedDays <= 0) return "overdue";
  if (avgDays && predictedDays <= avgDays * 0.25) return "soon";
  return "ok";
}
