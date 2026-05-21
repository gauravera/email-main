"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Activity,
  Cpu,
  Mail,
  TrendingUp,
  RefreshCw,
  Zap,
  Brain,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ModelStat {
  modelId: string;
  name: string;
  emailsGenerated: number;
  tokensUsed: number;
  costEst: number;
  isDeprecated: boolean;
}

interface UsageDay {
  date: string;
  displayDate: string;
  totalEmails: number;
  totalTokens: number;
  totalCost: number;
  models: ModelStat[];
}

interface HourlySlot {
  hour: string;
  displayHour: string;
  emails: number;
  tokens: number;
}

interface MonthlySlot {
  month: string;
  displayMonth: string;
  emails: number;
  tokens: number;
}

type ChartPeriod = "hourly" | "daily" | "monthly";

interface CampaignStat {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  model: string;
  modelsUsed: string[];
  draftCount: number;
  tokensUsed: number;
}

interface StatusSummary {
  ready: number;
  sent: number;
  failed: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [usageStats, setUsageStats] = useState<UsageDay[]>([]);
  const [hourlyUsage, setHourlyUsage] = useState<HourlySlot[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlySlot[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({ ready: 0, sent: 0, failed: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignStat[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedHourlyDate, setSelectedHourlyDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [selectedDailyMonth, setSelectedDailyMonth] = useState(() => new Date().getMonth());
  const [selectedDailyYear, setSelectedDailyYear] = useState(() => new Date().getFullYear());
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState(() => new Date().getFullYear());
  const [hasLoadedInit, setHasLoadedInit] = useState(false);

  const availableYears = (() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    usageStats.forEach((day) => {
      const year = new Date(day.date).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  })();

  const fetchUsageStats = async (
    silent = false,
    hourlyDate = selectedHourlyDate,
    campaignId = selectedCampaignId
  ) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const campaignQuery = campaignId ? `&campaignId=${campaignId}` : "";
      const res = await axios.get(`/api/usage?hourlyDate=${hourlyDate}${campaignQuery}`);
      setUsageStats(res.data.usage || []);
      setHourlyUsage(res.data.hourlyUsage || []);
      setMonthlyUsage(res.data.monthlyUsage || []);
      setStatusSummary(res.data.statusSummary || { ready: 0, sent: 0, failed: 0 });
      setRecentCampaigns(res.data.recentCampaigns || []);
    } catch (e) {
      console.error("Error fetching usage stats:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);
  useEffect(() => {
    if (status === "authenticated") {
      fetchUsageStats(!hasLoadedInit, selectedHourlyDate, selectedCampaignId);
      if (!hasLoadedInit) setHasLoadedInit(true);
    }
  }, [status, selectedHourlyDate, selectedCampaignId]);

  if (status === "loading" || (isLoading && !isMounted)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 animate-bounce" /> Loading usage analytics...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  // ── Chart data based on selected period ────────────────────────────────────
  const chartData: { name: string; emails: number; tokens: number; cost: number }[] = (() => {
    if (chartPeriod === "hourly") {
      return hourlyUsage.map((h) => ({
        name: h.displayHour,
        emails: h.emails,
        tokens: h.tokens,
        cost: (h.tokens / 1_000_000) * 0.075,
      }));
    }
    if (chartPeriod === "monthly") {
      const months = Array.from({ length: 12 }).map((_, idx) => {
        const d = new Date(selectedMonthlyYear, idx, 1);
        const monthStr = String(idx + 1).padStart(2, "0");
        const prefix = `${selectedMonthlyYear}-${monthStr}`;

        let totalMails = 0;
        let totalToks = 0;
        let totalCosts = 0;

        usageStats.forEach((day) => {
          if (day.date.startsWith(prefix)) {
            totalMails += day.totalEmails || 0;
            totalToks += day.totalTokens || 0;
            totalCosts += day.totalCost || 0;
          }
        });

        const displayMonth = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return {
          name: displayMonth.replace(" 20", " '"),
          emails: totalMails,
          tokens: totalToks,
          cost: totalCosts,
        };
      });
      return months;
    }
    // daily (default)
    const totalDaysInMonth = new Date(selectedDailyYear, selectedDailyMonth + 1, 0).getDate();
    const days = Array.from({ length: totalDaysInMonth }).map((_, idx) => {
      const dayNum = idx + 1;
      const d = new Date(selectedDailyYear, selectedDailyMonth, dayNum);
      const monthStr = String(selectedDailyMonth + 1).padStart(2, "0");
      const dayStr = String(dayNum).padStart(2, "0");
      const dateKey = `${selectedDailyYear}-${monthStr}-${dayStr}`;

      const foundDay = usageStats.find((day) => day.date === dateKey);

      return {
        name: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        emails: foundDay ? foundDay.totalEmails : 0,
        tokens: foundDay ? foundDay.totalTokens : 0,
        cost: foundDay ? (foundDay.totalCost || 0) : 0,
      };
    });
    return days;
  })();

  // ── Model share aggregation — include ALL models (even those with only token usage)
  const modelShareMap: Record<string, { name: string; emails: number; tokens: number }> = {};
  usageStats.forEach((day) => {
    day.models.forEach((model) => {
      if (!modelShareMap[model.modelId]) {
        modelShareMap[model.modelId] = { name: model.name, emails: 0, tokens: 0 };
      }
      modelShareMap[model.modelId].emails += model.emailsGenerated;
      modelShareMap[model.modelId].tokens += model.tokensUsed;
    });
  });
  // Sort by emails desc, then tokens desc — so biggest contributors are first
  const modelShareData = Object.values(modelShareMap).sort(
    (a, b) => b.emails - a.emails || b.tokens - a.tokens
  );
  // For the pie, only use models that actually generated emails
  const pieData = modelShareData.filter((m) => m.emails > 0);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalEmails = usageStats.reduce((acc, curr) => acc + (curr.totalEmails || 0), 0);
  const totalTokens = usageStats.reduce((acc, curr) => acc + (curr.totalTokens || 0), 0);
  const avgTokensPerEmail = totalEmails > 0 ? Math.round(totalTokens / totalEmails) : 0;

  const COLORS = ["#818cf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#22d3ee"];

  const periodLabels: Record<ChartPeriod, string> = {
    hourly: "Last 24 Hours",
    daily: "Daily (All Time)",
    monthly: "Monthly",
  };

  return (
    <div className="flex flex-col flex-1 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Analytics
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Detailed tracking of your AI model usage, token consumption, and generation efficiency.
            </p>
          </div>
          <button
            onClick={() => fetchUsageStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-muted text-foreground rounded-xl border border-border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Active Filter Badge */}
        {(() => {
          const activeCampaign = recentCampaigns.find((c) => c.id === selectedCampaignId);
          if (!activeCampaign) return null;
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-semibold w-fit shadow-sm"
            >
              <span>Filtering by campaign: <strong className="text-foreground">{activeCampaign.name}</strong></span>
              <button
                onClick={() => setSelectedCampaignId(null)}
                className="hover:text-foreground font-black ml-2 text-base leading-none transition-colors"
                title="Clear Filter"
              >
                ×
              </button>
            </motion.div>
          );
        })()}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Emails Generated */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between group hover:border-primary/45 transition-colors"
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Emails Generated</span>
              <span className="text-3xl font-extrabold text-foreground tracking-tight">{totalEmails}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
          </motion.div>

          {/* Tokens Consumed */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between group hover:border-accent/45 transition-colors"
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tokens Consumed</span>
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                {(totalTokens / 1000).toFixed(1)}k
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
          </motion.div>

          {/* Tokens Per Email */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between group hover:border-warning/45 transition-colors"
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tokens Per Email</span>
              <span className="text-3xl font-extrabold text-foreground tracking-tight">{avgTokensPerEmail}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        {isMounted && usageStats.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Production Volume Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4"
            >
              {/* Chart header with period toggle and dropdown filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" />
                    Production Volume
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {chartPeriod === "hourly"
                      ? `Hourly usage for ${new Date(selectedHourlyDate + "T00:00:00").toLocaleDateString("en-US", { dateStyle: "long" })}`
                      : chartPeriod === "daily"
                      ? `Daily usage for ${new Date(selectedDailyYear, selectedDailyMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                      : `Monthly usage for the year ${selectedMonthlyYear}`}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selectors depending on period */}
                  {chartPeriod === "hourly" && (
                    <input
                      type="date"
                      value={selectedHourlyDate}
                      onChange={(e) => setSelectedHourlyDate(e.target.value)}
                      className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary h-8"
                    />
                  )}

                  {chartPeriod === "daily" && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedDailyMonth}
                        onChange={(e) => setSelectedDailyMonth(parseInt(e.target.value, 10))}
                        className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary h-8"
                      >
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <option key={idx} value={idx}>
                            {new Date(2026, idx, 1).toLocaleDateString("en-US", { month: "long" })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedDailyYear}
                        onChange={(e) => setSelectedDailyYear(parseInt(e.target.value, 10))}
                        className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary h-8"
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {chartPeriod === "monthly" && (
                    <select
                      value={selectedMonthlyYear}
                      onChange={(e) => setSelectedMonthlyYear(parseInt(e.target.value, 10))}
                      className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary h-8"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Period Toggle */}
                  <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/50">
                    {(["hourly", "daily", "monthly"] as ChartPeriod[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                          chartPeriod === p
                            ? "bg-card text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p === "hourly" && <Clock className="w-3 h-3" />}
                        {p === "daily" && <Calendar className="w-3 h-3" />}
                        {p === "monthly" && <BarChart3 className="w-3 h-3" />}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="transparent"
                      fontSize={chartPeriod === "monthly" ? 9 : 10}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value) => {
                        if (chartPeriod === "daily") {
                          const parts = value.split(" ");
                          if (parts.length === 2) {
                            return parts[1] === "1" ? value : parts[1];
                          }
                        }
                        return value;
                      }}
                      tick={{ fill: "#64748b" }}
                    />
                    <YAxis
                      yAxisId="emails"
                      orientation="left"
                      stroke="transparent"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: "#64748b" }}
                      width={36}
                    />
                    <YAxis
                      yAxisId="tokens"
                      orientation="right"
                      stroke="transparent"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: "#64748b" }}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(129,140,248,0.25)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#e2e8f0",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                        padding: "10px 14px",
                      }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 700, marginBottom: 6, fontSize: 11 }}
                      itemStyle={{ padding: "2px 0" }}
                      formatter={(value: number, name: string) => {
                        if (name === "Emails") return [`${value} email${value !== 1 ? "s" : ""}`, name];
                        if (name === "Tokens") return [value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value), name];
                        return [String(value), name];
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "#94a3b8" }}
                    />
                    <Area
                      yAxisId="emails"
                      type="monotone"
                      dataKey="emails"
                      name="Emails"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      dot={
                        chartData.length <= 7
                          ? { r: 4, fill: "#818cf8", strokeWidth: 2, stroke: "#1e293b" }
                          : false
                      }
                      activeDot={{ r: 5, fill: "#a5b4fc", stroke: "#1e293b", strokeWidth: 2 }}
                      fillOpacity={1}
                      fill="url(#colorEmails)"
                    />
                    <Area
                      yAxisId="tokens"
                      type="monotone"
                      dataKey="tokens"
                      name="Tokens"
                      stroke="#a78bfa"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4, fill: "#c4b5fd", stroke: "#1e293b", strokeWidth: 2 }}
                      fillOpacity={1}
                      fill="url(#colorTokens)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* No-data hints */}
              {chartPeriod === "hourly" && chartData.every((d) => d.emails === 0) && (
                <p className="text-center text-xs text-muted-foreground/60 -mt-2 pb-2">
                  No generation activity in the last 24 hours.
                </p>
              )}
            </motion.div>

            {/* Model Share Pie */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-accent" />
                  Model Share
                </h3>
              </div>
              <div className="h-44 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.length > 0 ? pieData : [{ name: "No data", emails: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={pieData.length > 1 ? 3 : 0}
                      dataKey="emails"
                      stroke="none"
                    >
                      {(pieData.length > 0 ? pieData : [{ name: "No data", emails: 1 }]).map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={pieData.length > 0 ? COLORS[index % COLORS.length] : "#334155"}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#e2e8f0",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                      }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}
                      itemStyle={{ color: "#e2e8f0" }}
                      formatter={(value: number, name: string) => [
                        `${value} email${value !== 1 ? "s" : ""}`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black">{totalEmails}</span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Total</span>
                </div>
              </div>

              {/* Legend — full model names, no truncation */}
              <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "130px" }}>
                {modelShareData.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-2">No model data yet</p>
                ) : (
                  modelShareData.map((model, idx) => (
                    <div key={model.name} className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: model.emails > 0 ? COLORS[idx % COLORS.length] : "#475569" }}
                        />
                        <span
                          className="font-medium text-foreground leading-tight"
                          style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                        >
                          {model.name}
                        </span>
                      </div>
                      <span className="text-muted-foreground font-bold shrink-0 tabular-nums">
                        {model.emails > 0
                          ? `${model.emails} (${((model.emails / (totalEmails || 1)) * 100).toFixed(0)}%)`
                          : <span className="text-muted-foreground/50 text-[10px]">tokens only</span>}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Deliverability & Campaigns Row */}
        {isMounted && usageStats.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deliverability status widget (1/3) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  Deliverability Status
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Real-time tracking of sent messages, drafts, and failure metrics.
                </p>
              </div>

              {(() => {
                const totalDrafts = statusSummary.sent + statusSummary.ready + statusSummary.failed;
                const sentPct = totalDrafts > 0 ? (statusSummary.sent / totalDrafts) * 100 : 0;
                const readyPct = totalDrafts > 0 ? (statusSummary.ready / totalDrafts) * 100 : 0;
                const failedPct = totalDrafts > 0 ? (statusSummary.failed / totalDrafts) * 100 : 0;
                const successRate = totalDrafts > 0 ? ((statusSummary.sent + statusSummary.ready) / totalDrafts) * 100 : 0;

                return (
                  <div className="space-y-6 flex-1 flex flex-col justify-center">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-4xl font-extrabold text-foreground tracking-tight">
                          {successRate.toFixed(0)}%
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mt-1">
                          Generation Success
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-muted-foreground block">
                          Total: {totalDrafts}
                        </span>
                      </div>
                    </div>

                    {/* Visual segment bar */}
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex border border-border/20">
                        <div style={{ width: `${sentPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Sent: ${sentPct.toFixed(0)}%`} />
                        <div style={{ width: `${readyPct}%` }} className="bg-indigo-400 h-full transition-all" title={`Drafts: ${readyPct.toFixed(0)}%`} />
                        <div style={{ width: `${failedPct}%` }} className="bg-rose-500 h-full transition-all" title={`Failed: ${failedPct.toFixed(0)}%`} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-0.5">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Sent ({statusSummary.sent})
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          Ready ({statusSummary.ready})
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Failed ({statusSummary.failed})
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>

            {/* Recent Campaigns table (2/3) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Recent Campaigns
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Last 5 email generation campaigns and their execution statistics.
                </p>
              </div>

              <div className="flex-1 overflow-hidden min-h-[160px]">
                {recentCampaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <Mail className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-xs">No campaign execution history found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-full">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2 px-2">Campaign Name</th>
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2">Models Used</th>
                          <th className="py-2 px-2 text-right">Drafts</th>
                          <th className="py-2 px-2 text-right">Tokens</th>
                          <th className="py-2 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {recentCampaigns.map((camp) => {
                          const isSelected = camp.id === selectedCampaignId;
                          return (
                            <tr
                              key={camp.id}
                              onClick={() => setSelectedCampaignId(isSelected ? null : camp.id)}
                              className={`cursor-pointer transition-colors border-l-2 ${
                                isSelected
                                  ? "bg-primary/5 border-l-primary hover:bg-primary/10"
                                  : "hover:bg-muted/20 border-l-transparent"
                              }`}
                            >
                              <td className="py-2.5 px-2 font-bold text-foreground max-w-[140px] truncate" title={camp.name}>
                                <div className="flex items-center gap-1.5">
                                  {isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                  )}
                                  {camp.name}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                                {new Date(camp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="py-2.5 px-2 text-muted-foreground">
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {camp.modelsUsed.map((modelName) => (
                                    <span key={modelName} className="px-1.5 py-0.5 rounded bg-secondary/80 border border-border text-[9px] font-bold text-foreground/80">
                                      {modelName}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right font-bold text-foreground">{camp.draftCount}</td>
                              <td className="py-2.5 px-2 text-right text-muted-foreground font-mono tabular-nums">
                                {camp.tokensUsed >= 1000 ? `${(camp.tokensUsed / 1000).toFixed(1)}k` : camp.tokensUsed}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                                  camp.status === "completed"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : camp.status === "generating"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}>
                                  {camp.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Empty state for charts */}
        {isMounted && usageStats.length === 0 && (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No generation data yet. Generate some emails to see analytics!</p>
          </div>
        )}

        {/* Detailed Usage Logs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6"
        >
          <div className="border-b border-border pb-4">
            <h3 className="text-base font-bold text-foreground">Usage Logs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Chronological breakdown by model and day.</p>
          </div>

          {usageStats.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 border border-dashed border-border rounded-xl">
              <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No generation logs recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {usageStats.map((day, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {day.displayDate}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 font-bold bg-secondary px-2.5 py-1 rounded-full border border-border">
                      {day.totalEmails} {day.totalEmails === 1 ? "email" : "emails"} •{" "}
                      {(day.totalTokens / 1000).toFixed(1)}k tokens
                    </span>
                  </div>
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {day.models.map((stat, j) => (
                      <div
                        key={j}
                        className="flex flex-col gap-3 p-4 rounded-xl bg-background/50 border border-border/80 hover:border-primary/35 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold truncate max-w-[170px] text-foreground flex items-center gap-1.5">
                            {stat.modelId.includes("pro") ? (
                              <Brain className="w-4 h-4 text-violet-400" />
                            ) : stat.modelId.includes("flash") ? (
                              <Zap className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-blue-400" />
                            )}
                            {stat.name}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center h-[18px] text-[8px] font-bold uppercase px-2 rounded-full leading-none border ${
                              stat.isDeprecated
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            }`}
                          >
                            {stat.isDeprecated ? "Deprecated" : "Active"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30 text-xs">
                          <div>
                            <p className="font-black text-foreground">{stat.emailsGenerated}</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground opacity-75">Emails</p>
                          </div>
                          <div>
                            <p className="font-black text-foreground">{stat.tokensUsed >= 1000 ? `${(stat.tokensUsed / 1000).toFixed(1)}k` : stat.tokensUsed}</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground opacity-75">Tokens</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
