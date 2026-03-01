"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Lock, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { PageLoading } from "@/components/ui/loading";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession() || {};
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const user = session?.user as any;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <PageLoading />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      
      // Update session to reflect the change
      await update?.({ mustChangePassword: false });

      // Redirect based on role
      if (user?.role === "ADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e5631] to-[#2d7a47] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-[#1e5631] rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-10 h-10 text-[#d4a017]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
          </div>

          {user?.mustChangePassword && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                You must change your password before continuing.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pl-11"
                  placeholder="Enter current password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pl-11"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-11"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </button>
          </form>

          {!user?.mustChangePassword && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full mt-4 btn-secondary"
            >
              Cancel & Sign Out
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
