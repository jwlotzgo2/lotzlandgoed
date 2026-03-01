"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Zap, CheckCircle, XCircle, Upload, Bot, User, Search, Filter } from "lucide-react";
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
  aiConfident: boolean | null;
  aiReasoning: string | null;
  aiAmountMatch: boolean | null;
  aiReferenceMatch: boolean | null;
  aiDateMatch: boolean | null;
  user: { name: string; phone: string };
  meter: { meterNumber: string };
  tokens: { id: string; tokenValue: string }[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "SUBMITTED" | "APPROVED" | "REJECTED" | "AI_AUTO" | "AI_REVIEW" | "TOKEN_ISSUED";
  title: string;
  detail: string;
  meta?: string;
  user: string;
  userId?: string;
  paymentId: string;
}

function buildAdminLog(payments: Payment[]): LogEntry[] {
  const entries: LogEntry[] = [];

  payments.forEach((p) => {
    const userName = p.user?.name ?? "Unknown";

    entries.push({
      id: `${p.id}-submit`,
      timestamp: p.createdAt,
      type: "SUBMITTED",
      title: "Payment Submitted",
      detail: `${p.quantity} token${p.quantity > 1 ? "s" : ""} for meter ${p.meter?.meterNumber}`,
      meta: `R${p.totalAmount.toLocaleString()}${p.referenceNumber ? ` · ${p.referenceNumber}` : ""}`,
      user: userName,
      paymentId: p.id,
    });

    if (p.aiVerified !== null && p.verifiedAt) {
      if (p.aiAutoApproved) {
        entries.push({
          id: `${p.id}-ai-auto`,
          timestamp: p.verifiedAt,
          type: "AI_AUTO",
          title: "AI Auto-Approved",
          detail: p.aiReasoning ?? "All checks passed",
          meta: [
            p.aiAmountMatch ? "✓ Amount" : "✗ Amount",
            p.aiReferenceMatch ? "✓ Ref" : "✗ Ref",
            p.aiDateMatch ? "✓ Date" : "✗ Date",
          ].join("  "),
          user: userName,
          paymentId: p.id,
        });
      } else {
        entries.push({
          id: `${p.id}-ai-review`,
          timestamp: p.verifiedAt,
          type: "AI_REVIEW",
          title: "AI Flagged for Review",
          detail: p.aiReasoning ?? "Could not verify automatically",
          meta: [
            p.aiAmountMatch ? "✓ Amount" : "✗ Amount",
            p.aiReferenceMatch ? "✓ Ref" : "✗ Ref",
            p.aiDateMatch ? "✓ Date" : "✗ Date",
          ].join("  "),
          user: userName,
          paymentId: p.id,
        });
      }
    }

    if (p.status === "APPROVED" && p.verifiedAt && !p.aiAutoApproved) {
      entries.push({
        id: `${p.id}-admin-approved`,
        timestamp: p.verifiedAt,
        type: "APPROVED",
        title: "Admin Approved",
        detail: `Manual approval for ${userName} — meter ${p.meter?.meterNumber}`,
        meta: `R${p.totalAmount.toLocaleString()}`,
        user: "Admin",
        paymentId: p.id,
      });
    }

    if (p.status === "REJECTED" && p.verifiedAt) {
      entries.push({
        id: `${p.id}-rejected`,
        timestamp: p.verifiedAt,
        type: "REJECTED",
        title: "Payment Rejected",
        detail: p.rejectionReason ?? "Verification failed",
        meta: `R${p.totalAmount.toLocaleString()} · ${userName}`,
        user: p.aiAutoApproved === false && p.aiVerified ? "AI" : "Admin",
        paymentId: p.id,
      });
    }

    if (p.status === "APPROVED" && p.tokens?.length) {
      p.tokens.forEach((t) => {
        entries.push({
          id: `${p.id}-token-${t.id}`,
          timestamp: p.verifiedAt!,
          type: "TOKEN_ISSUED",
          title: "Token Issued",
          detail: `Token released to ${userName} for meter ${p.meter?.meterNumber}`,
          meta: t.tokenValue,
          user: userName,
          paymentId: p.id,
        });
      });
    }
  });

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const typeConfig: Record<string, { icon: any; bg: string; color: string; label: string; dot: string }> = {
  SUBMITTED:   { icon: Upload,      bg: "bg-blue-50",    color: "text-blue-600",    label: "Submitted",  dot: "#3b82f6" },
  AI_AUTO:     { icon: Bot,         bg: "bg-purple-50",  color: "text-purple-600",  label: "AI Approved", dot: "#9333ea" },
  AI_REVIEW:   { icon: Bot,         bg: "bg-orange-50",  color: "text-orange-500",  label: "AI Flagged",  dot: "#f97316" },
  APPROVED:    { icon: CheckCircle, bg: "bg-green-50",   color: "text-green-600",   label: "Approved",   dot: "#16a34a" },
  REJECTED:    { icon: XCircle,     bg: "bg-red-50",     color: "text-red-500",     label: "Rejected",   dot: "#ef4444" },
  TOKEN_ISSUED:{ icon: Zap,         bg: "bg-emerald-50", color: "text-emerald-600", label: "Token",      dot: "#1e5631" },
};

const filterOptions = [
  { key: "ALL", label: "All" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "AI_AUTO", label: "AI Approved" },
  { key: "AI_REVIEW", label: "AI Flagged" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "TOKEN_ISSUED", label: "Tokens" },
];

export default function AdminActivityPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading activity..." />;

  const log = buildAdminLog(payments);
  const filtered = log
    .filter((e) => filter === "ALL" || e.type === filter)
    .filter((e) => !search || e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.detail.toLowerCase().includes(search.toLowerCase()) ||
      e.meta?.toLowerCase().includes(search.toLowerCase()));

  // Stats summary
  const stats = {
    submitted: log.filter(e => e.type === "SUBMITTED").length,
    aiAuto: log.filter(e => e.type === "AI_AUTO").length,
    flagged: log.filter(e => e.type === "AI_REVIEW").length,
    approved: log.filter(e => e.type === "APPROVED").length,
    rejected: log.filter(e => e.type === "REJECTED").length,
    tokens: log.filter(e => e.type === "TOKEN_ISSUED").length,
  };

  // Group by date
  const grouped: Record<string, LogEntry[]> = {};
  filtered.forEach((e) => {
    const day = new Date(e.timestamp).toLocaleDateString("en-ZA", { dateStyle: "full" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Journal</h1>
            <p className="text-gray-500 text-sm">{log.length} total events</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Submitted", value: stats.submitted, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "AI Auto", value: stats.aiAuto, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Flagged", value: stats.flagged, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Approved", value: stats.approved, color: "text-green-600", bg: "bg-green-50" },
          { label: "Rejected", value: stats.rejected, color: "text-red-500", bg: "bg-red-50" },
          { label: "Tokens", value: stats.tokens, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, amount, reference..." className="input pl-9 text-sm" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterOptions.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                filter === f.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No events found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, entries]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{day}</p>
              <div className="space-y-2">
                {entries.map((entry, idx) => {
                  const cfg = typeConfig[entry.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex gap-3 items-start hover:border-gray-200 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">{entry.title}</p>
                            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                              <User className="w-3 h-3" />{entry.user}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{entry.detail}</p>
                        {entry.meta && (
                          <p className={`text-xs mt-1.5 font-mono ${
                            entry.type === "TOKEN_ISSUED"
                              ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block"
                              : "text-gray-400"
                          }`}>
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
