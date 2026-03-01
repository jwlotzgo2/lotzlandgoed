"use client";

import { useEffect, useState } from "react";
import { Eye, Check, X, Loader2, Clock, ExternalLink, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Loading } from "@/components/ui/loading";
import { TOKEN_PRICE } from "@/lib/types";

interface Payment {
  id: string;
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  referenceNumber: string | null;
  paymentDate: string | null;
  rejectionReason: string | null;
  cloudStoragePath: string | null;
  createdAt: string;
  user: { name: string; phone: string };
  meter: { meterNumber: string };
  tokens: { id: string; tokenValue: string }[];
  proofSignedUrl?: string;
  aiVerified?: boolean;
  aiAutoApproved?: boolean;
  aiConfident?: boolean;
  aiExtractedAmount?: number | null;
  aiExtractedRef?: string | null;
  aiExtractedDate?: string | null;
  aiAmountMatch?: boolean | null;
  aiReferenceMatch?: boolean | null;
  aiDateMatch?: boolean | null;
  aiReasoning?: string | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  const fetchPayments = async () => {
    try {
      const url = filter === "ALL" ? "/api/payments" : `/api/payments?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setPayments(data ?? []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const viewProof = async (payment: Payment) => {
    setSelectedPayment(payment);
    setLoadingProof(true);
    setProofUrl(null);

    try {
      const res = await fetch(`/api/payments/${payment.id}`);
      const data = await res.json();
      setProofUrl(data?.proofSignedUrl ?? null);
    } catch (error) {
      console.error("Error fetching proof:", error);
      toast.error("Failed to load payment proof");
    } finally {
      setLoadingProof(false);
    }
  };

  const handleVerify = async (action: "approve" | "reject") => {
    if (!selectedPayment) return;

    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Verification failed");
      }

      toast.success(
        action === "approve"
          ? `Payment approved! ${data?.tokens?.length ?? 0} tokens issued.`
          : "Payment rejected"
      );

      setSelectedPayment(null);
      setRejectionReason("");
      fetchPayments();
    } catch (error: any) {
      toast.error(error?.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Check className="w-4 h-4" />;
      case "REJECTED":
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "status-approved";
      case "REJECTED":
        return "status-rejected";
      default:
        return "status-pending";
    }
  };

  if (loading) {
    return <Loading text="Loading payments..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Verification</h1>
          <p className="text-gray-500 mt-1">Review and verify payment proofs</p>
        </div>
        <div className="flex gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#1e5631] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="table-container overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Meter</th>
              <th className="px-6 py-3">Quantity</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div>
                    <p className="font-medium text-gray-900">{payment.user?.name}</p>
                    <p className="text-sm text-gray-500">{payment.user?.phone}</p>
                  </div>
                </td>
                <td className="table-cell font-mono text-sm">{payment.meter?.meterNumber}</td>
                <td className="table-cell">{payment.quantity}</td>
                <td className="table-cell font-semibold">
                  R{payment.totalAmount?.toLocaleString()}
                </td>
                <td className="table-cell text-sm text-gray-500">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <span className={`${getStatusClass(payment.status)} flex items-center gap-1 w-fit`}>
                    {getStatusIcon(payment.status)}
                    {payment.status}
                  </span>
                </td>
                <td className="table-cell">
                  <button
                    onClick={() => viewProof(payment)}
                    className="p-2 text-[#1e5631] hover:bg-[#1e5631]/10 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="text-center text-gray-500 py-8">No payments found</p>
        )}
      </div>

      {/* Payment Detail Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setSelectedPayment(null);
                setRejectionReason("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium">{selectedPayment.user?.name}</p>
                  <p className="text-sm text-gray-500">{selectedPayment.user?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Meter Number</p>
                  <p className="font-medium font-mono">{selectedPayment.meter?.meterNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="font-medium">{selectedPayment.quantity} tokens</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold text-[#1e5631]">
                    R{selectedPayment.totalAmount?.toLocaleString()}
                  </p>
                </div>
                {selectedPayment.referenceNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Reference Number</p>
                    <p className="font-medium">{selectedPayment.referenceNumber}</p>
                  </div>
                )}
                {selectedPayment.paymentDate && (
                  <div>
                    <p className="text-sm text-gray-500">Payment Date</p>
                    <p className="font-medium">
                      {new Date(selectedPayment.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Proof of Payment */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Proof of Payment</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center">
                  {loadingProof ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : proofUrl ? (
                    <div className="w-full">
                      {proofUrl.includes(".pdf") ? (
                        <div className="p-6 text-center">
                          <p className="text-gray-600 mb-4">PDF Document</p>
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary inline-flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </a>
                        </div>
                      ) : (
                        <img
                          src={proofUrl}
                          alt="Payment proof"
                          className="w-full max-h-[400px] object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No proof uploaded</p>
                  )}
                </div>
                {proofUrl && (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#1e5631] hover:underline flex items-center gap-1 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in new tab
                  </a>
                )}
              </div>

              {/* AI Verification Panel */}
              {selectedPayment.aiVerified && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    selectedPayment.aiAutoApproved ? "bg-green-50" :
                    selectedPayment.aiConfident === false ? "bg-red-50" : "bg-yellow-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🤖</span>
                      <span className="font-semibold text-sm text-gray-900">AI Verification</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      selectedPayment.aiAutoApproved ? "bg-green-100 text-green-700" :
                      selectedPayment.aiConfident === false ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {selectedPayment.aiAutoApproved ? "Auto-Approved" :
                       selectedPayment.aiConfident === false ? "Low Confidence" : "Needs Review"}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Extracted values */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Extracted Amount</p>
                        <p className="font-semibold text-sm text-gray-900">
                          {selectedPayment.aiExtractedAmount != null
                            ? `R${selectedPayment.aiExtractedAmount.toLocaleString()}`
                            : <span className="text-gray-400">—</span>}
                        </p>
                        <MatchBadge value={selectedPayment.aiAmountMatch} />
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Extracted Date</p>
                        <p className="font-semibold text-sm text-gray-900">
                          {selectedPayment.aiExtractedDate
                            ? selectedPayment.aiExtractedDate
                            : <span className="text-gray-400">—</span>}
                        </p>
                        <MatchBadge value={selectedPayment.aiDateMatch} label="In Range" />
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Extracted Ref</p>
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {selectedPayment.aiExtractedRef
                            ? selectedPayment.aiExtractedRef
                            : <span className="text-gray-400">—</span>}
                        </p>
                        <MatchBadge value={selectedPayment.aiReferenceMatch} />
                      </div>
                    </div>
                    {/* Expected vs extracted */}
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                      <p><span className="font-medium">Expected amount:</span> R{selectedPayment.totalAmount.toLocaleString()}</p>
                      {selectedPayment.referenceNumber && (
                        <p><span className="font-medium">Expected ref:</span> {selectedPayment.referenceNumber}</p>
                      )}
                    </div>
                    {/* AI reasoning */}
                    {selectedPayment.aiReasoning && (
                      <p className="text-xs text-gray-600 italic border-l-2 border-gray-200 pl-3">
                        "{selectedPayment.aiReasoning}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status & Actions */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">Current Status:</span>
                  <span className={getStatusClass(selectedPayment.status)}>
                    {selectedPayment.status}
                  </span>
                </div>

                {selectedPayment.status === "PENDING" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Rejection Reason (if rejecting)</label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="input"
                        placeholder="Enter reason for rejection..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVerify("reject")}
                        disabled={verifying}
                        className="flex-1 btn-danger flex items-center justify-center gap-2"
                      >
                        {verifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify("approve")}
                        disabled={verifying}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        {verifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedPayment.status === "REJECTED" && selectedPayment.rejectionReason && (
                      <div className="bg-red-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {selectedPayment.rejectionReason}
                        </p>
                      </div>
                    )}
                    {selectedPayment.status === "APPROVED" && selectedPayment.tokens?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Issued Tokens:</p>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                          {selectedPayment.tokens.map((token) => (
                            <div
                              key={token.id}
                              className="bg-green-50 rounded-lg p-2 font-mono text-sm text-green-800"
                            >
                              {token.tokenValue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setRejectionReason("");
                }}
                className="w-full mt-4 btn-secondary"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MatchBadge({ value, label = "Match" }: { value: boolean | null | undefined; label?: string }) {
  if (value === true) return <span className="text-xs text-green-600 font-medium">✓ {label}</span>;
  if (value === false) return <span className="text-xs text-red-600 font-medium">✗ No {label}</span>;
  return <span className="text-xs text-gray-400">— N/A</span>;
}
