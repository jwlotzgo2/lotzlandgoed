"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Smartphone, Bell, Chrome, Share, Plus, MoreVertical, CheckCircle, Download } from "lucide-react";
import { Header } from "@/components/ui/header";

type Platform = "ios" | "android" | "desktop" | "unknown";
type NotifState = "default" | "granted" | "denied" | "unsupported";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (typeof window !== "undefined" && window.innerWidth > 768) return "desktop";
  return "unknown";
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function Step({ num, icon, title, detail }: {
  num: number;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: num * 0.08 }}
      className="flex gap-4 items-start"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1e5631] text-white flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div className="flex-1 pb-5 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#1e5631]">{icon}</span>
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{detail}</p>
      </div>
    </motion.div>
  );
}

export default function InstallGuidePage() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notifStatus, setNotifStatus] = useState<NotifState>("default");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isInstalled());

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if ("Notification" in window) {
      setNotifStatus(Notification.permission as NotifState);
    } else {
      setNotifStatus("unsupported");
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifStatus(result as NotifState);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="card text-center py-8">
          <div className="w-16 h-16 bg-[#1e5631] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Install the App</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Add Lotz Tokens to your home screen for instant access — no app store needed.
          </p>
          {installed && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Already installed
            </div>
          )}
        </div>

        {/* Android — native install prompt */}
        {platform === "android" && deferredPrompt && !installed && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div className="flex items-center gap-3 mb-4">
              <Chrome className="w-5 h-5 text-[#1e5631]" />
              <h2 className="font-semibold text-gray-900">Install Now</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Tap below to install directly — no steps needed.</p>
            <button onClick={handleAndroidInstall} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Add to Home Screen
            </button>
          </motion.div>
        )}

        {/* iOS instructions */}
        {(platform === "ios" || platform === "unknown") && !installed && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Share className="w-4 h-4 text-gray-700" />
              </div>
              <h2 className="font-semibold text-gray-900">iPhone / iPad</h2>
            </div>
            <div className="space-y-0">
              <Step num={1} icon={<Chrome className="w-4 h-4" />}
                title="Open in Safari"
                detail="This only works in Safari. If you're using Chrome or another browser, copy the URL and open it in Safari." />
              <Step num={2} icon={<Share className="w-4 h-4" />}
                title="Tap the Share button"
                detail="Tap the Share icon at the bottom of Safari — the box with an arrow pointing up." />
              <Step num={3} icon={<Plus className="w-4 h-4" />}
                title='Tap "Add to Home Screen"'
                detail='Scroll down in the share sheet and tap "Add to Home Screen". You can rename it or keep the default.' />
              <Step num={4} icon={<CheckCircle className="w-4 h-4" />}
                title='Tap "Add"'
                detail="Tap Add in the top right. The Lotz Tokens icon will appear on your home screen immediately." />
            </div>
          </div>
        )}

        {/* Android manual (no prompt available) */}
        {platform === "android" && !deferredPrompt && !installed && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Chrome className="w-4 h-4 text-gray-700" />
              </div>
              <h2 className="font-semibold text-gray-900">Android (Chrome)</h2>
            </div>
            <div className="space-y-0">
              <Step num={1} icon={<MoreVertical className="w-4 h-4" />}
                title="Tap the menu"
                detail="Tap the three-dot menu icon in the top right corner of Chrome." />
              <Step num={2} icon={<Plus className="w-4 h-4" />}
                title="Add to Home screen"
                detail='Tap "Add to Home screen" or "Install app" from the menu.' />
              <Step num={3} icon={<CheckCircle className="w-4 h-4" />}
                title="Confirm"
                detail='Tap "Add". The app icon will appear on your home screen.' />
            </div>
          </div>
        )}

        {/* Desktop */}
        {platform === "desktop" && !installed && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Chrome className="w-4 h-4 text-gray-700" />
              </div>
              <h2 className="font-semibold text-gray-900">Desktop (Chrome / Edge)</h2>
            </div>
            <div className="space-y-0">
              <Step num={1} icon={<Download className="w-4 h-4" />}
                title="Look for the install icon"
                detail="In Chrome or Edge, look for the install icon in the address bar on the right side — a screen with a down arrow." />
              <Step num={2} icon={<CheckCircle className="w-4 h-4" />}
                title="Click Install"
                detail='Click the icon then "Install" in the dialog. The app opens as its own window.' />
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#1e5631]/10 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#1e5631]" />
            </div>
            <h2 className="font-semibold text-gray-900">Enable Notifications</h2>
          </div>

          {notifStatus === "unsupported" && (
            <p className="text-sm text-gray-500">Notifications are not supported in this browser. Install the app first for the best experience.</p>
          )}

          {notifStatus === "granted" && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Notifications enabled. You will be alerted when tokens are issued.</p>
            </div>
          )}

          {notifStatus === "denied" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Notifications are blocked. To re-enable:</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                <p><strong>iOS:</strong> Settings → Safari → lotzlandgoed.vercel.app → Notifications → Allow</p>
                <p><strong>Android:</strong> Settings → Apps → Chrome → Notifications → Allow</p>
              </div>
            </div>
          )}

          {notifStatus === "default" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 leading-relaxed">
                Get notified the moment your payment is verified and tokens are ready. No spam — only payment events.
              </p>
              <button onClick={requestNotifications} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                <Bell className="w-5 h-5" />
                Allow Notifications
              </button>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="card bg-[#1e5631] border-0">
          <h3 className="font-semibold text-white mb-3">Why install?</h3>
          <div className="space-y-2">
            {[
              "Opens instantly from your home screen",
              "Full screen — no browser address bar",
              "Faster load on repeat visits",
              "Notifications when tokens are issued",
              "Works on Android, iPhone and desktop",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white/70 flex-shrink-0" />
                <p className="text-sm text-white/90">{item}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
