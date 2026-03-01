"use client";

import { useEffect, useState } from "react";
import { Users, Zap, CreditCard, TrendingUp, AlertCircle, Gauge } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loading } from "@/components/ui/loading";
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("@/components/charts/revenue-chart"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />,
});

interface Stats {
  revenue: { total: number; approvedPayments: number; pendingPayments: number };
  tokens: { total: number; used: number; available: number };
  meterStats: { meterId: string; meterNumber: string; userName: string; availableTokens: number }[];
  monthlyRevenue: { [key: string]: number };
  users: { total: number; active: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  const revenue = stats?.revenue ?? { total: 0, approvedPayments: 0, pendingPayments: 0 };
  const tokens = stats?.tokens ?? { total: 0, used: 0, available: 0 };
  const users = stats?.users ?? { total: 0, active: 0 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Lotz Landgoed Token Management Overview</p>
      </div>

      {/* Alert for pending payments */}
      {revenue.pendingPayments > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <p className="text-amber-800">
            <strong>{revenue.pendingPayments}</strong> payment{revenue.pendingPayments > 1 ? "s" : ""} awaiting
            verification.
            <Link href="/admin/payments" className="ml-2 underline font-medium">
              Review now
            </Link>
          </p>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                R{(revenue.total ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1e5631]/10 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#1e5631]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Tokens</p>
              <p className="text-2xl font-bold text-gray-900">{tokens.available}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#d4a017]/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[#d4a017]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tokens Issued</p>
              <p className="text-2xl font-bold text-gray-900">{tokens.used}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.active}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
          <div className="h-64">
            <RevenueChart data={stats?.monthlyRevenue ?? {}} />
          </div>
        </motion.div>

        {/* Token Status by Meter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tokens by Meter</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(stats?.meterStats ?? []).map((meter) => (
              <div
                key={meter.meterId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1e5631] rounded-lg flex items-center justify-center">
                    <Gauge className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{meter.meterNumber}</p>
                    <p className="text-xs text-gray-500">{meter.userName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#1e5631]">{meter.availableTokens}</p>
                  <p className="text-xs text-gray-500">available</p>
                </div>
              </div>
            ))}
            {(stats?.meterStats ?? []).length === 0 && (
              <p className="text-gray-500 text-center py-4">No meters found</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card flex items-center gap-4 cursor-pointer hover:border-[#1e5631]"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">Create and edit user accounts</p>
            </div>
          </motion.div>
        </Link>

        <Link href="/admin/tokens">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card flex items-center gap-4 cursor-pointer hover:border-[#1e5631]"
          >
            <div className="w-12 h-12 bg-[#1e5631]/10 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#1e5631]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Token Sheets</p>
              <p className="text-sm text-gray-500">Upload and manage tokens</p>
            </div>
          </motion.div>
        </Link>

        <Link href="/admin/payments">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card flex items-center gap-4 cursor-pointer hover:border-[#1e5631]"
          >
            <div className="w-12 h-12 bg-[#d4a017]/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[#d4a017]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Verify Payments</p>
              <p className="text-sm text-gray-500">
                {revenue.pendingPayments} pending review
              </p>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
