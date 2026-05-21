"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { History, Calendar, CheckCircle2, XCircle, Clock, MessageSquare, ExternalLink } from "lucide-react";
import { useDashboard, EmailPreview } from "@/context/dashboard-context";

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"campaigns" | "chat">("campaigns");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    setCsvData, setParsedData, setHasDataHeader, setFileName,
    setActiveTab: setGlobalActiveTab, setTotalRecipients, setPrompt, setModel,
    setPreviews, setHeaders, setFailedEmails, setActiveCampaignId
  } = useDashboard();

  const handleOpenInDashboard = (campaign: any) => {
    if (!campaign.drafts || campaign.drafts.length === 0) {
      alert("No drafts in this campaign to load.");
      return;
    }

    const firstDraft = campaign.drafts[0];
    let firstOriginal: any;
    try {
      firstOriginal = typeof firstDraft.recipientData === "string" ? JSON.parse(firstDraft.recipientData) : firstDraft.recipientData;
    } catch (e) {
      firstOriginal = firstDraft.recipientData;
    }

    let reconstructedHeaders: string[] = [];
    if (Array.isArray(firstOriginal)) {
      reconstructedHeaders = firstOriginal.map((_, idx) => `Column ${idx + 1}`);
    } else if (typeof firstOriginal === "object" && firstOriginal !== null) {
      reconstructedHeaders = Object.keys(firstOriginal);
    }

    const reconstructedRows: string[][] = [];
    reconstructedRows.push(reconstructedHeaders);

    campaign.drafts.forEach((draft: any) => {
      let originalObj: any;
      try {
        originalObj = typeof draft.recipientData === "string" ? JSON.parse(draft.recipientData) : draft.recipientData;
      } catch (e) {
        originalObj = draft.recipientData;
      }

      if (Array.isArray(originalObj)) {
        reconstructedRows.push(originalObj.map(val => String(val)));
      } else if (typeof originalObj === "object" && originalObj !== null) {
        const row = reconstructedHeaders.map(h => String(originalObj[h] ?? ""));
        reconstructedRows.push(row);
      } else {
        reconstructedRows.push([String(originalObj)]);
      }
    });

    const mappedPreviews: EmailPreview[] = campaign.drafts.map((draft: any) => {
      let generatedObj: any = null;
      try {
        generatedObj = typeof draft.generatedText === "string" ? JSON.parse(draft.generatedText) : draft.generatedText;
      } catch (e) {
        generatedObj = draft.generatedText;
      }

      let originalObj: any = null;
      try {
        originalObj = typeof draft.recipientData === "string" ? JSON.parse(draft.recipientData) : draft.recipientData;
      } catch (e) {
        originalObj = draft.recipientData;
      }

      return {
        id: draft.id,
        recipientEmail: draft.recipientEmail,
        generated: generatedObj,
        original: originalObj,
        status: draft.status
      };
    });

    setCsvData(reconstructedRows);
    setParsedData(reconstructedRows);
    setHasDataHeader(true);
    setFileName(`Campaign_${campaign.id}`);
    setGlobalActiveTab("csv");
    setTotalRecipients(campaign.drafts.length);

    setPrompt(campaign.prompt);
    setModel(campaign.model);
    setPreviews(mappedPreviews);
    setHeaders(reconstructedHeaders);

    const newFailed = new Set<number>();
    mappedPreviews.forEach((p, idx) => {
      if (p.status === "failed" || !p.recipientEmail || p.recipientEmail === "INVALID_EMAIL") {
        newFailed.add(idx);
      }
    });
    setFailedEmails(newFailed);
    setActiveCampaignId(campaign.id);

    router.push("/");
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      axios.get("/api/campaigns")
        .then((res) => {
          setCampaigns(res.data.campaigns || []);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [status]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground flex items-center gap-2">
          <History className="w-5 h-5" /> Loading history...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="flex flex-col flex-1 bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            History
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Your past campaigns and AI chat sessions.</p>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "campaigns"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "chat"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Chat History
          </button>
        </div>

          {/* Campaigns Tab */}
          {activeTab === "campaigns" && (
            <div>

              {campaigns.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Campaigns Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate some emails to see your history here!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {campaigns.map((campaign, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={campaign.id}
                      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
                    >
                      <div className="p-6 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground">{campaign.name}</h2>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(campaign.createdAt).toLocaleString()}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                              {campaign.model}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <button
                            onClick={() => handleOpenInDashboard(campaign)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/95 active:scale-95 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open in Dashboard
                          </button>
                          <div className="flex flex-col items-center p-2 rounded-xl bg-background border border-border">
                            <span className="text-2xl font-bold text-foreground">{campaign.drafts.length}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">Drafts</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="mb-4 text-sm">
                          <span className="font-semibold text-foreground">Master Prompt:</span>
                          <p className="mt-1 p-3 bg-input rounded-xl border border-border text-muted-foreground text-xs italic">
                            &ldquo;{campaign.prompt}&rdquo;
                          </p>
                        </div>

                        <div className="mt-6 space-y-3">
                          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Drafts</h3>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {campaign.drafts.map((draft: any) => {
                              let parsedGenerated;
                              try { parsedGenerated = JSON.parse(draft.generatedText); } catch(e) {}

                              return (
                                <div key={draft.id} className="p-4 rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-foreground truncate block max-w-[150px]" title={draft.recipientEmail}>
                                      {draft.recipientEmail || "Unknown"}
                                    </span>
                                    {draft.status === "sent" ? (
                                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase">
                                        <CheckCircle2 className="w-3 h-3" /> Sent
                                      </span>
                                    ) : draft.status === "failed" ? (
                                      <span className="flex items-center gap-1 text-[10px] text-destructive font-bold uppercase">
                                        <XCircle className="w-3 h-3" /> Failed
                                      </span>
                                    ) : draft.status === "ready" ? (
                                      <span className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase">
                                        <CheckCircle2 className="w-3 h-3" /> Ready
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase">
                                        <Clock className="w-3 h-3" /> {draft.status}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                    {parsedGenerated?.subject ? (
                                      <strong>Sub: {parsedGenerated.subject}</strong>
                                    ) : null}
                                    <br />
                                    {parsedGenerated?.blocks?.[0]?.content?.text || "No content preview..."}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Chat History Tab */}
          {activeTab === "chat" && (
            <div>
              <div className="text-center py-20 bg-card rounded-2xl border border-border">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  We&apos;re working on saving your AI chat sessions so you can refer back to them anytime. Stay tuned!
                </p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
