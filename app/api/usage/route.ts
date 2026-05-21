import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isModelDeprecated } from "@/lib/gemini-models";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hourlyDateParam = searchParams.get("hourlyDate");
    const campaignIdParam = searchParams.get("campaignId") || undefined;

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageWhere: any = { userId: user.id };
    const draftWhere: any = { campaign: { userId: user.id } };

    if (campaignIdParam) {
      usageWhere.campaignId = campaignIdParam;
      draftWhere.campaignId = campaignIdParam;
    }

    // GeminiUsage.model = the ACTUAL model used (may differ from campaign.model due to fallback).
    // Order ASC so the first record per campaign = oldest → we credit emails there.
    const [usageRecords, campaignDraftCounts, draftStatusCounts, recentCampaigns] = await Promise.all([
      prisma.geminiUsage.findMany({
        where: usageWhere,
        orderBy: { createdAt: "asc" },
      }),
      prisma.emailDraft.groupBy({
        by: ["campaignId"],
        where: draftWhere,
        _count: { id: true },
      }),
      prisma.emailDraft.groupBy({
        by: ["status"],
        where: draftWhere,
        _count: { id: true },
      }),
      prisma.campaign.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          _count: {
            select: { drafts: true },
          },
        },
      }),
    ]);

    // campaignId → actual draft count
    const draftsPerCampaign: Record<string, number> = {};
    for (const row of campaignDraftCounts) {
      if (row.campaignId) {
        draftsPerCampaign[row.campaignId] = row._count.id;
      }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function normModel(raw: string) {
      return raw.startsWith("models/") ? raw : `models/${raw}`;
    }
    function friendlyName(normalised: string) {
      return normalised
        .replace("models/", "")
        .replace("gemini-", "Gemini ")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    // ── Daily aggregation ────────────────────────────────────────────────────
    const dailyMap: Record<string, {
      date: string;
      displayDate: string;
      totalEmails: number;
      totalTokens: number;
      totalCost: number;
      modelsMap: Record<string, {
        modelId: string;
        name: string;
        emailsGenerated: number;
        tokensUsed: number;
        costEst: number;
        isDeprecated: boolean;
      }>;
    }> = {};

    // Each campaign's email count must be credited ONCE no matter how many
    // batch GeminiUsage records it has.
    const creditedCampaigns = new Set<string>();

    for (const record of usageRecords) {
      const dateObj = new Date(record.createdAt);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      const displayDate = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const normalised = normModel(record.model);
      const estimatedCost = (record.tokensUsed / 1_000_000) * 0.075;

      // Credit emails only once per campaign
      let emailsToCredit = 0;
      if (record.campaignId && !creditedCampaigns.has(record.campaignId)) {
        emailsToCredit = draftsPerCampaign[record.campaignId] ?? 0;
        creditedCampaigns.add(record.campaignId);
      }

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          displayDate,
          totalEmails: 0,
          totalTokens: 0,
          totalCost: 0,
          modelsMap: {},
        };
      }

      const dayGroup = dailyMap[dateKey];

      if (!dayGroup.modelsMap[normalised]) {
        dayGroup.modelsMap[normalised] = {
          modelId: normalised,
          name: friendlyName(normalised),
          emailsGenerated: 0,
          tokensUsed: 0,
          costEst: 0,
          isDeprecated: isModelDeprecated(normalised),
        };
      }

      dayGroup.modelsMap[normalised].emailsGenerated += emailsToCredit;
      dayGroup.modelsMap[normalised].tokensUsed += record.tokensUsed;
      dayGroup.modelsMap[normalised].costEst += estimatedCost;

      dayGroup.totalEmails += emailsToCredit;
      dayGroup.totalTokens += record.tokensUsed;
      dayGroup.totalCost += estimatedCost;
    }

    const dailyStats = Object.values(dailyMap)
      .map((day) => ({ ...day, models: Object.values(day.modelsMap) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // ── Hourly aggregation (chosen day) ──────────────────────────────────────
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth();
    let targetDay = now.getDate();

    if (hourlyDateParam) {
      const parts = hourlyDateParam.split("-").map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        targetYear = parts[0];
        targetMonth = parts[1] - 1;
        targetDay = parts[2];
      }
    }

    // Build 24 empty hour buckets (Hour 0 to Hour 23)
    const hourlyMap: Record<string, { hour: string; displayHour: string; emails: number; tokens: number }> = {};
    for (let h = 0; h < 24; h++) {
      const slotTime = new Date(targetYear, targetMonth, targetDay, h, 0, 0);
      const hk = [
        slotTime.getFullYear(),
        String(slotTime.getMonth() + 1).padStart(2, "0"),
        String(slotTime.getDate()).padStart(2, "0"),
        String(slotTime.getHours()).padStart(2, "0"),
      ].join("-");
      hourlyMap[hk] = {
        hour: hk,
        displayHour: slotTime.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        emails: 0,
        tokens: 0,
      };
    }

    const creditedCampaignsHourly = new Set<string>();
    for (const record of usageRecords) {
      const recDate = new Date(record.createdAt);
      if (
        recDate.getFullYear() !== targetYear ||
        recDate.getMonth() !== targetMonth ||
        recDate.getDate() !== targetDay
      ) {
        continue;
      }

      const hk = [
        recDate.getFullYear(),
        String(recDate.getMonth() + 1).padStart(2, "0"),
        String(recDate.getDate()).padStart(2, "0"),
        String(recDate.getHours()).padStart(2, "0"),
      ].join("-");

      if (hourlyMap[hk]) {
        if (record.campaignId && !creditedCampaignsHourly.has(record.campaignId)) {
          hourlyMap[hk].emails += draftsPerCampaign[record.campaignId] ?? 0;
          creditedCampaignsHourly.add(record.campaignId);
        }
        hourlyMap[hk].tokens += record.tokensUsed;
      }
    }

    const hourlyUsage = Object.values(hourlyMap); // already chronological

    // ── Monthly aggregation: always show the last 12 months (pre-filled with 0) ──
    const monthlyMap: Record<string, { month: string; displayMonth: string; emails: number; tokens: number }> = {};

    // Pre-fill last 12 months (oldest → newest) so the chart always has a full year
    const nowForMonthly = new Date();
    for (let m = 11; m >= 0; m--) {
      const d = new Date(nowForMonthly.getFullYear(), nowForMonthly.getMonth() - m, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const displayMonth = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthlyMap[monthKey] = { month: monthKey, displayMonth, emails: 0, tokens: 0 };
    }

    // Fill in actual data from daily stats
    for (const day of dailyStats) {
      const parts = day.date.split("-");
      const monthKey = `${parts[0]}-${parts[1]}`;
      if (monthlyMap[monthKey]) {
        monthlyMap[monthKey].emails += day.totalEmails;
        monthlyMap[monthKey].tokens += day.totalTokens;
      }
    }

    // ── Draft Status Summary ──────────────────────────────────────────────────
    const statusSummary = {
      ready: 0,
      sent: 0,
      failed: 0,
    };
    for (const row of draftStatusCounts) {
      if (row.status === "ready") statusSummary.ready = row._count.id;
      else if (row.status === "sent") statusSummary.sent = row._count.id;
      else if (row.status === "failed") statusSummary.failed = row._count.id;
    }

    // ── Recent Campaigns mapping ──────────────────────────────────────────────
    const mappedRecentCampaigns = recentCampaigns.map((c) => {
      const campaignUsage = usageRecords.filter((r) => r.campaignId === c.id);
      const totalTokens = campaignUsage.reduce((sum, r) => sum + r.tokensUsed, 0);
      const modelsUsed = Array.from(new Set(campaignUsage.map((r) => friendlyName(normModel(r.model)))));
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        createdAt: c.createdAt,
        model: friendlyName(normModel(c.model)),
        modelsUsed: modelsUsed.length > 0 ? modelsUsed : [friendlyName(normModel(c.model))],
        draftCount: c._count.drafts,
        tokensUsed: totalTokens,
      };
    });

    const monthlyUsage = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      usage: dailyStats,
      hourlyUsage,
      monthlyUsage,
      statusSummary,
      recentCampaigns: mappedRecentCampaigns,
    });
  } catch (error: any) {
    console.error("Usage Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
