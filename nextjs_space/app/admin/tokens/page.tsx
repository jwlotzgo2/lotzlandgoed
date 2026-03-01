"use client";

import { useEffect, useState } from "react";
import { Plus, Upload, FileSpreadsheet, Link as LinkIcon, Trash2, Loader2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Loading } from "@/components/ui/loading";
import { FileUpload } from "@/components/ui/file-upload";

interface TokenSheet {
  id: string;
  name: string;
  uploadType: string;
  isParsed: boolean;
  createdAt: string;
  _count: { tokens: number };
}

interface Meter {
  id: string;
  meterNumber: string;
  user: { name: string; phone: string } | null;
}

export default function TokensPage() {
  const [tokenSheets, setTokenSheets] = useState<TokenSheet[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<TokenSheet | null>(null);
  const [selectedMeter, setSelectedMeter] = useState("");
  const [sheetTokens, setSheetTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Upload form state
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<"csv" | "image">("csv");
  const [csvTokens, setCsvTokens] = useState("");
  const [cloudStoragePath, setCloudStoragePath] = useState("");
  const [linkMeterId, setLinkMeterId] = useState("");

  const fetchData = async () => {
    try {
      const [sheetsRes, metersRes] = await Promise.all([
        fetch("/api/token-sheets"),
        fetch("/api/meters"),
      ]);
      const sheets = await sheetsRes.json();
      const metersData = await metersRes.json();
      setTokenSheets(sheets ?? []);
      setMeters(metersData ?? []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadComplete = (path: string) => {
    setCloudStoragePath(path);
  };

  const parseCSVTokens = (text: string): string[] => {
    // Parse CSV or newline-separated tokens
    const lines = text.split(/[\n,]/).map((t) => t.trim()).filter((t) => t.length > 0);
    return lines;
  };

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let tokens: string[] = [];

      if (uploadType === "csv" && csvTokens) {
        tokens = parseCSVTokens(csvTokens);
        if (tokens.length === 0) {
          throw new Error("No valid tokens found in CSV");
        }
      }

      const res = await fetch("/api/token-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName,
          uploadType,
          cloudStoragePath: uploadType === "image" ? cloudStoragePath : null,
          tokens: uploadType === "csv" ? tokens : [],
          meterId: linkMeterId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to create token sheet");
      }

      toast.success(
        `Token sheet created${
          uploadType === "csv" ? ` with ${tokens.length} tokens` : ""
        }`
      );
      setShowUploadModal(false);
      resetUploadForm();
      fetchData();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to create token sheet");
    } finally {
      setSubmitting(false);
    }
  };

  const resetUploadForm = () => {
    setUploadName("");
    setUploadType("csv");
    setCsvTokens("");
    setCloudStoragePath("");
    setLinkMeterId("");
  };

  const handleViewTokens = async (sheet: TokenSheet) => {
    setSelectedSheet(sheet);
    setShowTokensModal(true);
    setLoadingTokens(true);
    try {
      const res = await fetch(`/api/tokens?tokenSheetId=${sheet.id}`);
      const data = await res.json();
      setSheetTokens(data ?? []);
    } catch {
      toast.error("Failed to load tokens");
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleLinkMeter = async () => {
    if (!selectedSheet || !selectedMeter) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/token-sheets/${selectedSheet.id}/link-meter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meterId: selectedMeter }),
      });

      if (!res.ok) throw new Error("Failed to link meter");

      toast.success("Tokens linked to meter successfully");
      setShowLinkModal(false);
      setSelectedSheet(null);
      setSelectedMeter("");
      fetchData();
    } catch (error) {
      toast.error("Failed to link meter");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSheet = async (sheet: TokenSheet) => {
    if (!confirm("Are you sure you want to delete this token sheet?")) return;

    try {
      const res = await fetch(`/api/token-sheets/${sheet.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to delete");
      }

      toast.success("Token sheet deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to delete token sheet");
    }
  };

  if (loading) {
    return <Loading text="Loading token sheets..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Sheets</h1>
          <p className="text-gray-500 mt-1">Upload and manage electricity tokens</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Upload Tokens
        </button>
      </div>

      {/* Token Sheets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokenSheets.map((sheet, index) => (
          <motion.div
            key={sheet.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1e5631]/10 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#1e5631]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{sheet.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(sheet.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sheet.uploadType === "csv"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {sheet.uploadType?.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Tokens</span>
                <span className="font-medium">{sheet._count?.tokens ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span
                  className={`font-medium ${
                    sheet.isParsed ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {sheet.isParsed ? "Parsed" : "Pending"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleViewTokens(sheet)}
                className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1"
              >
                <Eye className="w-4 h-4" />
                View Tokens
              </button>
              <button
                onClick={() => {
                  setSelectedSheet(sheet);
                  setShowLinkModal(true);
                }}
                className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1"
              >
                <LinkIcon className="w-4 h-4" />
                Link Meter
              </button>
              <button
                onClick={() => handleDeleteSheet(sheet)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete sheet"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {tokenSheets.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No token sheets uploaded yet. Click &quot;Upload Tokens&quot; to get started.
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Token Sheet</h2>
              <form onSubmit={handleCreateSheet} className="space-y-4">
                <div>
                  <label className="label">Sheet Name</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="input"
                    placeholder="e.g., January 2026 Tokens"
                    required
                  />
                </div>

                <div>
                  <label className="label">Upload Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="csv"
                        checked={uploadType === "csv"}
                        onChange={() => setUploadType("csv")}
                        className="accent-[#1e5631]"
                      />
                      <span>CSV / Text</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="image"
                        checked={uploadType === "image"}
                        onChange={() => setUploadType("image")}
                        className="accent-[#1e5631]"
                      />
                      <span>Image</span>
                    </label>
                  </div>
                </div>

                {uploadType === "csv" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="label">Upload CSV File</label>
                      <FileUpload
                        onUploadComplete={() => {}}
                        onCSVParsed={(tokens) => setCsvTokens(tokens.join("\n"))}
                        accept=".csv,text/csv"
                        mode="csv"
                      />
                    </div>
                    <div>
                      <label className="label">Or paste tokens manually (one per line)</label>
                      <textarea
                        value={csvTokens}
                        onChange={(e) => setCsvTokens(e.target.value)}
                        className="input min-h-[120px] font-mono text-sm"
                        placeholder="12345678901234567890&#10;98765432109876543210&#10;..."
                      />
                    </div>
                    {csvTokens && (
                      <p className="text-sm text-green-600 font-medium">
                        ✓ {parseCSVTokens(csvTokens).length} tokens ready
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="label">Upload Token Sheet Image</label>
                    <FileUpload
                      onUploadComplete={handleUploadComplete}
                      accept="image/*"
                      maxSize={10}
                      isPublic={false}
                    />
                    <p className="text-sm text-amber-600 mt-2">
                      Note: Image uploads require manual token entry.
                    </p>
                  </div>
                )}

                <div>
                  <label className="label">Link to Meter (Optional)</label>
                  <select
                    value={linkMeterId}
                    onChange={(e) => setLinkMeterId(e.target.value)}
                    className="input"
                  >
                    <option value="">Select a meter...</option>
                    {meters.map((meter) => (
                      <option key={meter.id} value={meter.id}>
                        {meter.meterNumber}
                        {meter.user ? ` (${meter.user.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Sheet"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Meter Modal */}
      <AnimatePresence>
        {showLinkModal && selectedSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowLinkModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Link Tokens to Meter</h2>
              <p className="text-gray-600 mb-4">
                Link available tokens from &quot;{selectedSheet.name}&quot; to a meter.
              </p>

              <div className="mb-6">
                <label className="label">Select Meter</label>
                <select
                  value={selectedMeter}
                  onChange={(e) => setSelectedMeter(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a meter...</option>
                  {meters.map((meter) => (
                    <option key={meter.id} value={meter.id}>
                      {meter.meterNumber}
                      {meter.user ? ` (${meter.user.name})` : " (Unassigned)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setSelectedSheet(null);
                    setSelectedMeter("");
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkMeter}
                  disabled={!selectedMeter || submitting}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    "Link Tokens"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* View Tokens Modal */}
      <AnimatePresence>
        {showTokensModal && selectedSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowTokensModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Tokens — {selectedSheet.name}
                </h2>
                <button
                  onClick={() => setShowTokensModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {loadingTokens ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : sheetTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No tokens found</p>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Token Value</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Meter</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Used By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sheetTokens.map((token: any, i: number) => (
                        <tr key={token.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono font-medium text-gray-900">
                            {token.tokenValue}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {token.meter?.meterNumber ?? <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              token.status === "AVAILABLE"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {token.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-xs">
                            {token.payment ? (
                              <span>{token.payment.user?.name} ({token.payment.user?.phone})</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                <span>{sheetTokens.length} tokens total</span>
                <span>{sheetTokens.filter((t: any) => t.status === "AVAILABLE").length} available</span>
                <span>{sheetTokens.filter((t: any) => t.status === "USED").length} used</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
