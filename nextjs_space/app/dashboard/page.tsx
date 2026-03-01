"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Zap, CreditCard, Clock, ChevronRight, Gauge, TrendingUp, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
  tokens: { id: string; tokenValue: string; status: string }[];
}

export default function UserDashboard() {
  const { data: session } = useSession() || {};
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const user = session?.user as any;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/payments");
        const data = await res.json();
        if (Array.isArray(data)) setPayments(data);
      } catch (e) {
        console.error("Error fetching payments:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loading text="Loading dashboard..." />;

  // Derived stats
  const approved = payments.filter(p => p.status === "APPROVED");
  const pending = payments.filter(p => p.status === "PENDING");
  const rejected = payments.filter(p => p.status === "REJECTED");
  const totalSpent = approved.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0);
  const totalTokens = approved.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
  const pendingAmount = pending.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0);

  // Monthly spend (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("default", { month: "short" });
    const total = approved
      .filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      })
      .reduce((sum, p) => sum + p.totalAmount, 0);
    return { label, total };
  });
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  // Recent payments (last 5)
  const recentPayments = payments.slice(0, 5);

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name ?? "User"}</h1>
        <p className="text-gray-500 mt-1">Manage your prepaid electricity tokens</p>
      </div>

      {/* BUY TOKENS — Primary CTA */}
      <Link href="/dashboard/buy">
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="bg-[#1e5631] rounded-2xl p-6 cursor-pointer shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Ready to top up?</p>
                <p className="text-white text-2xl font-bold">Buy Tokens</p>
                <p className="text-white/70 text-sm mt-0.5">R{TOKEN_PRICE.toLocaleString()} per token</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-semibold">
              Buy Now
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Spent", value: `R${totalSpent.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5 text-[#1e5631]" />, bg: "bg-green-50" },
          { label: "Tokens Purchased", value: totalTokens, icon: <Zap className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
          { label: "Pending", value: pending.length > 0 ? `${pending.length} (R${pendingAmount.toLocaleString()})` : "None", icon: <Clock className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-50" },
          { label: "Total Payments", value: payments.length, icon: <CreditCard className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Monthly Spend Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Monthly Spend</h2>
        {totalSpent === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No approved payments yet</p>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {monthlyData.map((m, i) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-500 font-medium">
                  {m.total > 0 ? `R${(m.total / 1000).toFixed(0)}k` : ""}
                </p>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: m.total > 0 ? `${Math.round((m.total / maxMonthly) * 100)}%` : "4px" }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className={`w-full rounded-t-lg ${m.total > 0 ? "bg-[#1e5631]" : "bg-gray-100"}`}
                  style={{ minHeight: "4px" }}
                />
                <p className="text-xs text-gray-400">{m.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Breakdown + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Approved", count: approved.length, amount: totalSpent, color: "bg-green-500" },
                { label: "Pending", count: pending.length, amount: pendingAmount, color: "bg-yellow-400" },
                { label: "Rejected", count: rejected.length, amount: rejected.reduce((s, p) => s + p.totalAmount, 0), color: "bg-red-400" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${row.color}`} />
                  <span className="text-sm text-gray-600 flex-1">{row.label}</span>
                  <span className="text-sm font-medium text-gray-900">{row.count} payments</span>
                  <span className="text-sm text-gray-500 w-24 text-right">R{row.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-3 mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-bold text-gray-900">R{payments.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            <Link href="/dashboard/history" className="text-sm text-[#1e5631] hover:underline">View all</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {statusIcon(p.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">Meter {p.meter?.meterNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">R{p.totalAmount?.toLocaleString()}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>
                      {p.aiAutoApproved ? "🤖 " : ""}{p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meters */}
      {user?.meters?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Meters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(user.meters as any[]).map((meter: any) => {
              const meterPayments = approved.filter(p => p.meter?.meterNumber === meter.meterNumber);
              const meterTokens = meterPayments.reduce((s, p) => s + p.quantity, 0);
              const meterSpend = meterPayments.reduce((s, p) => s + p.totalAmount, 0);
              return (
                <div key={meter.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1e5631] rounded-lg flex items-center justify-center">
                      <Gauge className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Meter {meter.meterNumber}</p>
                      <p className="text-xs text-gray-500">{meterTokens} tokens purchased</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#1e5631]">R{meterSpend.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">total spent</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
