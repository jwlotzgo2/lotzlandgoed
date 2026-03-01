"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LogOut, User, Settings } from "lucide-react";

export function Header() {
  const { data: session } = useSession() || {};
  const pathname = usePathname();
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">
              Lotz Landgoed
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {isAdmin ? (
              <>
                <NavLink href="/admin" active={pathname === "/admin"}>Dashboard</NavLink>
                <NavLink href="/admin/payments" active={pathname === "/admin/payments"}>Payments</NavLink>
                <NavLink href="/admin/tokens" active={pathname === "/admin/tokens"}>Tokens</NavLink>
                <NavLink href="/admin/users" active={pathname === "/admin/users"}>Users</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/dashboard" active={pathname === "/dashboard"}>Home</NavLink>
                <NavLink href="/dashboard/buy" active={pathname === "/dashboard/buy"}>Buy Tokens</NavLink>
                <NavLink href="/dashboard/history" active={pathname === "/dashboard/history"}>History</NavLink>
              </>
            )}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-green-50 text-green-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}
