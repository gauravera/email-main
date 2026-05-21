import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getValidTokens } from "@/lib/auth-utils";
import { google } from "googleapis";

// Decode base64url encoded strings safely
function decodeBase64Url(data: string): string {
  if (!data) return "";
  let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (err) {
    console.error("Base64 decode error:", err);
    return "";
  }
}

// Recursively traverse and extract plain text or HTML content from email parts
function extractBody(part: any): string {
  let text = "";
  if (part.body && part.body.data) {
    text += decodeBase64Url(part.body.data) + "\n";
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      text += extractBody(subPart);
    }
  }
  return text;
}

// Find a specific header by name
function getHeader(headers: any[], name: string): string {
  const header = headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}

// Extract failed recipient email from body text
function extractRecipient(text: string): string {
  // Pattern 1: Final-Recipient: rfc822; email@domain.com
  const finalRecipientRegex = /Final-Recipient:\s*(?:rfc822;\s*)?([^\s<>]+@[^\s<>]+)/i;
  let match = text.match(finalRecipientRegex);
  if (match) return match[1].trim();

  // Pattern 2: Failed-Recipient: email@domain.com
  const failedRecipientRegex = /Failed-Recipient:\s*([^\s<>]+@[^\s<>]+)/i;
  match = text.match(failedRecipientRegex);
  if (match) return match[1].trim();

  // Pattern 3: delivery to the following recipient failed permanently: email@domain.com
  const permFailedRegex = /delivery to the following recipient failed permanently:?\s*([^\s<>]+@[^\s<>]+)/i;
  match = text.match(permFailedRegex);
  if (match) return match[1].trim();

  // Pattern 4: To: email@domain.com
  const toRegex = /\bTo:\s*([^\s<>]+@[^\s<>]+)/i;
  match = text.match(toRegex);
  if (match) return match[1].trim();

  // Pattern 5: Generic email scanner (excluding our system domains)
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = text.match(emailRegex);
  if (emails && emails.length > 0) {
    for (const email of emails) {
      const cleanEmail = email.toLowerCase();
      if (
        !cleanEmail.includes("gpserp.com") &&
        !cleanEmail.includes("googlemail.com") &&
        !cleanEmail.includes("gmail.com") &&
        !cleanEmail.includes("mailer-daemon") &&
        !cleanEmail.includes("postmaster")
      ) {
        return email;
      }
    }
    return emails[0];
  }

  return "";
}

// Extract SMTP Status Code and Diagnostic Reason
function extractSmtpAndReason(text: string): { smtpCode: string; reason: string } {
  let smtpCode = "";
  let reason = "";

  // Extract diagnostic report lines
  const diagRegex = /Diagnostic-Code:\s*([^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)*)/i;
  const diagMatch = text.match(diagRegex);
  if (diagMatch) {
    reason = diagMatch[1].replace(/\s+/g, " ").trim();
  }

  // Extract Enhanced Status Code
  const statusRegex = /Status:\s*([45]\.\d+\.\d+)/i;
  const statusMatch = text.match(statusRegex);
  let statusCode = "";
  if (statusMatch) {
    statusCode = statusMatch[1].trim();
  }

  // Extract 3-digit SMTP status code
  const codeRegex = /\b([45]\d\d)\b/;
  const codeMatch = reason.match(codeRegex) || text.match(codeRegex);
  let threeDigitCode = "";
  if (codeMatch) {
    threeDigitCode = codeMatch[1].trim();
  }

  if (threeDigitCode && statusCode) {
    smtpCode = `${threeDigitCode} ${statusCode}`;
  } else {
    smtpCode = threeDigitCode || statusCode || "550";
  }

  if (!reason) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (
        line.toLowerCase().includes("error") ||
        line.toLowerCase().includes("fail") ||
        line.toLowerCase().includes("reject") ||
        line.toLowerCase().includes("unreachable")
      ) {
        reason = line.trim();
        break;
      }
    }
    reason = reason || "Undelivered mail returned to sender";
  }

  // Clean up prefix text
  reason = reason.replace(/^smtp;\s*/i, "");

  return { smtpCode, reason };
}

// Classify bounce type based on SMTP code and reason
function classifyBounce(smtpCode: string, reason: string): string {
  const normalized = (smtpCode + " " + reason).toLowerCase();

  // Invalid email
  if (
    normalized.includes("5.1.1") ||
    normalized.includes("5.1.0") ||
    normalized.includes("user unknown") ||
    normalized.includes("no such user") ||
    normalized.includes("recipient rejected") ||
    normalized.includes("invalid recipient") ||
    normalized.includes("does not exist") ||
    normalized.includes("address not found") ||
    normalized.includes("recipient unknown") ||
    normalized.includes("not found")
  ) {
    return "invalid email";
  }

  // Mailbox full
  if (
    normalized.includes("5.2.2") ||
    normalized.includes("4.2.2") ||
    normalized.includes("mailbox is full") ||
    normalized.includes("quota exceeded") ||
    normalized.includes("space") ||
    normalized.includes("over quota") ||
    normalized.includes("full")
  ) {
    return "mailbox full";
  }

  // Spam rejection
  if (
    normalized.includes("5.7.1") ||
    normalized.includes("5.7.0") ||
    normalized.includes("spam") ||
    normalized.includes("blocked") ||
    normalized.includes("blacklisted") ||
    normalized.includes("dmarc") ||
    normalized.includes("spf") ||
    normalized.includes("policy") ||
    normalized.includes("unsolicited") ||
    normalized.includes("rejected as spam")
  ) {
    return "spam rejection";
  }

  // Temporary failure
  if (
    smtpCode.startsWith("4") ||
    normalized.includes("temporary") ||
    normalized.includes("try again") ||
    normalized.includes("greylisted") ||
    normalized.includes("connection timed out") ||
    normalized.includes("4.4.7")
  ) {
    return "temporary failure";
  }

  return "unknown";
}

// Extract original subject of the outgoing email from body quotes
function extractOriginalSubject(text: string, bounceSubject: string): string {
  const subjectRegex = /\bSubject:\s*([^\r\n]+)/gi;
  let match;
  const subjects: string[] = [];
  while ((match = subjectRegex.exec(text)) !== null) {
    subjects.push(match[1].trim());
  }

  const normalizedBounce = bounceSubject.toLowerCase();
  for (const sub of subjects) {
    const normalizedSub = sub.toLowerCase();
    if (
      !normalizedSub.includes("delivery status") &&
      !normalizedSub.includes("failure") &&
      !normalizedSub.includes("undelivered mail") &&
      !normalizedSub.includes("returned to sender") &&
      normalizedSub !== normalizedBounce
    ) {
      return sub;
    }
  }

  return "";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokens = await getValidTokens(user.id);

    if (!tokens || !tokens.refreshToken) {
      return NextResponse.json(
        { error: "Gmail connection expired. Please reconnect your account." },
        { status: 401 }
      );
    }

    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Execute the user-specified Gmail search query
    const searchQuery = '(from:mailer-daemon OR from:postmaster OR subject:"Delivery Status Notification" OR subject:"Undelivered Mail Returned to Sender") AND ("mail.gpserp.com" OR "gpserp.com")';

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: searchQuery,
      maxResults: 50,
    });

    const messages = listRes.data.messages || [];
    const bounceReports: any[] = [];

    for (const msgSummary of messages) {
      if (!msgSummary.id) continue;

      try {
        const msgDetail = await gmail.users.messages.get({
          userId: "me",
          id: msgSummary.id,
          format: "full",
        });

        const headers = msgDetail.data.payload?.headers || [];
        const fromHeader = getHeader(headers, "From");
        const subjectHeader = getHeader(headers, "Subject");
        const dateHeader = getHeader(headers, "Date");

        // Validate origin strictly
        const isFromDaemon =
          fromHeader.toLowerCase().includes("mailer-daemon@googlemail.com") ||
          fromHeader.toLowerCase().includes("mailer-daemon@gmail.com") ||
          fromHeader.toLowerCase().includes("postmaster@gmail.com") ||
          subjectHeader.toLowerCase().includes("delivery status notification");

        if (!isFromDaemon) continue;

        // Traverse layout parts to get text
        const bodyText = extractBody(msgDetail.data.payload);

        // Ensure bounce relates to our system/domain
        const containsOurDomain =
          bodyText.includes("mail.gpserp.com") ||
          bodyText.includes("gpserp.com") ||
          subjectHeader.includes("mail.gpserp.com") ||
          subjectHeader.includes("gpserp.com");

        if (!containsOurDomain) continue;

        // Parse structures
        const recipient = extractRecipient(bodyText);
        if (!recipient) continue;

        const { smtpCode, reason } = extractSmtpAndReason(bodyText);
        const status = classifyBounce(smtpCode, reason);
        const originalSubject = extractOriginalSubject(bodyText, subjectHeader) || "Outreach Outreach";
        
        // Parse date
        let parsedDate = dateHeader;
        try {
          if (dateHeader) {
            parsedDate = new Date(dateHeader).toISOString();
          } else {
            parsedDate = new Date(Number(msgDetail.data.internalDate)).toISOString();
          }
        } catch (_) {}

        // Construct structured JSON object
        const report = {
          recipient,
          status,
          smtp_code: smtpCode,
          reason,
          original_subject: originalSubject,
          timestamp: parsedDate || new Date().toISOString(),
        };

        bounceReports.push(report);

        // Synchronize state with Database: flag the draft as failed
        const matchingDraft = await prisma.emailDraft.findFirst({
          where: {
            recipientEmail: recipient,
            campaign: {
              userId: user.id,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (matchingDraft && matchingDraft.status !== "failed") {
          await prisma.emailDraft.update({
            where: { id: matchingDraft.id },
            data: { status: "failed" },
          });
        }
      } catch (err) {
        console.error(`Failed to process bounce email ${msgSummary.id}:`, err);
      }
    }

    return NextResponse.json(bounceReports);
  } catch (error: any) {
    console.error("Track Bounces Error:", error);
    return NextResponse.json({ error: error.message || "Failed to track bounces" }, { status: 500 });
  }
}
