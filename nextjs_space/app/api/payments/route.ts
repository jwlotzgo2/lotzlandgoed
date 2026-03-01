export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { TOKEN_PRICE } from "@/lib/types";
import { notifyAdmins, createNotification } from "@/lib/notifications";
import { verifyProofOfPayment } from "@/lib/verify-payment";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (userRole !== "ADMIN") where.userId = userId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        meter: { select: { meterNumber: true } },
        tokens: { select: { id: true, tokenValue: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = (session.user as any)?.id;
    const { meterId, quantity, proofUrl, cloudStoragePath, referenceNumber, paymentDate, proofIsPdf, aiScanUrl, fileBase64, fileMimeType } =
      await request.json();

    if (!meterId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Meter and quantity are required" }, { status: 400 });
    }

    const meter = await prisma.meter.findFirst({ where: { id: meterId, userId } });
    if (!meter) {
      return NextResponse.json({ error: "Meter not found or not assigned to you" }, { status: 400 });
    }

    const expectedAmount = quantity * TOKEN_PRICE;

    // Create payment as PENDING initially
    const payment = await prisma.payment.create({
      data: {
        userId,
        meterId,
        quantity,
        totalAmount: expectedAmount,
        proofUrl,
        cloudStoragePath,
        referenceNumber,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        status: "PENDING",
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true },
    });
    const meterInfo = await prisma.meter.findUnique({
      where: { id: meterId },
      select: { meterNumber: true },
    });

    // Use aiScanUrl for AI (PDF converted to image), fall back to proofUrl
    const imageUrl = aiScanUrl || proofUrl || null;
    console.log("payments POST: fileBase64 length =", fileBase64?.length ?? 0, "fileMimeType =", fileMimeType, "imageUrl =", imageUrl?.slice(0, 80));

    // Run AI verification if we have an image
    if (imageUrl) {
      try {
        const verification = await verifyProofOfPayment({
          imageUrl,
          expectedAmount,
          expectedReference: referenceNumber,
          expectedDate: paymentDate,
          fileBase64,
          fileMimeType,
        });

        console.log("AI verification result:", verification);

        if (verification.autoApprove) {
          // Auto-approve: find and assign available tokens
          const availableTokens = await prisma.token.findMany({
            where: { meterId, status: "AVAILABLE" },
            take: quantity,
          });

          if (availableTokens.length >= quantity) {
            // Update payment to approved with AI fields
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "APPROVED",
                verifiedAt: new Date(),
                aiVerified: true,
                aiAutoApproved: true,
                aiConfident: verification.confident,
                aiExtractedAmount: verification.extractedAmount,
                aiExtractedRef: verification.extractedReference,
                aiExtractedDate: verification.extractedDate,
                aiAmountMatch: verification.amountMatch,
                aiReferenceMatch: verification.referenceMatch,
                aiDateMatch: verification.dateMatch,
                aiReasoning: verification.reasoning,
              },
            });

            await prisma.token.updateMany({
              where: { id: { in: availableTokens.map((t) => t.id) } },
              data: { status: "USED", paymentId: payment.id },
            });

            // Notify user of auto-approval
            await createNotification({
              userId,
              title: "✅ Payment Auto-Approved!",
              message: `Your payment of R${expectedAmount.toLocaleString()} for meter ${meterInfo?.meterNumber} was automatically verified and ${quantity} token(s) have been released.`,
              type: "SUCCESS",
              link: "/dashboard/history",
            });

            // Notify admins
            await notifyAdmins({
              title: "Payment Auto-Approved",
              message: `${user?.name}'s payment of R${expectedAmount.toLocaleString()} for meter ${meterInfo?.meterNumber} was auto-approved by AI. Reason: ${verification.reasoning}`,
              type: "SUCCESS",
              link: "/admin/payments",
            });

            return NextResponse.json({ ...payment, status: "APPROVED", autoApproved: true });
          } else {
            // Not enough tokens available — approve payment but flag it
            await notifyAdmins({
              title: "⚠️ Payment Verified — Not Enough Tokens",
              message: `${user?.name}'s payment was AI-verified but only ${availableTokens.length} of ${quantity} token(s) are available for meter ${meterInfo?.meterNumber}. Please upload more tokens.`,
              type: "WARNING",
              link: "/admin/payments",
            });
          }
        } else {
          // AI could not auto-approve — save results and send to manual review
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              aiVerified: true,
              aiAutoApproved: false,
              aiConfident: verification.confident,
              aiExtractedAmount: verification.extractedAmount,
              aiExtractedRef: verification.extractedReference,
              aiExtractedDate: verification.extractedDate,
              aiAmountMatch: verification.amountMatch,
              aiReferenceMatch: verification.referenceMatch,
              aiDateMatch: verification.dateMatch,
              aiReasoning: verification.reasoning,
            },
          });
          await notifyAdmins({
            title: "🔍 Payment Needs Manual Review",
            message: `${user?.name} submitted R${expectedAmount.toLocaleString()} for meter ${meterInfo?.meterNumber}. AI verdict: ${verification.reasoning} (Amount: ${verification.amountMatch ? "✓" : "✗"}, Date: ${verification.dateMatch ? "✓" : verification.dateMatch === null ? "?" : "✗"}, Ref: ${verification.referenceMatch ? "✓" : verification.referenceMatch === null ? "N/A" : "✗"})`,
            type: "WARNING",
            link: "/admin/payments",
          });
        }
      } catch (aiError) {
        console.error("AI verification failed:", aiError);
        // Fall through to manual review notification
        await notifyAdmins({
          title: "New Payment Submitted",
          message: `${user?.name} (${user?.phone}) submitted payment for ${quantity} token(s) on meter ${meterInfo?.meterNumber}. Amount: R${expectedAmount.toLocaleString()}. AI verification unavailable.`,
          type: "INFO",
          link: "/admin/payments",
        });
      }
    } else {
      // No image — notify admin for manual review
      await notifyAdmins({
        title: "New Payment Submitted (No Image)",
        message: `${user?.name} (${user?.phone}) submitted payment for ${quantity} token(s) on meter ${meterInfo?.meterNumber}. Amount: R${expectedAmount.toLocaleString()}. No proof image uploaded.`,
        type: "INFO",
        link: "/admin/payments",
      });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
