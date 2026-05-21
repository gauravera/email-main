import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, Mail, Send, Cpu, ArrowLeft } from "lucide-react";
import Link from "next/link";
import UserAnalyticsCharts from "@/components/admin/user-analytics-charts";

export default async function UserAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  
  if (session?.user?.email !== adminEmail) {
    redirect("/");
  }

  const resolvedParams = await params;

  const user = await prisma.user.findUnique({
    where: { id: resolvedParams.id },
    include: {
      campaigns: {
        select: {
          id: true,
          drafts: {
            select: {
              createdAt: true,
              sentAt: true,
              status: true
            }
          }
        }
      },
      geminiUsage: {
        select: {
          tokensUsed: true,
          createdAt: true
        }
      }
    }
  });

  if (!user) return notFound();

  const dailyStats: Record<string, { mailsGenerated: number, mailsSent: number, tokensUsed: number }> = {};
  const getDay = (date: Date) => date.toISOString().split('T')[0];

  let totalTokens = 0;
  let totalMailsGenerated = 0;
  let totalMailsSent = 0;

  const rawDrafts: Array<{ createdAt: string; sentAt: string | null; status: string }> = [];
  const rawGeminiUsage: Array<{ createdAt: string; tokensUsed: number }> = [];

  user.geminiUsage.forEach(usage => {
    totalTokens += usage.tokensUsed;
    const day = getDay(usage.createdAt);
    if (!dailyStats[day]) dailyStats[day] = { mailsGenerated: 0, mailsSent: 0, tokensUsed: 0 };
    dailyStats[day].tokensUsed += usage.tokensUsed;
    rawGeminiUsage.push({
      createdAt: usage.createdAt.toISOString(),
      tokensUsed: usage.tokensUsed
    });
  });

  user.campaigns.forEach(c => {
    c.drafts.forEach(draft => {
      totalMailsGenerated++;
      const genDay = getDay(draft.createdAt);
      if (!dailyStats[genDay]) dailyStats[genDay] = { mailsGenerated: 0, mailsSent: 0, tokensUsed: 0 };
      dailyStats[genDay].mailsGenerated += 1;

      rawDrafts.push({
        createdAt: draft.createdAt.toISOString(),
        sentAt: draft.sentAt ? draft.sentAt.toISOString() : null,
        status: draft.status
      });

      if (draft.status === "sent") {
        totalMailsSent++;
        const sentDay = draft.sentAt ? getDay(draft.sentAt) : genDay;
        if (!dailyStats[sentDay]) dailyStats[sentDay] = { mailsGenerated: 0, mailsSent: 0, tokensUsed: 0 };
        dailyStats[sentDay].mailsSent += 1;
      }
    });
  });

  const sortedDailyStats = Object.entries(dailyStats)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-4">
          <img
            src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
            alt={user.name || "User"}
            className="w-12 h-12 rounded-full border border-border object-cover shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {user.name || "User Analytics"}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Mails Generated</h3>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalMailsGenerated}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Mails Sent</h3>
            <Send className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalMailsSent}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Tokens Used</h3>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <UserAnalyticsCharts drafts={rawDrafts} geminiUsage={rawGeminiUsage} />

      <h2 className="text-xl font-bold tracking-tight mb-6">Daily Analytics</h2>
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Mails Generated</th>
                <th className="px-6 py-4 font-medium">Mails Sent</th>
                <th className="px-6 py-4 font-medium">Tokens Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedDailyStats.map((stat) => (
                <tr key={stat.date} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {new Date(stat.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {stat.mailsGenerated}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {stat.mailsSent}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {stat.tokensUsed.toLocaleString()}
                  </td>
                </tr>
              ))}
              {sortedDailyStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No analytics data found for this user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
