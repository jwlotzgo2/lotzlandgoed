import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.phone || credentials?.email;
        if (!identifier || !credentials?.password) {
          return null;
        }

        // Try to find user by phone first
        let user = await prisma.user.findUnique({
          where: { phone: identifier },
          include: { meters: true },
        });

        // If not found by phone, try finding by email
        if (!user) {
          user = await prisma.user.findUnique({
            where: { email: identifier },
            include: { meters: true },
          });
        }

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          meters: user.meters,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.meters = (user as any).meters;
      }
      if (trigger === "update" && session) {
        token.mustChangePassword = session.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).phone = token.phone;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).meters = token.meters;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
