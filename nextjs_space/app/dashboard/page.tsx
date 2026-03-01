"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Zap, CreditCard, History, Settings, ChevronRight, Gauge } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loading } from "@/components/ui/loading";
import { TOKEN_PRICE } from "@/lib/types";

interface MeterStats {
  id: string;
  meterNumber: string;
  availableTokens: number;
}

export default function UserDashboard() {
  const { data: session } = useSession() || {};
  const [meterStats, setMeterStats] = useState<MeterStats[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = session?.user as any;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch meters and available tokens
        const meters = (user?.meters ?? []) as any[];
        const stats = await Promise.all(
          meters.map(async (meter: any) => {
            const res = await fetch(`/api/tokens/available?meterId=${meter?.id}`);
            const data = await res.json();
            return {
              id: meter?.id ?? "",
              meterNumber: meter?.meterNumber ?? "",
              availableTokens: data?.count ?? 0,
            };
          })
        );
        setMeterStats(stats);

        // Fetch pending payments
        const paymentsRes = await fetch("/api/payments?status=PENDING");
        const payments = await paymentsRes.json();
        setPendingPayments(payments?.length ?? 0);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.meters) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  const totalAvailableTokens = meterStats.reduce((sum, m) => sum + m.availableTokens, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name ?? "User"}</h1>
        <p className="text-gray-500 mt-1">Manage your prepaid electricity tokens</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Tokens</p>
              <p className="text-2xl font-bold text-gray-900">{totalAvailableTokens}</p>
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
            <div className="w-12 h-12 bg-[#d4a017]/20 rounded-xl flex items-center justify-center">
              <Gauge className="w-6 h-6 text-[#d4a017]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Your Meters</p>
              <p className="text-2xl font-bold text-gray-900">{meterStats.length}</p>
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
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPayments}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Meters */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Meters</h2>
        {meterStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No meters assigned to your account. Contact your administrator.
          </p>
        ) : (
          <div className="space-y-3">
            {meterStats.map((meter, index) => (
              <motion.div
                key={meter.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1e5631] rounded-lg flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{meter.meterNumber}</p>
                    <p className="text-sm text-gray-500">
                      {meter.availableTokens} tokens available
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Token Price</p>
                  <p className="font-semibold text-[#1e5631]">R{TOKEN_PRICE.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/buy">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="card flex items-center justify-between cursor-pointer hover:border-[#1e5631] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1e5631] rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium">Buy Tokens</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.div>
        </Link>

        <Link href="/dashboard/history">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="card flex items-center justify-between cursor-pointer hover:border-[#1e5631] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d4a017] rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium">Payment History</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.div>
        </Link>

        <Link href="/change-password">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="card flex items-center justify-between cursor-pointer hover:border-[#1e5631] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium">Change Password</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
