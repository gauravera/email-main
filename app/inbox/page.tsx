"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Send,
  FileText,
  Search,
  RefreshCw,
  Clock,
  User2,
  ChevronRight,
  Mail,
  AlertCircle,
  Sparkles,
  CornerUpLeft,
  X,
  Paperclip,
  Building2,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  timestamp: string;
  unread: boolean;
  messageIdHeader?: string;
}

interface BrandSignature {
  id: string;
  name: string;
  content: string;
}

interface BrandHeader {
  id: string;
  name: string;
  imageUrl: string;
}

interface BrandCta {
  id: string;
  name: string;
  text: string;
  link: string;
}

interface BrandProfile {
  id: string;
  brandName: string;
  companyDescription?: string;
  industry?: string;
  tone?: string;
  defaultSignatureId?: string;
  defaultHeaderId?: string;
  defaultCtaId?: string;
  signatures?: BrandSignature[];
  headers?: BrandHeader[];
  ctas?: BrandCta[];
}

export default function InboxPage() {
  const { status } = useSession();
  const router = useRouter();

  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "drafts">("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // States for AI Reply and manual Reply features
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyTab, setReplyTab] = useState<"write" | "ai">("write");
  const [replyTone, setReplyTone] = useState("Professional");
  const [replyPrompt, setReplyPrompt] = useState("");
  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [selectedBrandProfileId, setSelectedBrandProfileId] = useState("");
  const [selectedSignatureId, setSelectedSignatureId] = useState("");
  const [selectedHeaderId, setSelectedHeaderId] = useState("");
  const [selectedCtaId, setSelectedCtaId] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchEmails = useCallback(
    async (folder: "inbox" | "sent" | "drafts", query = "", silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setSelectedEmail(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await axios.get("/api/inbox", {
          params: {
            folder,
            q: query,
          },
        });
        const fetchedEmails = response.data.emails || [];
        setEmails(fetchedEmails);
      } catch (err: any) {
        console.error("Failed to load inbox emails:", err);
        toast.error("Failed to load emails: " + (err.response?.data?.error || err.message));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  const fetchBrandProfiles = useCallback(async () => {
    try {
      const response = await axios.get("/api/brands");
      const fetchedBrands = response.data.brands || [];
      setBrandProfiles(fetchedBrands);
      if (fetchedBrands.length > 0) {
        const firstBrand = fetchedBrands[0];
        setSelectedBrandProfileId(firstBrand.id);
        if (firstBrand.tone) setReplyTone(firstBrand.tone);
        
        const defSig = firstBrand.signatures?.find((s: any) => s.isDefault);
        if (defSig) setSelectedSignatureId(defSig.id);
        
        const defHeader = firstBrand.headers?.find((h: any) => h.isDefault);
        if (defHeader) setSelectedHeaderId(defHeader.id);
        
        const defCta = firstBrand.ctas?.find((c: any) => c.isDefault);
        if (defCta) setSelectedCtaId(defCta.id);
      }
    } catch (err) {
      console.error("Failed to load brand profiles:", err);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEmails(activeFolder, searchQuery);
      fetchBrandProfiles();
    }
  }, [status, activeFolder, fetchEmails, fetchBrandProfiles]);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandProfileId(brandId);
    if (!brandId) {
      setSelectedSignatureId("");
      setSelectedHeaderId("");
      setSelectedCtaId("");
      return;
    }
    const brand = brandProfiles.find((b) => b.id === brandId);
    if (brand) {
      if (brand.tone) setReplyTone(brand.tone);
      
      const defSig = brand.signatures?.find((s: any) => s.isDefault);
      setSelectedSignatureId(defSig ? defSig.id : "");
      
      const defHeader = brand.headers?.find((h: any) => h.isDefault);
      setSelectedHeaderId(defHeader ? defHeader.id : "");
      
      const defCta = brand.ctas?.find((c: any) => c.isDefault);
      setSelectedCtaId(defCta ? defCta.id : "");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectEmail = async (email: EmailMessage) => {
    setSelectedEmail(email);
    setReplyText("");
    setReplyPrompt("");
    setAttachments([]);

    if (email.unread) {
      // Optimistically mark as read in UI
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, unread: false } : e))
      );

      try {
        await axios.patch("/api/inbox", { messageId: email.id });
      } catch (err) {
        console.error("Failed to mark email as read in Gmail:", err);
      }
    }
  };

  const handleGenerateAiReply = async () => {
    if (!selectedEmail) return;
    setIsGeneratingReply(true);

    try {
      const response = await axios.post("/api/inbox/reply-suggestion", {
        emailSubject: selectedEmail.subject,
        emailBody: selectedEmail.body,
        sender: selectedEmail.from,
        tone: replyTone,
        prompt: replyPrompt,
        brandProfileId: selectedBrandProfileId || undefined,
      });

      setReplyText(response.data.reply || "");
      setReplyTab("write"); // Switch back to editor view to review it
      toast.success("AI draft generated successfully!");
    } catch (err: any) {
      console.error("Failed to generate AI suggestion:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to generate AI suggestion");
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyText.trim()) {
      toast.warning("Please draft a reply before sending.");
      return;
    }

    setIsSendingReply(true);

    try {
      let replySubject = selectedEmail.subject;
      if (!replySubject.toLowerCase().startsWith("re:")) {
        replySubject = `Re: ${replySubject}`;
      }

      const senderStr = selectedEmail.from;
      const emailMatch = senderStr.match(/<([^>]+)>/) || senderStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const recipientEmail = emailMatch ? emailMatch[1].trim() : senderStr.trim();

      let finalBody = replyText.replace(/\n/g, "<br />");
      const brand = brandProfiles.find(b => b.id === selectedBrandProfileId);

      // Prepend Header Image
      if (selectedHeaderId && brand) {
        const header = brand.headers?.find(h => h.id === selectedHeaderId);
        if (header && header.imageUrl) {
          finalBody = `<div style="text-align: center; margin-bottom: 24px;"><img src="${header.imageUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Header" /></div>\n\n` + finalBody;
        }
      }
      
      // Append CTA Button
      if (selectedCtaId && brand) {
        const cta = brand.ctas?.find(c => c.id === selectedCtaId);
        if (cta && cta.text && cta.link) {
          finalBody += `\n\n<div style="text-align: center; margin: 32px 0;"><a href="${cta.link}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">${cta.text}</a></div>`;
        }
      }

      // Append signature if one is selected
      if (selectedSignatureId && brand) {
        const signature = brand.signatures?.find(s => s.id === selectedSignatureId);
        if (signature) {
          finalBody += `\n\n${signature.content}`;
        }
      }

      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return {
            name: file.name,
            type: file.type,
            content: base64,
            encoding: 'base64',
          };
        })
      );

      await axios.post("/api/send-email", {
        to: recipientEmail,
        subject: replySubject,
        body: finalBody,
        threadId: selectedEmail.threadId,
        originalMessageId: selectedEmail.messageIdHeader || undefined,
        attachments: attachmentData.length > 0 ? attachmentData : undefined,
      });

      toast.success("Reply sent successfully!");
      setReplyText("");
      setReplyPrompt("");
      setAttachments([]);
      setIsReplyOpen(false);
    } catch (err: any) {
      console.error("Failed to send reply:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Debounced search trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmails(activeFolder, searchQuery);
  };


  const getSenderInitials = (fromStr: string) => {
    // Extract name if in format "Name <email@domain.com>"
    const nameMatch = fromStr.match(/^"([^"]+)"|([A-Za-z0-9\s]+)/);
    const name = nameMatch ? nameMatch[0].replace(/"/g, "").trim() : fromStr;
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getSenderName = (fromStr: string) => {
    const emailIndex = fromStr.indexOf("<");
    if (emailIndex !== -1) {
      return fromStr.substring(0, emailIndex).replace(/"/g, "").trim();
    }
    return fromStr;
  };

  const formatEmailDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      // If today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      // If within this year, show Month Day
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
      return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return dateStr;
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground flex flex-col items-center gap-4">
          <Inbox className="w-12 h-12 text-primary" />
          <p className="text-sm font-medium">Checking Gmail credentials...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="flex flex-col flex-1 h-screen bg-background overflow-hidden">
      <ToastContainer position="bottom-right" theme="dark" autoClose={4000} />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Folders & Search & List */}
        <div className="w-full md:w-[420px] shrink-0 border-r border-border flex flex-col h-full bg-card/40">
          {/* Header & Sync */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary animate-pulse" />
              Gmail Reader
            </h1>
            <button
              onClick={() => fetchEmails(activeFolder, searchQuery, true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 active:scale-95 transition-all text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Refresh Folder"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-border">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search emails in this folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            </form>
          </div>


          {/* Emails Scroll List */}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <AnimatePresence mode="wait">
              {isLoading ? (
                // Shimmer Loader Skeletons
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 space-y-3"
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-border bg-input animate-pulse space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-32 bg-muted rounded-full" />
                        <div className="h-3 w-12 bg-muted rounded-full" />
                      </div>
                      <div className="h-3.5 w-48 bg-muted rounded-full" />
                      <div className="h-3 w-full bg-muted rounded-full" />
                    </div>
                  ))}
                </motion.div>
              ) : emails.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-12 text-center h-[200px]"
                >
                  <AlertCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <span className="text-sm font-semibold text-foreground">No Emails Found</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    No conversations match this label or filter.
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="divide-y divide-border"
                >
                  {emails.map((email) => {
                    const isSelected = selectedEmail?.id === email.id;
                    const senderName = getSenderName(email.from);

                    return (
                      <motion.div
                        key={email.id}
                        onClick={() => handleSelectEmail(email)}
                        whileHover={{ backgroundColor: "rgba(var(--foreground-rgb), 0.02)" }}
                        className={`p-4 cursor-pointer transition-all flex gap-3 relative select-none ${
                          isSelected
                            ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary"
                            : "border-l-4 border-l-transparent hover:bg-secondary/40"
                        }`}
                      >
                        {/* Avatar / Initials */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border flex items-center justify-center font-bold text-xs text-primary shrink-0 select-none">
                          {getSenderInitials(email.from)}
                        </div>

                        {/* Summary details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span
                              className={`text-xs truncate block ${
                                email.unread ? "font-bold text-foreground" : "font-semibold text-muted-foreground"
                              }`}
                            >
                              {senderName}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80 shrink-0 font-medium tabular-nums flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatEmailDate(email.timestamp)}
                            </span>
                          </div>
                          <span
                            className={`text-xs block truncate mt-1 ${
                              email.unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground/90"
                            }`}
                          >
                            {email.subject}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-normal line-clamp-2">
                            {email.snippet}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {email.unread && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COLUMN: Reading View Pane */}
        <div className="hidden md:flex flex-1 flex-col h-full bg-background relative min-w-0">
          <AnimatePresence mode="wait">
            {!selectedEmail ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 text-muted-foreground/30">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Select an Email</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Click on any conversation from the list to view its message details here.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedEmail.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
              >
                {/* Email Subject Title — sticky so it stays visible while scrolling */}
                <div className="sticky top-0 z-10 px-6 py-5 border-b border-border bg-background/95 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-foreground leading-tight tracking-tight">
                    {selectedEmail.subject}
                  </h2>
                </div>

                {/* Sender / Recipient Metadata Details — sticky below subject */}
                <div className="sticky top-[68px] z-10 px-6 py-4 border-b border-border flex items-center gap-3 bg-background/95 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary select-none shrink-0">
                    {getSenderInitials(selectedEmail.from)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground leading-snug">
                        {selectedEmail.from}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(selectedEmail.timestamp).toLocaleString()}
                        </span>
                        <button
                          onClick={() => setIsReplyOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                          Reply
                        </button>
                      </div>
                    </div>
                    {selectedEmail.to && (
                      <p className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">
                        To: {selectedEmail.to}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Content Body — white box sizes to content, no extra height */}
                <div className="p-6 pb-8 select-text selection:bg-primary/25">
                  <div className="bg-[#ffffff] text-slate-900 rounded-2xl border border-border p-8 shadow-md select-text max-w-4xl mx-auto w-full overflow-x-hidden">
                    {/* Render plain-text with formatting preserve, or html if matched */}
                    {selectedEmail.body.includes("<div") || selectedEmail.body.includes("<p") || selectedEmail.body.includes("<span") || selectedEmail.body.includes("<table") ? (
                      <div
                        className="text-sm text-slate-800 leading-relaxed font-sans select-text break-words prose max-w-none [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:block [&_table]:max-w-full [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                      />
                    ) : (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed select-text font-sans break-words">
                        {selectedEmail.body}
                      </p>
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Premium Reply Dialog Modal with AI Assistant */}
      <AnimatePresence>
        {isReplyOpen && selectedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Glassmorphic Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReplyOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            {/* Modal Dialog Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10 max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CornerUpLeft className="w-4 h-4 text-primary" />
                    Reply to {getSenderName(selectedEmail.from)}
                  </h3>
                  <span className="text-[10px] text-muted-foreground truncate max-w-md font-medium">
                    Subject: {selectedEmail.subject}
                  </span>
                </div>
                <button
                  onClick={() => setIsReplyOpen(false)}
                  className="p-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 active:scale-95 transition-all text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Container with scroll */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                
                {/* Dashboard-style Brand & Design Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0 border-b border-border pb-4">
                  {/* Row 1 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Brand Profile
                    </label>
                    <select
                      value={selectedBrandProfileId}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer ${
                        selectedBrandProfileId ? "text-emerald-500 font-medium" : "text-foreground"
                      }`}
                    >
                      <option value="">No Brand (Manual Settings)</option>
                      {brandProfiles.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.brandName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Header Image
                    </label>
                    <select
                      value={selectedHeaderId}
                      onChange={(e) => setSelectedHeaderId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer ${
                        selectedHeaderId ? "text-emerald-500 font-medium" : "text-foreground"
                      }`}
                      disabled={!selectedBrandProfileId || !brandProfiles.find(b => b.id === selectedBrandProfileId)?.headers?.length}
                    >
                      <option value="">No Header</option>
                      {brandProfiles.find(b => b.id === selectedBrandProfileId)?.headers?.map((header) => (
                        <option key={header.id} value={header.id}>
                          {header.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-primary" />
                      CTA Button
                    </label>
                    <select
                      value={selectedCtaId}
                      onChange={(e) => setSelectedCtaId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer ${
                        selectedCtaId ? "text-emerald-500 font-medium" : "text-foreground"
                      }`}
                      disabled={!selectedBrandProfileId || !brandProfiles.find(b => b.id === selectedBrandProfileId)?.ctas?.length}
                    >
                      <option value="">No CTA Button</option>
                      {brandProfiles.find(b => b.id === selectedBrandProfileId)?.ctas?.map((cta) => (
                        <option key={cta.id} value={cta.id}>
                          {cta.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Signature
                    </label>
                    <select
                      value={selectedSignatureId}
                      onChange={(e) => setSelectedSignatureId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer ${
                        selectedSignatureId ? "text-emerald-500 font-medium" : "text-foreground"
                      }`}
                      disabled={!selectedBrandProfileId || !brandProfiles.find(b => b.id === selectedBrandProfileId)?.signatures?.length}
                    >
                      <option value="">No Signature</option>
                      {brandProfiles.find(b => b.id === selectedBrandProfileId)?.signatures?.map((sig) => (
                        <option key={sig.id} value={sig.id}>
                          {sig.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-secondary/80 p-1 rounded-xl border border-border">
                    <button
                      onClick={() => setReplyTab("write")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        replyTab === "write"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Write Reply
                    </button>
                    <button
                      onClick={() => setReplyTab("ai")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        replyTab === "ai"
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      AI Reply Assistant
                    </button>
                  </div>
                </div>

                {/* TAB 1: WRITE / EDIT REPLY */}
                {replyTab === "write" && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Draft your reply to ${getSenderName(selectedEmail.from)} here...`}
                      className="w-full flex-1 p-4 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground custom-scrollbar resize-none placeholder:text-muted-foreground/50 min-h-[150px]"
                    />
                    
                    {/* Attachments Section (Dashboard Style) */}
                    <div className="flex flex-col min-w-0 mt-2">
                      <label className="cursor-pointer group flex flex-col items-center justify-center bg-secondary/5 rounded-2xl border border-dashed border-border py-6 px-4 mb-4 hover:border-primary/50 hover:bg-primary/5 transition-all">
                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner">
                          <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground group-hover:text-primary transition-colors text-center">
                          Drop Files or Click to Attach
                        </span>
                      </label>

                      {attachments.length > 0 && (
                        <div className="flex flex-col min-w-0 mb-4">
                          <div className="flex flex-col gap-2 w-full max-h-[150px] overflow-y-auto custom-scrollbar">
                            {attachments.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-xs shadow-sm hover:border-primary/50 transition-all">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                                  <span className="truncate flex-1 font-medium" title={file.name}>{file.name}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)}kb)</span>
                                </div>
                                <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 px-1 text-base leading-none">&times;</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between shrink-0">
                      <div></div>
                      <div className="flex justify-end gap-2">
                      {replyText.trim() && (
                        <button
                          onClick={() => setReplyText("")}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all active:scale-95"
                        >
                          Clear Draft
                        </button>
                      )}
                      <button
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                        className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition-all active:scale-95 flex items-center gap-2 shadow-md shadow-primary/10 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
                      >
                        {isSendingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

                {/* TAB 2: AI ASSISTANT INPUTS */}
                {replyTab === "ai" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tone Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Select Tone
                        </label>
                        <select
                          value={replyTone}
                          onChange={(e) => setReplyTone(e.target.value)}
                          className="w-full bg-input border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                        >
                          <option value="Professional">💼 Professional & Direct</option>
                          <option value="Friendly">😊 Friendly & Casual</option>
                          <option value="Persuasive">🔥 Persuasive & Convincing</option>
                          <option value="Bold">⚡ Bold & Authoritative</option>
                          <option value="Concise">✏️ Short & Concise</option>
                        </select>
                      </div>

                      {/* Brand Context Note */}
                      <div className="flex flex-col justify-center">
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          AI will draft your reply using the <strong className="text-foreground">{brandProfiles.find(b => b.id === selectedBrandProfileId)?.brandName || "selected"}</strong> brand profile knowledge base and the selected tone.
                        </p>
                      </div>
                    </div>

                    {/* Reply Prompt Instruction */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        What do you want to say in your reply?
                      </label>
                      <textarea
                        value={replyPrompt}
                        onChange={(e) => setReplyPrompt(e.target.value)}
                        placeholder="e.g. Say yes to the introduction, suggest a meeting next Thursday afternoon, and ask for their pitch deck..."
                        rows={3}
                        className="w-full p-3.5 text-xs bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground custom-scrollbar resize-none placeholder:text-muted-foreground/45"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleGenerateAiReply}
                        disabled={isGeneratingReply}
                        className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 shadow-md shadow-primary/10 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center gap-2"
                      >
                        {isGeneratingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Generating Reply Draft...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Draft Reply with AI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
