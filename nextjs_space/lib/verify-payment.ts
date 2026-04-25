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
  userName,
  meterNumber,
  fileBase64,
  fileMimeType,
}: {
  imageUrl: string;
  expectedAmount: number;
  expectedReference?: string | null;
  expectedDate?: string | null;
  userName?: string | null;
  meterNumber?: string | null;
  fileBase64?: string;
  fileMimeType?: string;
}): Promise<VerificationResult> {
  try {
    // South Africa is UTC+2 — shift all date calculations to SAST
    // so a payment at 11pm SA time isn't treated as the previous day
    const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
    const nowSAST = new Date(Date.now() + SAST_OFFSET_MS);
    const today = nowSAST.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() + SAST_OFFSET_MS - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Pre-compute name variants so the prompt can show concrete, user-specific examples
    const nameParts = userName?.trim().split(/\s+/) ?? [];
    const firstName = nameParts[0] ?? "";
    const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    const initial = firstName[0]?.toUpperCase() ?? "";
    const initialSurnameExample = surname ? `${initial} ${surname.toUpperCase()}` : "";
    const surnameInitialExample = surname ? `${surname.toUpperCase()} ${initial}` : "";

    const prompt = `You are verifying a proof of payment for a prepaid electricity token purchase in South Africa. Documents may be in English or Afrikaans.

Expected payment details:
- Amount: R${expectedAmount.toLocaleString()}
- Today's date: ${today}
- Valid payment window: ${sevenDaysAgo} to ${today} (last 7 days, dates in South African time SAST/UTC+2)
${expectedDate ? `- Payment date provided by user: ${expectedDate}` : ""}

Extract the following fields. The document may use Afrikaans labels:

AMOUNT — look for:
  English: "Amount", "Total", "Amount paid"
  Afrikaans: "Bedrag", "Vir die bedrag van", "Totaal"
  Format: may appear as "1 600.00" or "R1600" — extract as a number (1600)

DATE — look for:
  English: "Payment date", "Date", "Transaction date"
  Afrikaans: "Datum van betaling", "Betalingsdatum", "Datum"
  Format: convert to YYYY-MM-DD

REFERENCE — look for ALL reference-like fields and report whichever is most informative:
  English: "Reference", "Transaction number", "Your reference", "Beneficiary reference", "Payee", "Recipient"
  Afrikaans: "Verwysing", "Transaksienommer", "Verwysing op begunstigde se staat", "Jou verwysing"

Then determine:
- Does the amount match R${expectedAmount.toLocaleString()}? (allow up to R5 difference)
- Is the payment date within the last 7 days (between ${sevenDaysAgo} and ${today})?
- For referenceMatch: scan ALL reference-bearing fields on the document (transaction number, beneficiary reference, payee/recipient name, "your reference"). Set referenceMatch = true if ANY of those fields contains ANY ONE of the following valid identifiers. The user only needs to prove this payment belongs to this meter — any single identifier is enough.

VALID IDENTIFIERS for this payment (any one of these in any reference field = MATCH):
${meterNumber ? `  • Meter number "${meterNumber}" — this is the canonical payment identifier; if the document reference contains this number anywhere, it is a match regardless of what the user typed.` : ""}
${userName ? `  • Account holder name "${userName}" — accept ANY of these reasonable variants (case-insensitive):
      - the full name "${userName}"
      - the first name "${firstName}" alone${surname ? `\n      - the surname "${surname}" alone` : ""}${surname ? `\n      - first initial + surname, e.g. "${initialSurnameExample}", "${initial}. ${surname}", "${initial}${surname}"` : ""}${surname ? `\n      - surname + first initial, e.g. "${surnameInitialExample}"` : ""}${surname ? `\n      - a family trust or company name that contains the surname (e.g. a reference like "${surname} Family Trust" or "${surname} Holdings" matches)` : ""}` : ""}
${expectedReference ? `  • User-typed reference "${expectedReference}" — exact or near-exact match.` : ""}

Set referenceMatch = false ONLY if you have scanned every reference field and NONE of them contains any of the identifiers above.
${!expectedReference && !meterNumber && !userName ? "Set referenceMatch = null (no identifiers available)." : ""}

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

    // Use base64 if available (bypasses Cloudinary access restrictions), else URL
    let contentBlock: any;
    if (fileBase64 && fileMimeType) {
      console.log("verify-payment: using base64, mimeType =", fileMimeType);
      const isPdf = fileMimeType === "application/pdf";
      contentBlock = isPdf ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
      } : {
        type: "image",
        source: { type: "base64", media_type: fileMimeType, data: fileBase64 },
      };
    } else {
      console.log("verify-payment: using URL =", imageUrl.slice(0, 100));
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
