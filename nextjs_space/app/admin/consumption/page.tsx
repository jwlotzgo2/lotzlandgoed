"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Zap, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface MonthData {
  label: string;
  month: string;
  year: number;
  monthKey: string;
  count: number;
  amount: number;
  season: string;
}

interface MeterData {
  meterId: string;
  meterNumber: string;
  totalTokens: number;
  daysSinceLast: number | null;
  avgDaysBetween: number | null;
  predictedNextDays: number | null;
  urgency: "ok" | "soon" | "overdue" | "unknown";
  lastPurchase: string | null;
}

interface ConsumptionData {
  monthly: MonthData[];
  byMeter: MeterData[];
  trend: "up" | "down" | "neutral";
  trendPct: number;
  currentSeason: string;
  totalTokens: number;
  totalSpend: number;
}

const seasonEmoji: Record<string, string> = {
  Summer: "☀️", Autumn: "🍂", Winter: "❄️", Spring: "🌸",
};
const seasonColor: Record<string, string> = {
  Summer: "bg-amber-400", Autumn: "bg-orange-400",
  Winter: "bg-blue-400",  Spring: "bg-green-400",
};
const urgencyConfig = {
  ok:      { color: "text-green-600", bg: "bg-green-50",  icon: CheckCircle,   label: "On track" },
  soon:    { color: "text-amber-600", bg: "bg-amber-50",  icon: AlertTriangle, label: "Buy soon" },
  overdue: { color: "text-red-600",   bg: "bg-red-50",    icon: AlertTriangle, label: "Overdue" },
  unknown: { color: "text-gray-500",  bg: "bg-gray-50",   icon: Clock,         label: "No data" },
};

export default function AdminConsumptionPage() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consumption")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading consumption data..." />;
  if (!data) return <div className="card text-center py-12 text-gray-500">No data available</div>;

  const { monthly, byMeter, trend, trendPct, currentSeason, totalTokens, totalSpend } = data;
  const chartData = monthly.slice(-18);
  const maxCount = Math.max(...chartData.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumption Overview</h1>
          <p className="text-gray-500 text-sm">{seasonEmoji[currentSeason]} {currentSeason} · {totalTokens} total tokens issued</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total tokens", value: totalTokens, color: "text-gray-900" },
          { label: "Total revenue", value: `R${Math.round(totalSpend / 1000)}k`, color: "text-[#1e5631]" },
          { label: "Active meters", value: byMeter.filter(m => m.totalTokens > 0).length, color: "text-gray-900" },
          { label: "Trend vs last Qtr",
            value: trendPct === 0 ? "Stable" : `${Math.abs(trendPct)}% ${trend === "up" ? "▲" : "▼"}`,
            color: trend === "up" ? "text-red-500" : trend === "down" ? "text-green-600" : "text-gray-500" },
        ].map((s) => (
          <div key={s.label} className="card py-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Meter warning cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Meter Early Warning</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {byMeter.map((m, i) => {
            const cfg = urgencyConfig[m.urgency];
            const Icon = cfg.icon;
            return (
              <motion.div key={m.meterId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-4 ${cfg.bg} border-opacity-50`}
                style={{ borderColor: m.urgency === "overdue" ? "#fca5a5" : m.urgency === "soon" ? "#fcd34d" : m.urgency === "ok" ? "#86efac" : "#e5e7eb" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <p className="font-semibold text-gray-900 text-sm">Meter {m.meterNumber}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-bold text-gray-900">{m.totalTokens}</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      {m.avgDaysBetween ? `${m.avgDaysBetween}d` : "—"}
                    </p>
                    <p className="text-xs text-gray-500">avg cycle</p>
                  </div>
                  <div>
                    <p className={`text-base font-bold ${cfg.color}`}>
                      {m.predictedNextDays === null ? "—" :
                       m.predictedNextDays === 0 ? "Now" : `${m.predictedNextDays}d`}
                    </p>
                    <p className="text-xs text-gray-500">next top-up</p>
                  </div>
                </div>
                {m.avgDaysBetween && m.daysSinceLast !== null && (
                  <div className="mt-3">
                    <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.urgency === "overdue" ? "bg-red-400" : m.urgency === "soon" ? "bg-amber-400" : "bg-green-400"}`}
                        style={{ width: `${Math.min(100, Math.round((m.daysSinceLast / m.avgDaysBetween) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bar chart — 18 months */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Monthly Purchases — All Meters</h2>
          <div className="flex gap-3 text-xs text-gray-400">
            {["Summer", "Autumn", "Winter", "Spring"].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${seasonColor[s]}`} />
                <span className="hidden sm:inline">{s.slice(0,3)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-1 h-36">
          {chartData.map((m, i) => (
            <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1">
              {m.count > 0 && <p className="text-xs text-gray-500" style={{ fontSize: "9px" }}>{m.count}</p>}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: m.count > 0 ? `${Math.round((m.count / maxCount) * 100)}%` : "2px" }}
                transition={{ delay: i * 0.02, duration: 0.35 }}
                className={`w-full rounded-t-sm ${m.count > 0 ? seasonColor[m.season] : "bg-gray-100"}`}
                style={{ minHeight: "2px" }}
              />
              <p className="text-gray-400" style={{ fontSize: "8px" }}>{m.month}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal breakdown */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Seasonal Breakdown</h2>
        {(() => {
          const seasonTotals: Record<string, { count: number; months: number; revenue: number }> = {
            Summer: { count: 0, months: 0, revenue: 0 },
            Autumn: { count: 0, months: 0, revenue: 0 },
            Winter: { count: 0, months: 0, revenue: 0 },
            Spring: { count: 0, months: 0, revenue: 0 },
          };
          monthly.forEach((m) => {
            if (m.count > 0) {
              seasonTotals[m.season].count += m.count;
              seasonTotals[m.season].months++;
              seasonTotals[m.season].revenue += m.amount;
            }
          });
          const maxAvg = Math.max(...Object.values(seasonTotals).map((s) => s.months > 0 ? s.count / s.months : 0), 1);

          return (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(seasonTotals).map(([season, { count, months, revenue }]) => {
                const avg = months > 0 ? (count / months).toFixed(1) : "0";
                const pct = months > 0 ? (count / months) / maxAvg * 100 : 0;
                const isCurrent = season === currentSeason;
                return (
                  <div key={season} className={`rounded-xl p-3 ${isCurrent ? "ring-2 ring-[#1e5631]/30 bg-[#1e5631]/5" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{seasonEmoji[season]} {season}</span>
                      {isCurrent && <span className="text-xs text-[#1e5631] font-medium">Now</span>}
                    </div>
                    <p className="text-xl font-bold text-gray-900">{avg}</p>
                    <p className="text-xs text-gray-500 mb-2">tokens/month avg</p>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${seasonColor[season]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">R{Math.round(revenue / 1000)}k total · {count} tokens</p>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
