"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Zap, CreditCard, TrendingUp, AlertCircle, Gauge, CheckCircle, Clock, AlertTriangle, Activity } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loading } from "@/components/ui/loading";

interface MeterStat {
  meterId: string; meterNumber: string; address: string | null;
  userName: string; userPhone: string; totalTokens: number;
  availableTokens: number; usedTokens: number;
}
interface Stats {
  revenue: { total: number; approvedPayments: number; pendingPayments: number };
  tokens: { total: number; used: number; available: number };
  meterStats: MeterStat[];
  users: { total: number; active: number };
}
interface MeterData {
  meterId: string; meterNumber: string; userName: string;
  totalTokens: number; daysSinceLast: number | null;
  avgDaysBetween: number | null; predictedNextDays: number | null;
  urgency: "ok" | "soon" | "overdue" | "unknown";
}
interface MonthData {
  monthKey: string; year: number; count: number; amount: number;
}

type FilterKey = "this-year" | "last-6" | "last-year" | "all";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "this-year", label: "This year" },
  { key: "last-6",    label: "Last 6 months" },
  { key: "last-year", label: "Last year" },
  { key: "all",       label: "All time" },
];

const urgencyConfig = {
  ok:      { color: "text-green-600",  bg: "bg-green-50",  border: "#86efac", icon: CheckCircle,   label: "On track" },
  soon:    { color: "text-amber-600",  bg: "bg-amber-50",  border: "#fcd34d", icon: AlertTriangle, label: "Buy soon" },
  overdue: { color: "text-red-600",    bg: "bg-red-50",    border: "#fca5a5", icon: AlertTriangle, label: "Overdue" },
  unknown: { color: "text-gray-400",   bg: "bg-gray-50",   border: "#e5e7eb", icon: Clock,         label: "No data" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [consumption, setConsumption] = useState<{ byMeter: MeterData[]; monthly: MonthData[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("this-year");

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.json()),
      fetch("/api/consumption").then(r => r.json()),
    ]).then(([sData, cData]) => {
      setStats(sData);
      if (cData?.byMeter) setConsumption(cData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredMonthly = useMemo(() => {
    if (!consumption?.monthly) return [];
    const now = new Date();
    const cy = now.getFullYear();
    return consumption.monthly.filter(m => {
      const [y, mo] = m.monthKey.split("-").map(Number);
      const mDate = new Date(y, mo - 1, 1);
      if (filter === "this-year")  return y === cy;
      if (filter === "last-year")  return y === cy - 1;
      if (filter === "last-6") { const c = new Date(now.getFullYear(), now.getMonth() - 5, 1); return mDate >= c; }
      return true;
    });
  }, [consumption, filter]);

  if (loading) return <Loading text="Loading dashboard..." />;

  const revenue    = stats?.revenue   ?? { total: 0, approvedPayments: 0, pendingPayments: 0 };
  const tokens     = stats?.tokens    ?? { total: 0, used: 0, available: 0 };
  const users      = stats?.users     ?? { total: 0, active: 0 };
  const meterStats = stats?.meterStats ?? [];

  const metersEmpty = meterStats.filter(m => m.availableTokens === 0 && m.totalTokens > 0);
  const metersLow   = meterStats.filter(m => m.availableTokens <= 2 && m.availableTokens > 0);

  const filteredTotal = filteredMonthly.reduce((s, m) => s + m.count, 0);
  const filteredRevenue = filteredMonthly.reduce((s, m) => s + m.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Lotz Landgoed Token Management</p>
      </div>

      {/* Alerts */}
      {revenue.pendingPayments > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            <strong>{revenue.pendingPayments}</strong> payment{revenue.pendingPayments > 1 ? "s" : ""} awaiting verification.{" "}
            <Link href="/admin/payments" className="underline font-medium">Review now →</Link>
          </p>
        </motion.div>
      )}
      {metersEmpty.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-800 text-sm">
            <strong>{metersEmpty.length}</strong> meter{metersEmpty.length > 1 ? "s" : ""} out of tokens:{" "}
            {metersEmpty.map(m => m.meterNumber).join(", ")}
          </p>
        </motion.div>
      )}
      {metersLow.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <p className="text-orange-800 text-sm">
            <strong>{metersLow.length}</strong> meter{metersLow.length > 1 ? "s" : ""} running low:{" "}
            {metersLow.map(m => `${m.meterNumber} (${m.availableTokens} left)`).join(", ")}
          </p>
        </motion.div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",    value: `R${(revenue.total ?? 0).toLocaleString()}`, icon: TrendingUp,   color: "bg-green-100 text-green-600" },
          { label: "Available Tokens", value: tokens.available,                             icon: Zap,          color: "bg-emerald-100 text-emerald-600" },
          { label: "Tokens Issued",    value: tokens.used,                                  icon: CheckCircle,  color: "bg-yellow-100 text-yellow-600" },
          { label: "Active Users",     value: users.active,                                 icon: Users,        color: "bg-blue-100 text-blue-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
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

      {/* Filtered stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card py-3">
          <p className="text-xl font-bold text-gray-900">{filteredTotal}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tokens purchased</p>
        </div>
        <div className="card py-3">
          <p className="text-xl font-bold text-[#1e5631]">R{(filteredRevenue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-500 mt-0.5">Revenue</p>
        </div>
      </div>

      {/* Meter Status from consumption */}
      {consumption?.byMeter && consumption.byMeter.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Meter Status</h2>
            <Link href="/admin/consumption" className="text-xs text-[#1e5631] hover:underline flex items-center gap-1">
              <Activity className="w-3 h-3" /> Full report →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {consumption.byMeter.map((m, i) => {
              const cfg = urgencyConfig[m.urgency];
              const Icon = cfg.icon;
              return (
                <motion.div key={m.meterId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`rounded-xl border p-4 ${cfg.bg}`} style={{ borderColor: cfg.border }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Meter {m.meterNumber}</p>
                        <p className="text-xs text-gray-500">{m.userName}</p>
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {m.predictedNextDays !== null ? (
                        <>
                          <p className={`text-base font-bold leading-none ${cfg.color}`}>
                            {m.predictedNextDays === 0 ? "Today" : `${m.predictedNextDays}d`}
                          </p>
                          <p className="text-xs text-gray-400">next top-up</p>
                        </>
                      ) : <p className="text-xs text-gray-400">No data</p>}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
                    <div><p className="font-medium text-gray-800">{m.totalTokens}</p><p className="text-gray-400">total</p></div>
                    <div><p className="font-medium text-gray-800">{m.avgDaysBetween ? `${m.avgDaysBetween}d` : "—"}</p><p className="text-gray-400">cycle</p></div>
                    <div><p className="font-medium text-gray-800">{m.daysSinceLast !== null ? `${m.daysSinceLast}d` : "—"}</p><p className="text-gray-400">ago</p></div>
                  </div>
                  {m.avgDaysBetween && m.daysSinceLast !== null && (
                    <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.urgency === "overdue" ? "bg-red-400" : m.urgency === "soon" ? "bg-amber-400" : "bg-green-400"}`}
                        style={{ width: `${Math.min(100, Math.round((m.daysSinceLast / m.avgDaysBetween) * 100))}%` }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Token inventory */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Token Inventory</h2>
          <Link href="/admin/users" className="text-sm text-[#1e5631] hover:underline">Manage users →</Link>
        </div>
        {meterStats.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No meters found</p>
        ) : (
          <div className="space-y-3">
            {meterStats.map((meter, i) => {
              const pct = meter.totalTokens > 0 ? (meter.availableTokens / meter.totalTokens) * 100 : 0;
              const barColor = meter.availableTokens === 0 ? "bg-red-500" : meter.availableTokens <= 2 ? "bg-orange-400" : "bg-green-500";
              return (
                <motion.div key={meter.meterId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 bg-[#1e5631] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gauge className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{meter.meterNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{meter.userName}{meter.userPhone ? ` · ${meter.userPhone}` : ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-gray-900">
                          <span className="text-green-600">{meter.availableTokens}</span>
                          <span className="text-gray-400 font-normal"> / {meter.totalTokens}</span>
                        </p>
                        <p className="text-xs text-gray-400">{meter.usedTokens} used</p>
                      </div>
                    </div>
                    {meter.totalTokens > 0 && (
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/users",    icon: Users,      color: "bg-blue-100 text-blue-600",     label: "Manage Users",    sub: `${users.total} total` },
          { href: "/admin/tokens",   icon: Zap,        color: "bg-emerald-100 text-emerald-600", label: "Token Sheets",  sub: `${tokens.available} available` },
          { href: "/admin/payments", icon: CreditCard, color: "bg-amber-100 text-amber-600",   label: "Verify Payments", sub: `${revenue.pendingPayments} pending` },
        ].map(action => (
          <Link key={action.href} href={action.href}>
            <motion.div whileHover={{ scale: 1.02 }}
              className="card flex items-center gap-4 cursor-pointer hover:border-green-300">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{action.label}</p>
                <p className="text-xs text-gray-500">{action.sub}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
