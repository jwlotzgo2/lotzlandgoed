"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Zap, Calendar } from "lucide-react";
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

interface ConsumptionData {
  monthly: MonthData[];
  trend: "up" | "down" | "neutral";
  trendPct: number;
  currentSeason: string;
  totalTokens: number;
  totalSpend: number;
}

type FilterKey = "this-year" | "last-year" | "last-6";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "this-year",  label: "This year" },
  { key: "last-6",     label: "Last 6 months" },
  { key: "last-year",  label: "Last year" },
];

const seasonEmoji: Record<string, string> = {
  Summer: "☀️", Autumn: "🍂", Winter: "❄️", Spring: "🌸",
};
const seasonBarColor: Record<string, string> = {
  Summer: "#f59e0b", Autumn: "#f97316", Winter: "#60a5fa", Spring: "#4ade80",
};

const CHART_HEIGHT = 120; // px

export default function ConsumptionPage() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("this-year");

  useEffect(() => {
    fetch("/api/consumption")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const currentYear = now.getFullYear();

    return data.monthly.filter(m => {
      const [year, month] = m.monthKey.split("-").map(Number);
      const mDate = new Date(year, month - 1, 1);

      if (filter === "this-year") return year === currentYear;
      if (filter === "last-year") return year === currentYear - 1;
      if (filter === "last-6") {
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return mDate >= cutoff;
      }
      return true;
    });
  }, [data, filter]);

  if (loading) return <Loading text="Loading consumption data..." />;
  if (!data) return <div className="card text-center py-12 text-gray-500">No data available</div>;

  const { trend, trendPct, currentSeason, totalTokens, totalSpend } = data;

  // Chart calculations — fixed pixel heights
  const maxCount = Math.max(...filtered.map(m => m.count), 1);
  const filteredTotal = filtered.reduce((s, m) => s + m.count, 0);
  const filteredSpend = filtered.reduce((s, m) => s + m.amount, 0);

  // Season totals for the filtered period
  const seasonTotals: Record<string, { count: number; months: number }> = {
    Summer: { count: 0, months: 0 },
    Autumn: { count: 0, months: 0 },
    Winter: { count: 0, months: 0 },
    Spring: { count: 0, months: 0 },
  };
  filtered.forEach(m => {
    seasonTotals[m.season].count += m.count;
    if (m.count > 0) seasonTotals[m.season].months++;
  });
  const maxSeasonAvg = Math.max(
    ...Object.values(seasonTotals).map(s => s.months > 0 ? s.count / s.months : 0), 1
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumption</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {seasonEmoji[currentSeason]} {currentSeason} · {totalTokens} tokens all time
          </p>
        </div>
        <Link href="/dashboard/history" className="text-sm text-[#1e5631] hover:underline">
          History →
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-[#1e5631] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary stats for filtered period */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 text-center">
          <p className="text-xl font-bold text-gray-900">{filteredTotal}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tokens</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-xl font-bold text-[#1e5631]">R{(filteredSpend / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-500 mt-0.5">Spent</p>
        </div>
        <div className="card py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {trend === "up"      && <TrendingUp className="w-4 h-4 text-red-500" />}
            {trend === "down"    && <TrendingDown className="w-4 h-4 text-green-500" />}
            {trend === "neutral" && <Minus className="w-4 h-4 text-gray-400" />}
            <p className={`text-xl font-bold ${
              trend === "up" ? "text-red-500" : trend === "down" ? "text-green-500" : "text-gray-400"
            }`}>
              {trendPct === 0 ? "—" : `${Math.abs(trendPct)}%`}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">vs prev qtr</p>
        </div>
      </div>

      {/* Bar chart — fixed pixel heights */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Monthly Purchases</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {Object.entries(seasonBarColor).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="hidden sm:inline">{s.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>

        {filteredTotal === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No purchases in this period
          </div>
        ) : (
          <div className="flex items-end gap-1" style={{ height: `${CHART_HEIGHT + 32}px` }}>
            {filtered.map((m, i) => {
              const barH = m.count > 0 ? Math.max(4, Math.round((m.count / maxCount) * CHART_HEIGHT)) : 4;
              const isEmpty = m.count === 0;
              return (
                <div key={m.monthKey} className="flex-1 flex flex-col items-center justify-end gap-1"
                  style={{ height: `${CHART_HEIGHT + 24}px` }}>
                  {/* count label */}
                  <span className="text-xs text-gray-500 font-medium" style={{ minHeight: "16px" }}>
                    {m.count > 0 ? m.count : ""}
                  </span>
                  {/* bar */}
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${barH}px`,
                      background: isEmpty ? "#f3f4f6" : seasonBarColor[m.season],
                      opacity: isEmpty ? 0.4 : 1,
                    }}
                    title={`${m.label}: ${m.count} token${m.count !== 1 ? "s" : ""}`}
                  />
                  {/* month label */}
                  <span className="text-gray-400 leading-tight" style={{ fontSize: "9px", minHeight: "12px" }}>
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seasonal pattern — for filtered period */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Seasonal Pattern</h2>
        <div className="space-y-3">
          {Object.entries(seasonTotals).map(([season, { count, months }]) => {
            const avg = months > 0 ? count / months : 0;
            const pct = maxSeasonAvg > 0 ? (avg / maxSeasonAvg) * 100 : 0;
            const isCurrent = season === currentSeason;
            return (
              <div key={season}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${isCurrent ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                    {seasonEmoji[season]} {season}
                    {isCurrent && <span className="ml-1.5 text-xs text-[#1e5631] font-medium">current</span>}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {avg > 0 ? avg.toFixed(1) : "—"} <span className="text-xs text-gray-400">tokens/month</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: seasonBarColor[season] }} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{count} tokens over {months} month{months !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buy CTA */}
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
