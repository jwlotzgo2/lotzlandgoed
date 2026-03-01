export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { phone, email, password, name, meterNumber, role } = await request.json();
    
    // Only admins can create users (except for initial setup)
    const userCount = await prisma.user.count();
    
    // Check if user already exists - return success for existing users with matching credentials
    if (email) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingByEmail) {
        return NextResponse.json({
          id: existingByEmail.id,
          phone: existingByEmail.phone,
          email: existingByEmail.email,
          name: existingByEmail.name,
          role: existingByEmail.role,
        });
      }
    }
    
    if (userCount > 0 && (!session || (session.user as any)?.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can create users." },
        { status: 403 }
      );
    }

    if (!password || !name || (!phone && !email)) {
      return NextResponse.json(
        { error: "Password, name, and phone or email are required" },
        { status: 400 }
      );
    }

    // Use phone or email as identifier
    const phoneValue = phone || email;

    // Check for existing user by phone
    if (phone) {
      const existingByPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingByPhone) {
        // Return existing user if found
        return NextResponse.json({
          id: existingByPhone.id,
          phone: existingByPhone.phone,
          email: existingByPhone.email,
          name: existingByPhone.name,
          role: existingByPhone.role,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine role - first user is always admin
    const assignedRole = userCount === 0 ? "ADMIN" : (role || "USER");

    const user = await prisma.user.create({
      data: {
        phone: phoneValue,
        email: email || null,
        password: hashedPassword,
        name,
        role: assignedRole,
        mustChangePassword: false,
      },
    });

    // If meter number provided, create or link meter
    if (meterNumber) {
      let meter = await prisma.meter.findUnique({
        where: { meterNumber },
      });

      if (!meter) {
        meter = await prisma.meter.create({
          data: {
            meterNumber,
            userId: user.id,
          },
        });
      } else {
        await prisma.meter.update({
          where: { id: meter.id },
          data: { userId: user.id },
        });
      }
    }

    return NextResponse.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
