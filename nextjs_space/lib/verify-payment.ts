interface VerificationResult {
  confident: boolean;
  amountMatch: boolean | null;
  referenceMatch: boolean | null;
  dateMatch: boolean | null;
  extractedAmount: number | null;
  extractedReference: string | null;
  extractedDate: string | null;
  reasoning: string;
  autoApprove: boolean;
}

export async function verifyProofOfPayment({
  imageUrl,
  expectedAmount,
  expectedReference,
  expectedDate,
  isPdf = false,
}: {
  imageUrl: string;
  expectedAmount: number;
  expectedReference?: string | null;
  expectedDate?: string | null;
  isPdf?: boolean;
}): Promise<VerificationResult> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const prompt = `You are verifying a proof of payment for a prepaid electricity token purchase.

Expected payment details:
- Amount: R${expectedAmount.toLocaleString()}
- Today's date: ${today}
- Valid payment window: ${sevenDaysAgo} to ${today} (last 7 days)
${expectedReference ? `- Reference number provided by user: ${expectedReference}` : "- No reference number provided"}
${expectedDate ? `- Payment date provided by user: ${expectedDate}` : ""}

Look at this proof of payment image and extract:
1. The total amount paid (in Rands, as a number)
2. Any reference/transaction number visible
3. The payment date (in YYYY-MM-DD format if possible)

Then determine:
- Does the amount match? (allow small rounding differences up to R5)
- Is the payment date within the last 7 days (between ${sevenDaysAgo} and ${today})?
- Does the reference match (if one was provided)?

Respond ONLY with a JSON object in this exact format, no other text:
{
  "extractedAmount": <number or null>,
  "extractedReference": "<string or null>",
  "extractedDate": "<YYYY-MM-DD string or null>",
  "amountMatch": <true/false/null if unclear>,
  "dateMatch": <true if date is within last 7 days, false if older or future, null if date unreadable>,
  "referenceMatch": <true/false/null if no reference to check>,
  "confident": <true if you can clearly read the key payment details, false if image is unclear or unreadable>,
  "reasoning": "<one clear sentence explaining your decision>"
}`;

    // Detect PDF: use passed flag OR sniff from URL/content-type
    const urlLower = imageUrl.toLowerCase();
    const looksLikePdf = isPdf 
      || urlLower.includes(".pdf")
      || urlLower.includes("application/pdf")
      // Cloudinary PDFs stored as raw: no image extension at end of path
      || (urlLower.includes("cloudinary.com") && !/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(urlLower));

    console.log("verify-payment: isPdf =", isPdf, "looksLikePdf =", looksLikePdf, "url =", imageUrl.slice(0, 80));

    // For PDFs, fetch and convert to base64 for Claude's document API
    let contentBlock: any;
    if (looksLikePdf) {
      try {
        // Cloudinary secure_url for PDFs may lack extension - try appending it
        const urlsToTry = [
          imageUrl,
          imageUrl.replace("/image/upload/", "/raw/upload/"),
          imageUrl.replace("/image/upload/", "/raw/upload/") + ".pdf",
          imageUrl + ".pdf",
        ];

        let pdfBuffer: ArrayBuffer | null = null;
        let successUrl = "";

        for (const url of urlsToTry) {
          console.log("Trying PDF URL:", url.slice(0, 120));
          try {
            const res = await fetch(url);
            if (res.ok) {
              const contentType = res.headers.get("content-type") ?? "";
              console.log("Got response, content-type:", contentType);
              pdfBuffer = await res.arrayBuffer();
              successUrl = url;
              break;
            }
            console.log("URL failed with status:", res.status);
          } catch (fetchErr) {
            console.log("URL threw error:", fetchErr);
          }
        }

        if (!pdfBuffer) {
          throw new Error(`All URL attempts failed for: ${imageUrl.slice(0, 80)}`);
        }

        console.log("PDF fetched successfully from:", successUrl.slice(0, 120));
        const base64 = Buffer.from(pdfBuffer).toString("base64");
        contentBlock = {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        };
      } catch (e) {
        console.error("PDF fetch error:", e);
        return failResult(`Could not fetch PDF: ${String(e).slice(0, 150)}`);
      }
    } else {
      contentBlock = {
        type: "image",
        source: { type: "url", url: imageUrl },
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return failResult(`Claude API error: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return failResult("Could not parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Auto-approve only if ALL conditions are met:
    // 1. Confident reading
    // 2. Amount matches
    // 3. Date is within last 7 days (not null, not false)
    // 4. Reference matches (or no reference to check)
    const autoApprove =
      parsed.confident === true &&
      parsed.amountMatch === true &&
      parsed.dateMatch === true &&
      (parsed.referenceMatch === true || parsed.referenceMatch === null);

    return {
      confident: parsed.confident ?? false,
      amountMatch: parsed.amountMatch ?? null,
      referenceMatch: parsed.referenceMatch ?? null,
      dateMatch: parsed.dateMatch ?? null,
      extractedAmount: parsed.extractedAmount ?? null,
      extractedReference: parsed.extractedReference ?? null,
      extractedDate: parsed.extractedDate ?? null,
      reasoning: parsed.reasoning ?? "No reasoning provided",
      autoApprove,
    };
  } catch (error) {
    console.error("Proof verification error:", error);
    return failResult("Verification failed due to an error");
  }
}

function failResult(reasoning: string): VerificationResult {
  return {
    confident: false,
    amountMatch: null,
    referenceMatch: null,
    dateMatch: null,
    extractedAmount: null,
    extractedReference: null,
    extractedDate: null,
    reasoning,
    autoApprove: false,
  };
}
