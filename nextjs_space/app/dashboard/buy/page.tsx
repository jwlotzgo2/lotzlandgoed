"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Minus, Plus, Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { TOKEN_PRICE } from "@/lib/types";

export default function BuyTokensPage() {
  const router = useRouter();
  const { data: session } = useSession() || {};
  const user = session?.user as any;
  const meters = (user?.meters ?? []) as any[];

  const [selectedMeter, setSelectedMeter] = useState(meters?.[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [cloudStoragePath, setCloudStoragePath] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const totalAmount = quantity * TOKEN_PRICE;

  const handleUploadComplete = (url: string, path: string) => {
    setProofUrl(url);
    setCloudStoragePath(path);
  };

  const handleSubmit = async () => {
    if (!selectedMeter) {
      toast.error("Please select a meter");
      return;
    }
    if (!cloudStoragePath) {
      toast.error("Please upload proof of payment");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meterId: selectedMeter,
          quantity,
          proofUrl,
          cloudStoragePath,
          referenceNumber,
          paymentDate: paymentDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment");
      }

      toast.success("Payment submitted successfully!");
      router.push("/dashboard/history");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (meters.length === 0) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Meters Assigned</h2>
        <p className="text-gray-500">
          Contact your administrator to assign a meter to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buy Tokens</h1>
        <p className="text-gray-500 mt-1">Purchase prepaid electricity tokens</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                step >= s
                  ? "bg-[#1e5631] text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            <span className="ml-2 text-sm text-gray-600 hidden sm:block">
              {s === 1 ? "Select" : s === 2 ? "Upload" : "Confirm"}
            </span>
            {s < 3 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 rounded ${step > s ? "bg-[#1e5631]" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Meter & Quantity */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <div>
            <label className="label">Select Meter</label>
            <select
              value={selectedMeter}
              onChange={(e) => setSelectedMeter(e.target.value)}
              className="input"
            >
              {meters.map((meter: any) => (
                <option key={meter?.id} value={meter?.id}>
                  {meter?.meterNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Number of Tokens</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-3xl font-bold text-gray-900 w-16 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-[#1e5631]/5 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Price per token</p>
                <p className="text-lg font-semibold text-gray-900">
                  R{TOKEN_PRICE.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-[#1e5631]">
                  R{totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full btn-primary py-3">
            Continue
          </button>
        </motion.div>
      )}

      {/* Step 2: Upload Proof */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Payment Amount:</strong> R{totalAmount.toLocaleString()}
            </p>
            <p className="text-sm text-amber-800 mt-1">
              Please make payment to the Lotz Landgoed Trust and upload proof below.
            </p>
          </div>

          <div>
            <label className="label">Reference Number (Optional)</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="input"
              placeholder="Enter payment reference"
            />
          </div>

          <div>
            <label className="label">Payment Date (Optional)</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Proof of Payment</label>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              accept="image/*,application/pdf"
              maxSize={10}
              isPublic={false}
            />
            {cloudStoragePath && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <Check className="w-4 h-4" />
                File uploaded successfully
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 btn-secondary py-3">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!cloudStoragePath}
              className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-lg font-semibold text-gray-900">Confirm Purchase</h2>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Meter Number</span>
              <span className="font-medium">
                {meters.find((m: any) => m?.id === selectedMeter)?.meterNumber}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Quantity</span>
              <span className="font-medium">{quantity} tokens</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-bold text-[#1e5631]">
                R{totalAmount.toLocaleString()}
              </span>
            </div>
            {referenceNumber && (
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Reference</span>
                <span className="font-medium">{referenceNumber}</span>
              </div>
            )}
            <div className="flex justify-between py-3">
              <span className="text-gray-500">Proof of Payment</span>
              <span className="text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Uploaded
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Your payment will be reviewed by an administrator. Once approved, your
              tokens will be available in your account.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 btn-secondary py-3">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Submit Payment
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
