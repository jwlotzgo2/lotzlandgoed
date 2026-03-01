"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoading } from "@/components/ui/loading";

export default function HomePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const user = session?.user as any;

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login");
    } else if (user?.mustChangePassword) {
      router.replace("/change-password");
    } else if (user?.role === "ADMIN") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }
  }, [session, status, router, user]);

  return <PageLoading />;
}
