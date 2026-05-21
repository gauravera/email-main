import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { getValidTokens } from "@/lib/auth-utils";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";
import { uploadBase64ToS3, processHtmlForS3 } from "@/lib/s3-upload";

export async function POST(req: Request) {
  try {
    const { to, cc, emailData, subject: directSubject, body, draftId, attachments, threadId, originalMessageId } = await req.json();
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
        { error: "Gmail connection expired. Please sign out and sign in again to reconnect." },
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || !emailRegex.test(to)) {
      return NextResponse.json({ 
        error: `The recipient address "${to}" is not a valid email format.` 
      }, { status: 400 });
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const blockData = emailData ? (typeof emailData === 'string' ? JSON.parse(emailData) : emailData) : null;
    const subject = directSubject || blockData?.subject || "Personalized Outreach";
    
    let htmlContent = "";
    if (body) {
      if (body.includes("<div") || body.includes("<p") || body.includes("<br") || body.includes("<span")) {
        htmlContent = body;
      } else {
        htmlContent = body.replace(/\n/g, "<br />");
      }
    } else if (blockData?.blocks && Array.isArray(blockData.blocks)) {
      for (const block of blockData.blocks) {
        if (block.type === 'text') {
           const text = (block.content?.text || '');
           const indentedText = text.replace(/^ +/gm, (match: string) => '&nbsp;'.repeat(match.length));
           htmlContent += `<p style="margin: 0 0 16px 0; text-align: ${block.styles?.alignment || 'left'}; font-size: ${block.styles?.fontSize || '15px'}; color: ${block.styles?.color || '#1f2937'}; white-space: pre-wrap;">${indentedText.replace(/\n/g, "<br />")}</p>`;
        } else if (block.type === 'image') {
           let imageUrl = block.content?.url || 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?w=800&q=80';
           
           // Upload base64 to S3 only if it's a "saved" brand asset
           if (imageUrl.startsWith('data:image/') && block.isSaved) {
             const [header, data] = imageUrl.split(',');
             const type = header.match(/:(.*?);/)?.[1] || 'image/png';
             imageUrl = await uploadBase64ToS3(data, type);
           }

           htmlContent += `<div style="text-align: ${block.styles?.alignment || 'center'}; margin: 16px 0;">
             <a href="${imageUrl}" target="_blank">
               <img src="${imageUrl}" alt="Header" style="max-width: 100%; height: auto; border-radius: 8px; border: 0;" />
             </a>
           </div>`;
        } else if (block.type === 'cta') {
           const btnColor = block.styles?.backgroundColor || '#2563eb';
           htmlContent += `<div style="text-align: ${block.styles?.alignment || 'center'}; margin: 36px 0;">
             <a href="${block.content?.link || '#'}" style="display: inline-block; padding: 12px 32px; background-color: ${btnColor}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">${block.content?.text || 'Click Here'}</a>
           </div>`;
        } else if (block.type === 'signature') {
           let sigText = block.content?.text || '';
           
           // Handle base64 images in signature only if it's a "saved" asset
           if (block.isSaved) {
             sigText = await processHtmlForS3(sigText);
           }

           htmlContent += `<div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: ${block.styles?.alignment || 'left'}; font-size: 14px; color: #374151; line-height: 1.6;">${sigText.replace(/\n/g, "<br />")}</div>`;
        }
      }
    } else {
      htmlContent = `<p>${JSON.stringify(emailData)}</p>`;
    }

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        ${htmlContent}
      </div>
    `;

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const boundary = "boundary_" + Math.random().toString(36).substring(2);
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;

    let message = "";
    const headers = [
      `From: ${session.user.name ?? "Outreach"} <${session.user.email}>`,
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      `Subject: ${utf8Subject}`,
      "MIME-Version: 1.0",
    ];

    if (originalMessageId) {
      headers.push(`In-Reply-To: ${originalMessageId}`);
      headers.push(`References: ${originalMessageId}`);
    }

    if (hasAttachments) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      message = [
        ...headers,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        htmlBody,
        "",
        ...attachments.map((att: any) => {
          const base64Data = att.content.includes(',') ? att.content.split(',')[1] : att.content;
          return [
            `--${boundary}`,
            `Content-Type: ${att.type || 'application/octet-stream'}; name="${att.name}"`,
            `Content-Disposition: attachment; filename="${att.name}"`,
            "Content-Transfer-Encoding: base64",
            "",
            base64Data,
          ].join("\r\n");
        }),
        `--${boundary}--`,
      ].join("\r\n");
    } else {
      headers.push("Content-Type: text/html; charset=utf-8");
      message = [...headers, "", htmlBody].join("\r\n");
    }

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: threadId || undefined,
      },
    });

    if (draftId) {
      await prisma.emailDraft.update({
        where: { id: draftId },
        data: { status: "sent", sentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, messageId: response.data.id });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
