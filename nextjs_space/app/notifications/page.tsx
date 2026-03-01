"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loading } from "@/components/ui/loading";
import { Header } from "@/components/ui/header";
import { PageLoading } from "@/components/ui/loading";
import { useSession } from "next-auth/react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const typeConfig = {
  SUCCESS: {
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-200",
    iconColor: "text-green-600",
    badge: "bg-green-100 text-green-700",
  },
  ERROR: {
    icon: AlertCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  WARNING: {
    icon: AlertTriangle,
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    iconColor: "text-yellow-600",
    badge: "bg-yellow-100 text-yellow-700",
  },
  INFO: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
};

export default function NotificationsPage() {
  const { status } = useSession() || {};
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (status === "loading") return <PageLoading />;

  const filtered = filter === "UNREAD"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["ALL", "UNREAD"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "ALL" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === "UNREAD" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            You'll see alerts here when payments are submitted or processed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification, index) => {
            const config = typeConfig[notification.type] ?? typeConfig.INFO;
            const Icon = config.icon;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`relative rounded-xl border p-4 transition-all ${
                  !notification.isRead
                    ? `${config.bg} ${config.border}`
                    : "bg-white border-gray-100"
                }`}
              >
                {!notification.isRead && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                )}
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${config.badge}`}>
                        {notification.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString("en-ZA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-xs text-green-600 hover:underline font-medium"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </main>
    </div>
  );
}
