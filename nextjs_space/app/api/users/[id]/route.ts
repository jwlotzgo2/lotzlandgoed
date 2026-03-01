export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    // Users can only view themselves, admins can view anyone
    if (userRole !== "ADMIN" && userId !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { meters: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;
    const body = await request.json();

    // Users can only update their own password
    if (userRole !== "ADMIN" && userId !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {};

    // Regular users can only change password
    if (userRole !== "ADMIN") {
      if (body.password) {
        updateData.password = await bcrypt.hash(body.password, 10);
        updateData.mustChangePassword = false;
      }
    } else {
      // Admins can update everything
      if (body.name) updateData.name = body.name;
      if (body.phone) updateData.phone = body.phone;
      if (body.password) updateData.password = await bcrypt.hash(body.password, 10);
      if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
      if (body.role) updateData.role = body.role;
      if (typeof body.mustChangePassword === "boolean")
        updateData.mustChangePassword = body.mustChangePassword;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: { meters: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Soft delete - just disable the user
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
