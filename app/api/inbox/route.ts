import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { getValidTokens } from "@/lib/auth-utils";
import { google } from "googleapis";

// Safe Base64URL decoder
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
function parseParts(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";

  function traverse(part: any) {
    const mimeType = part.mimeType || "";
    
    // Check if the part has body data
    if (part.body && part.body.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (mimeType.toLowerCase() === "text/html") {
        html += decoded + "\n";
      } else if (mimeType.toLowerCase() === "text/plain") {
        text += decoded + "\n";
      }
    }

    // Traverse children if any
    if (part.parts) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  }

  traverse(payload);
  return { html, text };
}

function extractBody(payload: any): string {
  const { html, text } = parseParts(payload);
  return html.trim() || text.trim() || "";
}


// Find a specific header by name
function getHeader(headers: any[], name: string): string {
  const header = headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}

// Extract email address cleanly from From header (e.g. "John Doe <john@example.com>")
function extractEmailFromFromHeader(fromStr: string): string {
  const match = fromStr.match(/<([^>]+)>/) || fromStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase().trim() : fromStr.toLowerCase().trim();
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

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "inbox";
    const searchTerm = searchParams.get("q") || "";

    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Determine query based on folder and search term
    let folderQuery = "label:INBOX -label:SENT";
    if (folder === "sent") {
      folderQuery = "label:SENT";
    } else if (folder === "drafts") {
      folderQuery = "label:DRAFT";
    }

    let finalQuery = folderQuery;

    if (searchTerm.trim() !== "") {
      finalQuery = `${finalQuery} ${searchTerm.trim()}`;
    }

    // Format YYYY/MM/DD to be 1 day before joining date/time (absolutely safe and inclusive for Gmail search API)
    const joinDate = new Date(user.createdAt);
    joinDate.setDate(joinDate.getDate() - 1);
    const yyyy = joinDate.getFullYear();
    const mm = String(joinDate.getMonth() + 1).padStart(2, "0");
    const dd = String(joinDate.getDate()).padStart(2, "0");
    const afterDateStr = `${yyyy}/${mm}/${dd}`;

    // Append Gmail "after" filter
    finalQuery = `${finalQuery} after:${afterDateStr}`;
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: finalQuery,
      maxResults: 50, // Fetch up to 50 messages
    });

    const messageSummaries = listRes.data.messages || [];
    const emails: any[] = [];

    // Fetch message details in parallel
    const detailsPromises = messageSummaries.map(async (msgSummary) => {
      if (!msgSummary.id) return null;
      try {
        const msgDetail = await gmail.users.messages.get({
          userId: "me",
          id: msgSummary.id,
          format: "full",
        });

        // Strict millisecond-level date filter: skip emails received before the user's exact joining date/time
        const msgInternalDate = Number(msgDetail.data.internalDate);
        if (msgInternalDate && msgInternalDate < user.createdAt.getTime()) {
          return null; // Skip this email
        }

        const headers = msgDetail.data.payload?.headers || [];
        const subject = getHeader(headers, "Subject") || "(No Subject)";
        const from = getHeader(headers, "From") || "Unknown Sender";
        const to = getHeader(headers, "To") || "";
        const dateHeader = getHeader(headers, "Date");
        const snippet = msgDetail.data.snippet || "";
        const messageIdHeader = getHeader(headers, "Message-ID") || "";

        // Read full body
        let body = extractBody(msgDetail.data.payload);
        if (!body.trim()) {
          body = snippet;
        }

        // Format dates
        let parsedDate = dateHeader;
        try {
          if (dateHeader) {
            parsedDate = new Date(dateHeader).toISOString();
          } else {
            parsedDate = new Date(Number(msgDetail.data.internalDate)).toISOString();
          }
        } catch (_) {}

        return {
          id: msgSummary.id,
          threadId: msgSummary.threadId,
          subject,
          from,
          to,
          snippet,
          body,
          timestamp: parsedDate || new Date().toISOString(),
          unread: msgDetail.data.labelIds?.includes("UNREAD") || false,
          messageIdHeader,
        };
      } catch (err) {
        console.error(`Failed to load email details for ${msgSummary.id}:`, err);
        return null;
      }
    });

    const results = await Promise.all(detailsPromises);
    results.forEach((item) => {
      if (item !== null) {
        emails.push(item);
      }
    });

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error("Inbox GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch inbox" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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

    const { messageId } = await req.json();

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
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

    // Modify the email to remove the "UNREAD" label
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Inbox PATCH Error:", error);
    return NextResponse.json({ error: error.message || "Failed to mark email as read" }, { status: 500 });
  }
}
