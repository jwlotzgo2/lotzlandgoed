"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Zap, Calendar, Clock, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import Link from "next/link";

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

const urgencyConfig = {
  ok:      { color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200", icon: CheckCircle,    label: "All good" },
  soon:    { color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200", icon: AlertTriangle,  label: "Buy soon" },
  overdue: { color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",   icon: AlertTriangle,  label: "Overdue" },
  unknown: { color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200",  icon: Clock,          label: "No data" },
};

export default function ConsumptionPage() {
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

  // Last 12 months for chart
  const chartData = monthly.slice(-12);
  const maxCount = Math.max(...chartData.map((m) => m.count), 1);

  // Season colours
  const seasonColor: Record<string, string> = {
    Summer: "bg-amber-400", Autumn: "bg-orange-400",
    Winter: "bg-blue-400",  Spring: "bg-green-400",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumption</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {seasonEmoji[currentSeason]} {currentSeason} · {totalTokens} tokens purchased
          </p>
        </div>
        <Link href="/dashboard/history" className="text-sm text-[#1e5631] hover:underline">
          History →
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalTokens}</p>
          <p className="text-xs text-gray-500 mt-1">Total tokens</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-gray-900">R{Math.round(totalSpend / 1000)}k</p>
          <p className="text-xs text-gray-500 mt-1">Total spent</p>
        </div>
        <div className="card py-4 text-center">
          <div className="flex items-center justify-center gap-1">
            {trend === "up" && <TrendingUp className="w-5 h-5 text-red-500" />}
            {trend === "down" && <TrendingDown className="w-5 h-5 text-green-500" />}
            {trend === "neutral" && <Minus className="w-5 h-5 text-gray-400" />}
            <p className={`text-2xl font-bold ${trend === "up" ? "text-red-500" : trend === "down" ? "text-green-500" : "text-gray-400"}`}>
              {trendPct === 0 ? "—" : `${Math.abs(trendPct)}%`}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">vs last quarter</p>
        </div>
      </div>

      {/* Early warning per meter */}
      {byMeter.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Meter Status</h2>
          {byMeter.map((m, i) => {
            const cfg = urgencyConfig[m.urgency];
            const Icon = cfg.icon;
            return (
              <motion.div key={m.meterId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Meter {m.meterNumber}</p>
                      <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {m.predictedNextDays !== null && (
                      <p className={`text-lg font-bold ${cfg.color}`}>
                        {m.predictedNextDays === 0 ? "Today" : `${m.predictedNextDays}d`}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {m.predictedNextDays === null ? "Insufficient data" :
                       m.predictedNextDays === 0 ? "Buy now" : "until next top-up"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-black/5 grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div>
                    <p className="font-medium text-gray-700">{m.totalTokens}</p>
                    <p>tokens total</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">
                      {m.avgDaysBetween ? `${m.avgDaysBetween}d` : "—"}
                    </p>
                    <p>avg interval</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">
                      {m.daysSinceLast !== null ? `${m.daysSinceLast}d ago` : "—"}
                    </p>
                    <p>last purchase</p>
                  </div>
                </div>
                {/* Progress bar showing where we are in the cycle */}
                {m.avgDaysBetween && m.daysSinceLast !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.urgency === "overdue" ? "bg-red-500" :
                          m.urgency === "soon" ? "bg-amber-400" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.round((m.daysSinceLast / m.avgDaysBetween) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Last top-up</span>
                      <span>Next top-up (~{m.avgDaysBetween}d cycle)</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Monthly bar chart — last 12 months */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Monthly Purchases</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {["Summer", "Autumn", "Winter", "Spring"].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${seasonColor[s]}`} />
                <span>{s.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {chartData.map((m, i) => (
            <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1">
              {m.count > 0 && (
                <p className="text-xs text-gray-500 font-medium">{m.count}</p>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: m.count > 0 ? `${Math.round((m.count / maxCount) * 100)}%` : "3px" }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                className={`w-full rounded-t-md ${m.count > 0 ? seasonColor[m.season] : "bg-gray-100"}`}
                style={{ minHeight: "3px" }}
                title={`${m.label}: ${m.count} tokens`}
              />
              <p className="text-xs text-gray-400" style={{ fontSize: "9px" }}>{m.month}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Season comparison */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Seasonal Pattern</h2>
        {(() => {
          const seasonTotals: Record<string, { count: number; months: number }> = {
            Summer: { count: 0, months: 0 },
            Autumn: { count: 0, months: 0 },
            Winter: { count: 0, months: 0 },
            Spring: { count: 0, months: 0 },
          };
          monthly.forEach((m) => {
            if (m.count > 0) {
              seasonTotals[m.season].count += m.count;
              seasonTotals[m.season].months += 1;
            }
          });
          const maxAvg = Math.max(...Object.values(seasonTotals).map((s) => s.months > 0 ? s.count / s.months : 0), 1);

          return (
            <div className="space-y-3">
              {Object.entries(seasonTotals).map(([season, { count, months }]) => {
                const avg = months > 0 ? (count / months).toFixed(1) : "0";
                const pct = months > 0 ? (count / months) / maxAvg * 100 : 0;
                return (
                  <div key={season}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{seasonEmoji[season]} {season}</span>
                      <span className="text-sm font-medium text-gray-900">{avg} tokens/month</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${seasonColor[season]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Buy button */}
      <Link href="/dashboard/buy">
        <div className="card bg-[#1e5631] border-0 flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-white font-semibold">Need to top up?</p>
            <p className="text-white/70 text-sm">Purchase tokens now</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>
      </Link>
    </div>
  );
}
