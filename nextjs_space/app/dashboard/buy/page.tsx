"use client";

import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Zap, Minus, Plus, Loader2, Check, AlertCircle, ChevronRight } from "lucide-react";
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
  const [proofIsPdf, setProofIsPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const fileBase64Ref = useRef("");
  const fileMimeTypeRef = useRef("");

  const totalAmount = quantity * TOKEN_PRICE;

  const handleUploadComplete = (url: string, path: string, isPdf: boolean, b64?: string, mimeType?: string) => {
    setProofUrl(url);
    setCloudStoragePath(path);
    setProofIsPdf(isPdf);
    fileBase64Ref.current = b64 || "";
    fileMimeTypeRef.current = mimeType || "";
  };

  const handleSubmit = async () => {
    if (!selectedMeter) { toast.error("Please select a meter"); return; }
    if (!cloudStoragePath) { toast.error("Please upload proof of payment"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meterId: selectedMeter, quantity, proofUrl, cloudStoragePath,
          referenceNumber, paymentDate: paymentDate || null, proofIsPdf,
          fileBase64: fileBase64Ref.current, fileMimeType: fileMimeTypeRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit payment");
      toast.success("Payment submitted!");
      router.push("/dashboard/history");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (meters.length === 0) {
    return (
      <div className="card text-center py-12 max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Meters Assigned</h2>
        <p className="text-gray-500">Contact your administrator to assign a meter to your account.</p>
      </div>
    );
  }

  const stepLabels = ["Select", "Upload", "Confirm"];

  return (
    <div className="max-w-lg mx-auto px-0 sm:px-4 space-y-5">
      {/* Header */}
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900">Buy Tokens</h1>
        <p className="text-gray-500 mt-1 text-sm">Purchase prepaid electricity tokens</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center px-4 sm:px-0">
        {stepLabels.map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                  step > s ? "bg-[#1e5631] text-white" : step === s ? "bg-[#1e5631] text-white ring-4 ring-[#1e5631]/20" : "bg-gray-200 text-gray-500"
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs mt-1 font-medium ${step >= s ? "text-[#1e5631]" : "text-gray-400"}`}>{label}</span>
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${step > s ? "bg-[#1e5631]" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card mx-4 sm:mx-0 space-y-5">
          {/* Meter select */}
          <div>
            <label className="label">Meter</label>
            {meters.length === 1 ? (
              <div className="input bg-gray-50 text-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1e5631]" />
                {meters[0].meterNumber}
              </div>
            ) : (
              <select value={selectedMeter} onChange={(e) => setSelectedMeter(e.target.value)} className="input">
                {meters.map((m: any) => <option key={m.id} value={m.id}>{m.meterNumber}</option>)}
              </select>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="label">Number of Tokens</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors touch-manipulation">
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-4xl font-bold text-gray-900 flex-1 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-xl bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors touch-manipulation">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Amount summary */}
          <div className="bg-[#1e5631] rounded-xl p-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/70 text-sm">R{TOKEN_PRICE.toLocaleString()} × {quantity}</p>
                <p className="text-white/70 text-xs mt-0.5">per token</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-sm">Total</p>
                <p className="text-3xl font-bold">R{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base">
            Continue <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card mx-4 sm:mx-0 space-y-5">
          {/* Bank info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-900 mb-1">Make payment of R{totalAmount.toLocaleString()}</p>
            <p className="text-sm text-amber-800">Transfer to Lotz Landgoed Trust and upload your proof below.</p>
          </div>

          <div>
            <label className="label">Payment Reference <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
              className="input" placeholder="e.g. Electric Jw Lotz" />
          </div>

          <div>
            <label className="label">Payment Date <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Proof of Payment</label>
            <FileUpload onUploadComplete={handleUploadComplete} accept="image/*,application/pdf" maxSize={10} isPublic={false} />
            {cloudStoragePath && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> File uploaded successfully
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 btn-secondary py-3.5">Back</button>
            <button onClick={() => setStep(3)} disabled={!cloudStoragePath}
              className="flex-1 btn-primary py-3.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card mx-4 sm:mx-0 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Purchase</h2>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
            {[
              { label: "Meter", value: meters.find((m: any) => m.id === selectedMeter)?.meterNumber },
              { label: "Tokens", value: `${quantity} token${quantity > 1 ? "s" : ""}` },
              { label: "Amount", value: `R${totalAmount.toLocaleString()}`, bold: true, green: true },
              referenceNumber ? { label: "Reference", value: referenceNumber } : null,
              paymentDate ? { label: "Payment Date", value: new Date(paymentDate).toLocaleDateString("en-ZA") } : null,
              { label: "Proof", value: "✓ Uploaded", green: true },
            ].filter(Boolean).map((row: any) => (
              <div key={row.label} className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-gray-500 text-sm">{row.label}</span>
                <span className={`text-sm ${row.bold ? "font-bold text-lg" : "font-medium"} ${row.green ? "text-[#1e5631]" : "text-gray-900"}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-800">Your payment will be AI-verified automatically. If verified, tokens are released immediately.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 btn-secondary py-3.5">Back</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 text-base">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Zap className="w-5 h-5" /> Submit</>}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
