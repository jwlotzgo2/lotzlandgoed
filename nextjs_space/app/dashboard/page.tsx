"use client"; // build: 20260315_192809

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { Zap, CreditCard, Clock, ChevronRight, TrendingUp, CheckCircle, XCircle, AlertTriangle, Activity } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loading } from "@/components/ui/loading";
import { TOKEN_PRICE } from "@/lib/types";

interface Payment {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalAmount: number;
  quantity: number;
  createdAt: string;
  aiAutoApproved?: boolean;
  meter: { meterNumber: string };
}

interface MeterData {
  meterId: string;
  meterNumber: string;
  userName: string;
  totalTokens: number;
  daysSinceLast: number | null;
  avgDaysBetween: number | null;
  predictedNextDays: number | null;
  urgency: "ok" | "soon" | "overdue" | "unknown";
}

interface MonthData {
  monthKey: string;
  year: number;
  count: number;
  amount: number;
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

export default function UserDashboard() {
  const { data: session } = useSession() || {};
  const [payments, setPayments] = useState<Payment[]>([]);
  const [consumption, setConsumption] = useState<{ byMeter: MeterData[]; monthly: MonthData[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("this-year");
  const user = session?.user as any;

  useEffect(() => {
    Promise.all([
      fetch("/api/payments").then(r => r.json()),
      fetch("/api/consumption").then(r => r.json()),
    ]).then(([pData, cData]) => {
      if (Array.isArray(pData)) setPayments(pData);
      if (cData?.byMeter) setConsumption(cData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredMonthly = useMemo(() => {
    if (!consumption?.monthly) return [];
    const now = new Date();
    const currentYear = now.getFullYear();
    return consumption.monthly.filter(m => {
      const [year, month] = m.monthKey.split("-").map(Number);
      const mDate = new Date(year, month - 1, 1);
      if (filter === "this-year")  return year === currentYear;
      if (filter === "last-year")  return year === currentYear - 1;
      if (filter === "last-6") {
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return mDate >= cutoff;
      }
      return true; // all
    });
  }, [consumption, filter]);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return payments.filter(p => {
      const d = new Date(p.createdAt);
      if (filter === "this-year")  return d.getFullYear() === currentYear;
      if (filter === "last-year")  return d.getFullYear() === currentYear - 1;
      if (filter === "last-6") {
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return d >= cutoff;
      }
      return true;
    });
  }, [payments, filter]);

  // All derived stats in one memo — guaranteed to recompute when filter changes
  const stats = useMemo(() => {
    const approved  = filteredPayments.filter(p => p.status === "APPROVED");
    const pending   = filteredPayments.filter(p => p.status === "PENDING");
    const rejected  = filteredPayments.filter(p => p.status === "REJECTED");
    const totalSpent   = approved.reduce((s, p) => s + (p.totalAmount ?? 0), 0);
    const totalTokens  = approved.reduce((s, p) => s + (p.quantity ?? 0), 0);
    const monthKeys = new Set(
      approved.map(p => {
        const d = new Date(p.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      })
    );
    const activeMonths     = monthKeys.size || 1;
    const avgMonthlySpend  = totalSpent / activeMonths;
    const avgMonthlyTokens = totalTokens / activeMonths;
    return { approved, pending, rejected, totalSpent, totalTokens, avgMonthlySpend, avgMonthlyTokens };
  }, [filteredPayments]);

  const { approved, pending, rejected, totalSpent, totalTokens, avgMonthlySpend, avgMonthlyTokens } = stats;
  const recentPayments = payments.slice(0, 5);

  if (loading) return <Loading text="Loading dashboard..." />;

  const statusIcon = (s: string) => {
    if (s === "APPROVED") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === "REJECTED") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };
  const statusColor = (s: string) => {
    if (s === "APPROVED") return "text-green-600 bg-green-50";
    if (s === "REJECTED") return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name ?? "User"}</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your prepaid electricity tokens</p>
      </div>

      {/* Buy CTA */}
      <Link href="/dashboard/buy">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="bg-[#1e5631] rounded-2xl p-5 cursor-pointer shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Ready to top up?</p>
                <p className="text-white text-xl font-bold">Buy Tokens</p>
                <p className="text-white/60 text-xs mt-0.5">R{TOKEN_PRICE.toLocaleString()} per token</p>
              </div>
            </div>
            <div className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1">
              Buy Now <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === f.key ? "bg-[#1e5631] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {/* Spent card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="card py-3 px-3">
          <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-[#1e5631]" />
          </div>
          <p className="text-lg font-bold text-gray-900 leading-none">
            R{totalSpent >= 1000 ? `${Math.round(totalSpent/1000)}k` : totalSpent}
          </p>
          <p className="text-xs text-gray-500 mt-1">Spent</p>
          <p className="text-xs text-gray-400 mt-0.5">
            R{avgMonthlySpend >= 1000 ? `${Math.round(avgMonthlySpend/1000)}k` : Math.round(avgMonthlySpend)}/mo avg
          </p>
        </motion.div>
        {/* Tokens card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="card py-3 px-3">
          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 leading-none">{totalTokens}</p>
          <p className="text-xs text-gray-500 mt-1">Tokens</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {avgMonthlyTokens >= 1 ? avgMonthlyTokens.toFixed(1) : "<1"}/mo avg
          </p>
        </motion.div>
        {/* Pending card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card py-3 px-3">
          <div className="w-7 h-7 bg-yellow-50 rounded-lg flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 leading-none">{pending.length || "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {rejected.length > 0 ? `${rejected.length} rejected` : "none rejected"}
          </p>
        </motion.div>
      </div>

      {/* Meter Status */}
      {consumption?.byMeter && consumption.byMeter.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Meter Status</h2>
            <Link href="/dashboard/consumption" className="text-xs text-[#1e5631] hover:underline flex items-center gap-1">
              <Activity className="w-3 h-3" /> Consumption →
            </Link>
          </div>
          <div className="space-y-3">
            {consumption.byMeter.map((m, i) => {
              const cfg = urgencyConfig[m.urgency];
              const Icon = cfg.icon;
              return (
                <motion.div key={m.meterId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`rounded-xl border p-4 ${cfg.bg}`}
                  style={{ borderColor: cfg.border }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Meter {m.meterNumber}</p>
                        <p className="text-xs text-gray-500">{m.userName}</p>
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {m.predictedNextDays !== null ? (
                        <>
                          <p className={`text-lg font-bold leading-none ${cfg.color}`}>
                            {m.predictedNextDays === 0 ? "Today" : `${m.predictedNextDays}d`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">next top-up</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Insufficient data</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{m.totalTokens}</p>
                      <p className="text-gray-400">total</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{m.avgDaysBetween ? `${m.avgDaysBetween}d` : "—"}</p>
                      <p className="text-gray-400">avg cycle</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{m.daysSinceLast !== null ? `${m.daysSinceLast}d` : "—"}</p>
                      <p className="text-gray-400">since last</p>
                    </div>
                  </div>
                  {m.avgDaysBetween && m.daysSinceLast !== null && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          m.urgency === "overdue" ? "bg-red-400" :
                          m.urgency === "soon" ? "bg-amber-400" : "bg-green-400"
                        }`} style={{ width: `${Math.min(100, Math.round((m.daysSinceLast / m.avgDaysBetween) * 100))}%` }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Summary + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Payment Summary</h2>
          {filteredPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No payments in this period</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Approved", count: approved.length,  amount: totalSpent,                                              color: "bg-green-500" },
                { label: "Pending",  count: pending.length,   amount: pending.reduce((s, p) => s + p.totalAmount, 0),          color: "bg-yellow-400" },
                { label: "Rejected", count: rejected.length,  amount: rejected.reduce((s, p) => s + p.totalAmount, 0),         color: "bg-red-400" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.color}`} />
                  <span className="text-gray-600 flex-1">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.count}</span>
                  <span className="text-gray-400 text-xs w-20 text-right">R{row.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="font-medium text-gray-700">Total</span>
                <span className="font-bold text-gray-900">R{filteredPayments.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Payments</h2>
            <Link href="/dashboard/history" className="text-xs text-[#1e5631] hover:underline">View all</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {statusIcon(p.status)}
                    <div>
                      <p className="text-xs font-medium text-gray-900">Meter {p.meter?.meterNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("en-ZA")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">R{p.totalAmount?.toLocaleString()}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor(p.status)}`}>
                      {(p as any).aiAutoApproved ? "🤖 " : ""}{p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
