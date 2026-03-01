export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        meters: true,
        _count: {
          select: { payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { phone, name, password, meterNumber, role } = await request.json();

    if (!phone || !name || !password) {
      return NextResponse.json(
        { error: "Phone, name, and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this phone already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        phone,
        name,
        password: hashedPassword,
        role: role || "USER",
        mustChangePassword: true,
      },
    });

    if (meterNumber) {
      let meter = await prisma.meter.findUnique({ where: { meterNumber } });
      if (!meter) {
        meter = await prisma.meter.create({
          data: { meterNumber, userId: user.id },
        });
      } else if (!meter.userId) {
        await prisma.meter.update({
          where: { id: meter.id },
          data: { userId: user.id },
        });
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
