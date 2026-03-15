"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface MonthData {
  label: string; month: string; year: number;
  monthKey: string; count: number; amount: number; season: string;
}
interface MeterData {
  meterId: string; meterNumber: string; userName: string;
  totalTokens: number; daysSinceLast: number | null;
  avgDaysBetween: number | null; predictedNextDays: number | null;
  urgency: "ok" | "soon" | "overdue" | "unknown";
}
interface ConsumptionData {
  monthly: MonthData[]; byMeter: MeterData[];
  events: any[];
  trend: "up" | "down" | "neutral"; trendPct: number;
  currentSeason: string; totalTokens: number; totalSpend: number;
}

type FilterKey = "this-year" | "last-6" | "last-year" | "all";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "this-year", label: "This year" },
  { key: "last-6",    label: "Last 6 months" },
  { key: "last-year", label: "Last year" },
  { key: "all",       label: "All time" },
];

const seasonEmoji: Record<string, string> = { Summer: "☀️", Autumn: "🍂", Winter: "❄️", Spring: "🌸" };
const seasonBarColor: Record<string, string> = { Summer: "#f59e0b", Autumn: "#f97316", Winter: "#60a5fa", Spring: "#4ade80" };
const CHART_H = 120;

const urgencyConfig = {
  ok:      { color: "text-green-600",  bg: "bg-green-50",  border: "#86efac", icon: CheckCircle,   label: "On track" },
  soon:    { color: "text-amber-600",  bg: "bg-amber-50",  border: "#fcd34d", icon: AlertTriangle, label: "Buy soon" },
  overdue: { color: "text-red-600",    bg: "bg-red-50",    border: "#fca5a5", icon: AlertTriangle, label: "Overdue" },
  unknown: { color: "text-gray-400",   bg: "bg-gray-50",   border: "#e5e7eb", icon: Clock,         label: "No data" },
};

export default function AdminConsumptionPage() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("this-year");
  const [selectedMeter, setSelectedMeter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/consumption").then(r => r.json()).then(d => setData(d)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const now = new Date(); const cy = now.getFullYear();
    // If a specific meter is selected, rebuild monthly from events
    // Otherwise use aggregate monthly
    return data.monthly.filter(m => {
      const [y, mo] = m.monthKey.split("-").map(Number);
      const mDate = new Date(y, mo - 1, 1);
      if (filter === "this-year")  return y === cy;
      if (filter === "last-year")  return y === cy - 1;
      if (filter === "last-6") { const c = new Date(now.getFullYear(), now.getMonth() - 5, 1); return mDate >= c; }
      return true;
    });
  }, [data, filter]);

  // Per-meter monthly data (derived from events)
  const filteredByMeter = useMemo(() => {
    if (!data?.events || selectedMeter === "all") return filtered;
    const now = new Date(); const cy = now.getFullYear();
    const meterEvents = data.events.filter((e: any) => e.meterId === selectedMeter);
    // Rebuild monthly counts from events
    return filtered.map(m => {
      const count = meterEvents.filter((e: any) => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        return key === m.monthKey;
      }).length;
      return { ...m, count, amount: count * 1600 };
    });
  }, [filtered, selectedMeter, data]);

  if (loading) return <Loading text="Loading consumption data..." />;
  if (!data)   return <div className="card text-center py-12 text-gray-500">No data available</div>;

  const { byMeter, trend, trendPct, currentSeason, totalTokens, totalSpend } = data;
  const chartData = filteredByMeter;
  const maxCount = Math.max(...chartData.map(m => m.count), 1);
  const filteredTotal  = chartData.reduce((s, m) => s + m.count, 0);
  const filteredSpend  = chartData.reduce((s, m) => s + m.amount, 0);

  const seasonTotals: Record<string, { count: number; months: number }> = {
    Summer: { count: 0, months: 0 }, Autumn: { count: 0, months: 0 },
    Winter: { count: 0, months: 0 }, Spring: { count: 0, months: 0 },
  };
  chartData.forEach(m => { seasonTotals[m.season].count += m.count; if (m.count > 0) seasonTotals[m.season].months++; });
  const maxSeasonAvg = Math.max(...Object.values(seasonTotals).map(s => s.months > 0 ? s.count / s.months : 0), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumption Overview</h1>
          <p className="text-gray-500 text-sm">{seasonEmoji[currentSeason]} {currentSeason} · {totalTokens} tokens all time</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === f.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tokens",       value: filteredTotal,                       color: "text-gray-900" },
          { label: "Revenue",      value: `R${(filteredSpend/1000).toFixed(1)}k`, color: "text-[#1e5631]" },
          { label: "Active meters", value: byMeter.filter(m => m.totalTokens > 0).length, color: "text-gray-900" },
          { label: "Trend",
            value: trendPct === 0 ? "Stable" : `${Math.abs(trendPct)}% ${trend === "up" ? "▲" : "▼"}`,
            color: trend === "up" ? "text-red-500" : trend === "down" ? "text-green-600" : "text-gray-500" },
        ].map(s => (
          <div key={s.label} className="card py-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Meter warning cards with owner name */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Meter Early Warning</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {byMeter.map((m, i) => {
            const cfg = urgencyConfig[m.urgency];
            const Icon = cfg.icon;
            return (
              <div key={m.meterId} className={`rounded-xl border p-4 ${cfg.bg}`} style={{ borderColor: cfg.border }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Meter {m.meterNumber}</p>
                      <p className="text-xs text-gray-500">{m.userName}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                  <div><p className="text-sm font-bold text-gray-900">{m.totalTokens}</p><p className="text-gray-500">total</p></div>
                  <div><p className="text-sm font-bold text-gray-900">{m.avgDaysBetween ? `${m.avgDaysBetween}d` : "—"}</p><p className="text-gray-500">avg cycle</p></div>
                  <div>
                    <p className={`text-sm font-bold ${cfg.color}`}>
                      {m.predictedNextDays === null ? "—" : m.predictedNextDays === 0 ? "Now" : `${m.predictedNextDays}d`}
                    </p>
                    <p className="text-gray-500">next top-up</p>
                  </div>
                </div>
                {m.avgDaysBetween && m.daysSinceLast !== null && (
                  <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.urgency === "overdue" ? "bg-red-400" : m.urgency === "soon" ? "bg-amber-400" : "bg-green-400"}`}
                      style={{ width: `${Math.min(100, Math.round((m.daysSinceLast / m.avgDaysBetween) * 100))}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Meter filter pills */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Filter by meter</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedMeter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedMeter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            All meters
          </button>
          {byMeter.map(m => (
            <button key={m.meterId} onClick={() => setSelectedMeter(m.meterId)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedMeter === m.meterId ? "bg-[#1e5631] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {m.userName} <span className="opacity-60 text-xs ml-1">{m.meterNumber.slice(-4)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            {selectedMeter === "all" ? "Monthly Purchases — All Meters" : `Monthly Purchases — ${byMeter.find(m => m.meterId === selectedMeter)?.userName ?? ""}`}
          </h2>
          <div className="flex gap-2 flex-wrap justify-end">
            {Object.entries(seasonBarColor).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="text-xs text-gray-400 hidden sm:inline">{s.slice(0,3)}</span>
              </div>
            ))}
          </div>
        </div>
        {filteredTotal === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No purchases in this period</div>
        ) : (
          <div className="flex items-end gap-1" style={{ height: `${CHART_H + 36}px` }}>
            {chartData.map(m => {
              const barH = m.count > 0 ? Math.max(6, Math.round((m.count / maxCount) * CHART_H)) : 4;
              return (
                <div key={m.monthKey} className="flex-1 flex flex-col items-center justify-end"
                  style={{ height: `${CHART_H + 36}px`, gap: "2px" }}>
                  <span className="text-gray-500 font-medium" style={{ fontSize: "10px", minHeight: "14px", lineHeight: "14px" }}>
                    {m.count > 0 ? m.count : ""}
                  </span>
                  <div className="w-full rounded-t-md"
                    style={{ height: `${barH}px`, background: m.count > 0 ? seasonBarColor[m.season] : "#f3f4f6", opacity: m.count === 0 ? 0.4 : 1 }}
                    title={`${m.label}: ${m.count} tokens`} />
                  <span className="text-gray-400" style={{ fontSize: "9px", minHeight: "12px", lineHeight: "12px" }}>{m.month}</span>
                  {filter === "all" && <span className="text-gray-300" style={{ fontSize: "8px", lineHeight: "10px" }}>{String(m.year).slice(2)}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seasonal breakdown */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Seasonal Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(seasonTotals).map(([season, { count, months }]) => {
            const avg = months > 0 ? count / months : 0;
            const pct = maxSeasonAvg > 0 ? (avg / maxSeasonAvg) * 100 : 0;
            const isCurrent = season === currentSeason;
            return (
              <div key={season} className={`rounded-xl p-3 ${isCurrent ? "ring-2 ring-[#1e5631]/30 bg-[#1e5631]/5" : "bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{seasonEmoji[season]} {season}</span>
                  {isCurrent && <span className="text-xs text-[#1e5631] font-medium">Now</span>}
                </div>
                <p className="text-xl font-bold text-gray-900">{avg > 0 ? avg.toFixed(1) : "—"}</p>
                <p className="text-xs text-gray-500 mb-2">tokens/month avg</p>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: seasonBarColor[season] }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">R{Math.round((count * (totalSpend / (totalTokens || 1))) / 1000)}k · {count} tokens</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
