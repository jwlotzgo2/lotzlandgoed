import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const pathname = req.nextUrl.pathname;

    // Redirect to change password if needed
    if (token?.mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    // Admin routes protection
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Allow login page
        if (pathname === "/login") {
          return true;
        }
        
        // Require auth for all other protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin/:path*",
    "/change-password",
    "/login",
  ],
};
