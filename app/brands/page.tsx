"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Edit2, Trash2, Globe, Briefcase, Users, 
  Target, MessageSquare, Loader2, Building2, ChevronRight, Layers
} from "lucide-react";
import axios from "axios";
import { BrandModal } from "@/components/brands/brand-modal";
import { BrandAssetsPanel } from "@/components/brands/brand-assets-panel";
import { toast } from "sonner";

interface BrandProfile {
  id: string;
  brandName: string;
  websiteUrl: string | null;
  companyDescription: string | null;
  industry: string | null;
  targetAudience: string | null;
  tone: string | null;
  primaryGoal: string | null;
  createdAt: string;
}

interface BrandAssets {
  signatures: any[];
  ctas: any[];
  headers: any[];
}

export default function BrandProfilesPage() {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandProfile | null>(null);

  // Assets panel state
  const [assetsBrand, setAssetsBrand] = useState<BrandProfile | null>(null);
  const [assets, setAssets] = useState<BrandAssets>({ signatures: [], ctas: [], headers: [] });
  const [assetsLoading, setAssetsLoading] = useState(false);

  const fetchBrands = async () => {
    try {
      const res = await axios.get("/api/brands");
      setBrands(res.data.brands);
    } catch {
      toast.error("Failed to load brand profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const openAssetsPanel = async (brand: BrandProfile) => {
    setAssetsBrand(brand);
    setAssetsLoading(true);
    try {
      const res = await axios.get(`/api/brands/${brand.id}/assets`);
      setAssets(res.data);
    } catch {
      toast.error("Failed to load brand assets");
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brand profile?")) return;
    try {
      await axios.delete(`/api/brands/${id}`);
      setBrands(brands.filter(b => b.id !== id));
      toast.success("Brand profile deleted");
    } catch {
      toast.error("Failed to delete brand profile");
    }
  };

  const filteredBrands = brands.filter(b =>
    b.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.industry?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 bg-background overflow-y-auto">
      <main className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
              Brand <span className="text-primary">Profiles</span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">
              Manage your workspace identities. Attach signatures, CTAs, and headers to each profile.
            </p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingBrand(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Create Profile</span>
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search brands or industries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Loading profiles...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border-2 border-dashed border-border bg-card/50 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No brand profiles found</h3>
            <p className="text-muted-foreground max-w-xs mb-8">
              {searchQuery ? "No brands match your search." : "Create your first brand profile to get started."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-all"
              >
                Get Started
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredBrands.map((brand, index) => (
                <motion.div
                  key={brand.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-xl font-bold text-primary">{brand.brandName[0]}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingBrand(brand); setIsModalOpen(true); }}
                        className="p-2 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground transition-colors"
                        title="Edit profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand.id)}
                        className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                        title="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {brand.brandName}
                  </h3>
                  {brand.websiteUrl && (
                    <a
                      href={brand.websiteUrl.startsWith('http') ? brand.websiteUrl : `https://${brand.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 mb-4 truncate"
                    >
                      <Globe className="w-3 h-3" />
                      {brand.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="font-medium text-foreground/80">{brand.industry || "General"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {brand.companyDescription || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {brand.tone && (
                        <div title={`Tone: ${brand.tone}`} className="w-7 h-7 rounded-full bg-accent/20 border-2 border-card flex items-center justify-center">
                          <MessageSquare className="w-3 h-3 text-accent" />
                        </div>
                      )}
                      {brand.targetAudience && (
                        <div title={`Audience: ${brand.targetAudience}`} className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center">
                          <Users className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      {brand.primaryGoal && (
                        <div title={`Goal: ${brand.primaryGoal}`} className="w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-card flex items-center justify-center">
                          <Target className="w-3 h-3 text-emerald-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAssetsPanel(brand)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
                      >
                        <Layers className="w-3 h-3" /> Assets
                      </button>
                      <span className="text-border">|</span>
                      <button
                        onClick={() => { setEditingBrand(brand); setIsModalOpen(true); }}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 hover:gap-2 transition-all"
                      >
                        Configure <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Brand Profile Modal */}
      <BrandModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBrand(null); }}
        onSuccess={fetchBrands}
        editingBrand={editingBrand}
      />

      {/* Brand Assets Side Panel */}
      <AnimatePresence>
        {assetsBrand && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssetsBrand(null)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gradient-to-r from-accent/5 to-primary/5">
                <div>
                  <h2 className="font-bold text-foreground">{assetsBrand.brandName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage brand assets</p>
                </div>
                <button
                  onClick={() => setAssetsBrand(null)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {assetsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <BrandAssetsPanel
                    brandId={assetsBrand.id}
                    assets={assets}
                    onAssetsChange={setAssets}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
