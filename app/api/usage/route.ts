import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isModelDeprecated } from "@/lib/gemini-models";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageRecords = await prisma.geminiUsage.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const campaignIds = usageRecords
      .map(r => r.campaignId)
      .filter((id): id is string => !!id);

    const draftsCounts = await prisma.emailDraft.groupBy({
      by: ["campaignId"],
      where: {
        campaignId: { in: campaignIds },
      },
      _count: {
        id: true,
      },
    });

    const draftsCountMap = Object.fromEntries(
      draftsCounts.map(item => [item.campaignId, item._count.id])
    );

    // Group records by date (YYYY-MM-DD local timezone)
    const groupedByDate: Record<string, {
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

    for (const record of usageRecords) {
      const dateObj = new Date(record.createdAt);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const displayDate = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
          displayDate,
          totalEmails: 0,
          totalTokens: 0,
          totalCost: 0,
          modelsMap: {}
        };
      }

      const dayGroup = groupedByDate[dateKey];
      const rawModel = record.model;
      const normalised = rawModel.startsWith("models/") ? rawModel : `models/${rawModel}`;

      const formattedName = rawModel
        .replace("gemini-", "Gemini ")
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const estimatedCost = (record.tokensUsed / 1000000) * 0.075; // average cost estimate

      if (!dayGroup.modelsMap[normalised]) {
        dayGroup.modelsMap[normalised] = {
          modelId: normalised,
          name: formattedName,
          emailsGenerated: 0,
          tokensUsed: 0,
          costEst: 0,
          isDeprecated: isModelDeprecated(normalised)
        };
      }

      const emailsCount = record.campaignId ? (draftsCountMap[record.campaignId] ?? 1) : 1;

      const modelStat = dayGroup.modelsMap[normalised];
      modelStat.emailsGenerated += emailsCount;
      modelStat.tokensUsed += record.tokensUsed;
      modelStat.costEst += estimatedCost;

      dayGroup.totalEmails += emailsCount;
      dayGroup.totalTokens += record.tokensUsed;
      dayGroup.totalCost += estimatedCost;
    }

    const stats = Object.values(groupedByDate).map(day => ({
      ...day,
      models: Object.values(day.modelsMap)
    })).sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ usage: stats });
  } catch (error: any) {
    console.error("Usage Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
