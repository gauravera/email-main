"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Mail, Send, Calendar, Clock, BarChart3 } from "lucide-react";

interface DraftData {
  createdAt: string;
  sentAt: string | null;
  status: string;
}

interface UsageData {
  createdAt: string;
  tokensUsed: number;
}

interface UserAnalyticsChartsProps {
  drafts: DraftData[];
  geminiUsage: UsageData[];
}

type TimeRange = "hourly" | "daily" | "monthly";

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function UserAnalyticsCharts({ drafts, geminiUsage }: UserAnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const [showGenerated, setShowGenerated] = useState(true);
  const [showSent, setShowSent] = useState(true);

  // Selector states
  const [selectedHourlyDate, setSelectedHourlyDate] = useState(() => getLocalDateKey(new Date()));
  const [selectedDailyMonth, setSelectedDailyMonth] = useState(() => new Date().getMonth());
  const [selectedDailyYear, setSelectedDailyYear] = useState(() => new Date().getFullYear());
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState(() => new Date().getFullYear());

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute available active years from drafts and geminiUsage history
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    drafts.forEach((draft) => {
      if (draft.createdAt) {
        const y = new Date(draft.createdAt).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
      if (draft.sentAt) {
        const y = new Date(draft.sentAt).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });

    geminiUsage.forEach((usage) => {
      if (usage.createdAt) {
        const y = new Date(usage.createdAt).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [drafts, geminiUsage]);

  const chartData = useMemo(() => {
    if (!mounted) return [];

    if (timeRange === "hourly") {
      const parts = selectedHourlyDate.split("-");
      const targetYear = parseInt(parts[0], 10);
      const targetMonthIdx = parseInt(parts[1], 10) - 1;
      const targetDay = parseInt(parts[2], 10);

      // 1. Hourly: Chosen Day
      const hours = Array.from({ length: 24 }).map((_, idx) => {
        const d = new Date(targetYear, targetMonthIdx, targetDay, idx, 0, 0, 0);
        return {
          hourIdx: idx,
          label: d.toLocaleTimeString([], { hour: "numeric", hour12: true }),
          mailsGenerated: 0,
          mailsSent: 0,
        };
      });

      drafts.forEach((draft) => {
        const draftDate = new Date(draft.createdAt);
        if (
          draftDate.getFullYear() === targetYear &&
          draftDate.getMonth() === targetMonthIdx &&
          draftDate.getDate() === targetDay
        ) {
          const hourIdx = draftDate.getHours();
          const slot = hours.find((h) => h.hourIdx === hourIdx);
          if (slot) {
            slot.mailsGenerated += 1;
            if (draft.status === "sent") {
              slot.mailsSent += 1;
            }
          }
        }
      });

      return hours.map((h) => ({
        name: h.label,
        "Mails Generated": h.mailsGenerated,
        "Mails Sent": h.mailsSent,
      }));
    } else if (timeRange === "daily") {
      // 2. Daily: Custom Month/Year
      const year = selectedDailyYear;
      const monthIdx = selectedDailyMonth;
      const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();

      const days = Array.from({ length: totalDaysInMonth }).map((_, idx) => {
        const d = new Date(year, monthIdx, idx + 1);
        return {
          key: getLocalDateKey(d),
          label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
          dateObj: d,
          mailsGenerated: 0,
          mailsSent: 0,
        };
      });

      drafts.forEach((draft) => {
        const draftDate = new Date(draft.createdAt);
        if (
          draftDate.getFullYear() === year &&
          draftDate.getMonth() === monthIdx
        ) {
          const dateKey = getLocalDateKey(draftDate);
          const slot = days.find((day) => day.key === dateKey);
          if (slot) {
            slot.mailsGenerated += 1;
          }
        }

        if (draft.status === "sent" && draft.sentAt) {
          const sentDate = new Date(draft.sentAt);
          if (
            sentDate.getFullYear() === year &&
            sentDate.getMonth() === monthIdx
          ) {
            const sentKey = getLocalDateKey(sentDate);
            const sentSlot = days.find((day) => day.key === sentKey);
            if (sentSlot) {
              sentSlot.mailsSent += 1;
            }
          }
        }
      });

      return days.map((d) => ({
        name: d.label,
        "Mails Generated": d.mailsGenerated,
        "Mails Sent": d.mailsSent,
      }));
    } else {
      // 3. Monthly: Custom Year
      const currentYear = selectedMonthlyYear;
      const months = Array.from({ length: 12 }).map((_, idx) => {
        const d = new Date(currentYear, idx, 1);
        return {
          monthIdx: idx,
          label: d.toLocaleDateString([], { month: "short" }),
          mailsGenerated: 0,
          mailsSent: 0,
        };
      });

      drafts.forEach((draft) => {
        const draftDate = new Date(draft.createdAt);
        if (draftDate.getFullYear() === currentYear) {
          const mIdx = draftDate.getMonth();
          const slot = months.find((m) => m.monthIdx === mIdx);
          if (slot) {
            slot.mailsGenerated += 1;
          }
        }

        if (draft.status === "sent" && draft.sentAt) {
          const sentDate = new Date(draft.sentAt);
          if (sentDate.getFullYear() === currentYear) {
            const mIdx = sentDate.getMonth();
            const slot = months.find((m) => m.monthIdx === mIdx);
            if (slot) {
              slot.mailsSent += 1;
            }
          }
        }
      });

      return months.map((m) => ({
        name: m.label,
        "Mails Generated": m.mailsGenerated,
        "Mails Sent": m.mailsSent,
      }));
    }
  }, [
    mounted,
    timeRange,
    drafts,
    geminiUsage,
    selectedHourlyDate,
    selectedDailyMonth,
    selectedDailyYear,
    selectedMonthlyYear,
  ]);

  // Helper for Hourly localized text representation
  const getHourlyDateLabel = () => {
    const parts = selectedHourlyDate.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString([], { dateStyle: "long" });
  };

  if (!mounted) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm animate-pulse">
        <p className="text-muted-foreground text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 animate-bounce" /> Loading analytics charts...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-lg p-4 sm:p-6 mb-8 transition-all duration-300 hover:shadow-xl hover:border-border/80">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Usage Visualization
          </h2>
          <p className="text-xs text-muted-foreground">
            {timeRange === "hourly"
              ? `Showing hourly usage for ${getHourlyDateLabel()}`
              : timeRange === "daily"
              ? `Showing daily usage for ${new Date(selectedDailyYear, selectedDailyMonth, 1).toLocaleDateString([], { month: "long", year: "numeric" })}`
              : `Showing monthly usage for the year ${selectedMonthlyYear}`}
          </p>
        </div>

        {/* Dynamic Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time range selectors */}
          {timeRange === "hourly" && (
            <input
              type="date"
              value={selectedHourlyDate}
              onChange={(e) => setSelectedHourlyDate(e.target.value)}
              className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-8 animate-in fade-in slide-in-from-top-1 duration-200"
            />
          )}

          {timeRange === "daily" && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <select
                value={selectedDailyMonth}
                onChange={(e) => setSelectedDailyMonth(parseInt(e.target.value, 10))}
                className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-8"
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    {new Date(2026, idx, 1).toLocaleDateString([], { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                value={selectedDailyYear}
                onChange={(e) => setSelectedDailyYear(parseInt(e.target.value, 10))}
                className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-8"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeRange === "monthly" && (
            <select
              value={selectedMonthlyYear}
              onChange={(e) => setSelectedMonthlyYear(parseInt(e.target.value, 10))}
              className="bg-background border border-border text-foreground hover:bg-muted font-medium py-1 px-2.5 rounded-lg text-xs transition-all shadow-sm outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-8 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}

          {/* Time range buttons */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              onClick={() => setTimeRange("hourly")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                timeRange === "hourly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Hourly
            </button>
            <button
              onClick={() => setTimeRange("daily")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                timeRange === "daily"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Daily
            </button>
            <button
              onClick={() => setTimeRange("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                timeRange === "monthly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Monthly
            </button>
          </div>

          {/* Metric visibility toggles */}
          <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-border sm:pl-3">
            <button
              onClick={() => setShowGenerated(!showGenerated)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-all duration-250 ${
                showGenerated
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-transform ${
                  showGenerated ? "bg-indigo-500 scale-100" : "bg-muted-foreground scale-75"
                }`}
              />
              Generated
            </button>
            <button
              onClick={() => setShowSent(!showSent)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-all duration-250 ${
                showSent
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-transform ${
                  showSent ? "bg-emerald-500 scale-100" : "bg-muted-foreground scale-75"
                }`}
              />
              Sent
            </button>
          </div>
        </div>
      </div>

      <div className="w-full h-[320px] sm:h-[360px] relative">
        {(!showGenerated && !showSent) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-xl border border-dashed border-border/80">
            <p className="text-sm font-semibold text-muted-foreground mb-1">No metrics visible</p>
            <p className="text-xs text-muted-foreground/80 max-w-[280px]">
              Toggle either "Generated" or "Sent" above to visualize statistics on the graph.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorGenerated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                dy={10}
                className="text-[10px] sm:text-xs fill-muted-foreground font-medium"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                dx={-5}
                allowDecimals={false}
                className="text-[10px] sm:text-xs fill-muted-foreground font-medium"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-xl p-3.5 space-y-1.5 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-[11px] font-bold text-muted-foreground/90 uppercase tracking-wider mb-1">
                          {label}
                        </p>
                        {payload.map((p, idx) => {
                          const isSent = p.name === "Mails Sent";
                          return (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isSent ? "bg-emerald-500" : "bg-indigo-500"
                                  }`}
                                />
                                {isSent ? "Sent" : "Generated"}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {p.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showGenerated && (
                <Area
                  type="monotone"
                  dataKey="Mails Generated"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGenerated)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#6366f1" }}
                  animationDuration={600}
                />
              )}
              {showSent && (
                <Area
                  type="monotone"
                  dataKey="Mails Sent"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                  animationDuration={600}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
