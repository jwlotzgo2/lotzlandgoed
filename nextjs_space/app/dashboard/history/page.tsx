"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, X, ChevronDown, ChevronUp, Copy, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { Loading } from "@/components/ui/loading";
import { TOKEN_PRICE } from "@/lib/types";

interface Payment {
  id: string;
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  referenceNumber: string | null;
  rejectionReason: string | null;
  createdAt: string;
  meter: { meterNumber: string };
  tokens: { id: string; tokenValue: string; status: string }[];
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch("/api/payments");
        const data = await res.json();
        setPayments(data ?? []);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copied to clipboard");
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
    return <Loading text="Loading payment history..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-gray-500 mt-1">View your token purchases and payments</p>
      </div>

      {payments.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No payments found. Start by purchasing tokens.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment, index) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() =>
                  setExpandedPayment(
                    expandedPayment === payment.id ? null : payment.id
                  )
                }
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.status === "APPROVED"
                        ? "bg-green-100"
                        : payment.status === "REJECTED"
                        ? "bg-red-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    {getStatusIcon(payment.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.quantity} token{payment.quantity > 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      R{payment.totalAmount.toLocaleString()}
                    </p>
                    <span className={getStatusClass(payment.status)}>
                      {payment.status}
                    </span>
                  </div>
                  {expandedPayment === payment.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedPayment === payment.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-gray-100 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Meter Number</p>
                          <p className="font-medium">{payment.meter?.meterNumber}</p>
                        </div>
                        {payment.referenceNumber && (
                          <div>
                            <p className="text-gray-500">Reference</p>
                            <p className="font-medium">{payment.referenceNumber}</p>
                          </div>
                        )}
                      </div>

                      {payment.status === "REJECTED" && payment.rejectionReason && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-sm text-red-800">
                            <strong>Rejection Reason:</strong> {payment.rejectionReason}
                          </p>
                        </div>
                      )}

                      {payment.status === "APPROVED" && payment.tokens?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Your Tokens:
                          </p>
                          <div className="space-y-2">
                            {payment.tokens.map((token) => (
                              <div
                                key={token.id}
                                className="flex items-center justify-between bg-green-50 rounded-lg p-3"
                              >
                                <code className="text-sm font-mono text-green-800">
                                  {token.tokenValue}
                                </code>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToken(token.tokenValue);
                                  }}
                                  className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Copy token"
                                >
                                  <Copy className="w-4 h-4 text-green-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
