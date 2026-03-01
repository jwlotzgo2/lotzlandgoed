export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const isPdfFile = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder: "lotz-landgoed",
      resource_type: "auto",
      access_control: [{ access_type: "anonymous" }],
    });

    console.log("Cloudinary upload result:", {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
    });

    // For AI scanning: since Cloudinary access may be restricted,
    // return the raw base64 of the file so the payments route can send it directly to Claude
    const fileBase64 = buffer.toString("base64");
    const fileMimeType = isPdfFile ? "application/pdf" : file.type;

    return NextResponse.json({
      fileUrl: result.secure_url,
      cloudStoragePath: result.public_id,
      url: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      fileBase64,
      fileMimeType,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
