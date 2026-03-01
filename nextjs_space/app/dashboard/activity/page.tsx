"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Zap, CreditCard, CheckCircle, XCircle, Clock, Upload, Bot } from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface Payment {
  id: string;
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  referenceNumber: string | null;
  rejectionReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
  aiAutoApproved: boolean | null;
  aiVerified: boolean | null;
  aiReasoning: string | null;
  meter: { meterNumber: string };
  tokens: { id: string; tokenValue: string }[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "SUBMITTED" | "APPROVED" | "REJECTED" | "AI_VERIFIED" | "TOKEN_ISSUED";
  title: string;
  detail: string;
  meta?: string;
  paymentId: string;
}

function buildLog(payments: Payment[]): LogEntry[] {
  const entries: LogEntry[] = [];

  payments.forEach((p) => {
    // Submission event
    entries.push({
      id: `${p.id}-submit`,
      timestamp: p.createdAt,
      type: "SUBMITTED",
      title: "Payment Submitted",
      detail: `${p.quantity} token${p.quantity > 1 ? "s" : ""} for meter ${p.meter?.meterNumber}`,
      meta: `R${p.totalAmount.toLocaleString()}${p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ""}`,
      paymentId: p.id,
    });

    // AI verified event
    if (p.aiVerified !== null && p.verifiedAt) {
      entries.push({
        id: `${p.id}-ai`,
        timestamp: p.verifiedAt,
        type: "AI_VERIFIED",
        title: p.aiAutoApproved ? "AI Auto-Approved" : "AI Review Complete",
        detail: p.aiReasoning ?? (p.aiAutoApproved ? "All checks passed" : "Needs manual review"),
        meta: p.aiAutoApproved ? "Auto-approved" : "Sent to admin",
        paymentId: p.id,
      });
    }

    // Status resolution
    if (p.status === "APPROVED" && p.verifiedAt) {
      if (!p.aiAutoApproved) {
        entries.push({
          id: `${p.id}-approved`,
          timestamp: p.verifiedAt,
          type: "APPROVED",
          title: "Payment Approved",
          detail: `Admin approved your payment for meter ${p.meter?.meterNumber}`,
          meta: `R${p.totalAmount.toLocaleString()}`,
          paymentId: p.id,
        });
      }
      // Token issued events
      p.tokens?.forEach((t, i) => {
        entries.push({
          id: `${p.id}-token-${t.id}`,
          timestamp: p.verifiedAt!,
          type: "TOKEN_ISSUED",
          title: "Token Released",
          detail: `Token issued for meter ${p.meter?.meterNumber}`,
          meta: t.tokenValue,
          paymentId: p.id,
        });
      });
    }

    if (p.status === "REJECTED" && p.verifiedAt) {
      entries.push({
        id: `${p.id}-rejected`,
        timestamp: p.verifiedAt,
        type: "REJECTED",
        title: "Payment Rejected",
        detail: p.rejectionReason ?? "Payment could not be verified",
        meta: `R${p.totalAmount.toLocaleString()}`,
        paymentId: p.id,
      });
    }
  });

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const typeConfig = {
  SUBMITTED: { icon: Upload, bg: "bg-blue-100", color: "text-blue-600", bar: "bg-blue-400" },
  AI_VERIFIED: { icon: Bot, bg: "bg-purple-100", color: "text-purple-600", bar: "bg-purple-400" },
  APPROVED: { icon: CheckCircle, bg: "bg-green-100", color: "text-green-600", bar: "bg-green-500" },
  REJECTED: { icon: XCircle, bg: "bg-red-100", color: "text-red-600", bar: "bg-red-500" },
  TOKEN_ISSUED: { icon: Zap, bg: "bg-[#1e5631]/10", color: "text-[#1e5631]", bar: "bg-[#1e5631]" },
};

const filterOptions = ["ALL", "SUBMITTED", "APPROVED", "REJECTED", "TOKEN_ISSUED"] as const;

export default function UserActivityPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof filterOptions[number]>("ALL");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading activity..." />;

  const log = buildLog(payments);
  const filtered = filter === "ALL" ? log : log.filter((e) => e.type === filter);

  // Group by date
  const grouped: Record<string, LogEntry[]> = {};
  filtered.forEach((e) => {
    const day = new Date(e.timestamp).toLocaleDateString("en-ZA", { dateStyle: "full" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e5631]/10 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#1e5631]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-sm">{log.length} events</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterOptions.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === f ? "bg-[#1e5631] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f === "TOKEN_ISSUED" ? "Tokens" : f === "AI_VERIFIED" ? "AI" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f === "ALL" && ` (${log.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No activity yet</p>
          <p className="text-gray-400 text-sm mt-1">Your payment and token events will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, entries]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">{day}</p>
              <div className="space-y-2">
                {entries.map((entry, idx) => {
                  const cfg = typeConfig[entry.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="card py-3 px-4 flex gap-3 items-start border-l-4 rounded-l-none" style={{ borderLeftColor: cfg.bar.replace("bg-", "") }}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900 text-sm">{entry.title}</p>
                          <p className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{entry.detail}</p>
                        {entry.meta && (
                          <p className={`text-xs mt-1 font-mono ${entry.type === "TOKEN_ISSUED" ? "text-[#1e5631] bg-green-50 px-2 py-0.5 rounded inline-block" : "text-gray-400"}`}>
                            {entry.meta}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
