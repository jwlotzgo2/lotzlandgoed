"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/ui/header";
import { PageLoading } from "@/components/ui/loading";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const user = session?.user as any;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [status, router, user]);

  if (status === "loading" || !session || user?.role !== "ADMIN") {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
