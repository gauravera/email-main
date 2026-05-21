import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getFreshAccessToken } from "@/lib/google-auth";
import { getModelFallbackChain, markModelDeprecated } from "@/lib/gemini-models";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailSubject, emailBody, sender, tone, prompt, brandProfileId } = await request.json();

    if (!emailBody || !sender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Brand Profile Context if provided
    let brandContext: any = null;
    if (brandProfileId) {
      brandContext = await prisma.brandProfile.findUnique({
        where: { id: brandProfileId, userId }
      });
    }

    // 2. Fetch fresh access token for Gemini API
    const userAccessToken = await getFreshAccessToken(userId);

    if (!userAccessToken) {
      return NextResponse.json(
        { error: "Gmail connection expired. Please reconnect your account." },
        { status: 401 }
      );
    }

    // 3. Assemble Prompt
    const brandSection = brandContext
      ? `
### BRAND CONTEXT
Brand Name: ${brandContext.brandName}
${brandContext.industry ? `Industry: ${brandContext.industry}` : ""}
${brandContext.companyDescription ? `Company Description: ${brandContext.companyDescription}` : ""}
${brandContext.tone ? `Brand's Native Tone: ${brandContext.tone}` : ""}
`
      : "";

    const systemPrompt = `You are a world-class AI email strategist.
Your task is to draft a reply to an incoming email.

${brandSection}

### INCOMING EMAIL DETAILS
From: ${sender}
Subject: ${emailSubject || "(No Subject)"}
Body:
"${emailBody}"

### REPLY REQUIREMENTS:
- **Tone**: ${tone || "Professional"}
- **Additional Instructions**: ${prompt || "Craft a friendly and helpful contextual reply to this email."}
- **Strict Guidelines**:
  - Make it sound natural, human, and warm.
  - DO NOT use brackets or placeholders (e.g., do not output "[My Name]" or "[Your Company]"). Use the brand context if provided; otherwise, end the email with a polite, generic closing or just the brand name.
  - Write only the body of the reply email. Do not include subject lines or headers in the output text itself.
  - Format the reply in clean, readable paragraphs.
  - Start directly with the greeting. Do not include any introductory remarks or meta-commentary (like "Here is a reply suggestion").

Please output ONLY the reply email content.`;

    // 4. Retrieve fallback models chain
    const modelsToTry = await getModelFallbackChain(undefined, `Bearer ${userAccessToken}`);
    let generatedReply = "";

    for (const mId of modelsToTry) {
      console.log(`[AI Reply Suggestion] Trying model ${mId}...`);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${mId}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userAccessToken}`
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err?.error?.message || "";
          const isDeprecated = res.status === 404 || errMsg.toLowerCase().includes("deprecated") || errMsg.toLowerCase().includes("not found");
          if (isDeprecated) {
            markModelDeprecated(mId);
          }
          continue;
        }

        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.trim()) {
          generatedReply = text.trim();
          break;
        }
      } catch (e) {
        console.warn(`[AI Reply Suggestion] Failed with ${mId}:`, e);
      }
    }

    if (!generatedReply) {
      return NextResponse.json(
        { error: "All Gemini models failed to generate a reply draft." },
        { status: 503 }
      );
    }

    return NextResponse.json({ reply: generatedReply });
  } catch (error: any) {
    console.error("AI Reply Suggestion API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
