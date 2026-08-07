"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import {
    Palette, Sparkles, Wand2, Loader2, Download, RefreshCw,
    Sun, Moon, Check, ChevronDown, Type, Building2, Layers,
    Gem, Hexagon, Box, PenTool, Shapes, Minimize2, Zap, Crown, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { Eye } from "lucide-react";
import { ProductPicker } from "@/components/marketing/ProductPicker";

const LOGO_STYLES = [
    { id: "minimal", label: "Minimal", icon: Minimize2 },
    { id: "modern", label: "Modern", icon: Zap },
    { id: "luxury", label: "Luxury", icon: Crown },
    { id: "tech", label: "Tech", icon: Hexagon },
    { id: "mascot", label: "Mascot", icon: Star },
    { id: "flat", label: "Flat", icon: Layers },
    { id: "3d", label: "3D", icon: Box },
    { id: "gradient", label: "Gradient", icon: Palette },
    { id: "monogram", label: "Monogram", icon: Type },
    { id: "geometric", label: "Geometric", icon: Shapes },
];

const TYPOGRAPHY_STYLES = ["Sans Serif", "Serif", "Display", "Handwritten", "Monospace"];
const INDUSTRIES = [
    "Technology", "Finance", "Healthcare", "Education", "Food & Beverage",
    "Fashion", "Real Estate", "Entertainment", "Sports", "Travel",
    "E-Commerce", "Agency", "Consulting", "SaaS", "Gaming",
];
const ICON_PREFERENCES = ["Icon + Text", "Icon Only", "Text Only", "Abstract", "Lettermark"];
const PROMPT_SUGGESTIONS = [
    "Bold tech startup with sharp angles",
    "Organic nature-inspired leaf motifs",
    "Futuristic neon with clean edges",
    "Vintage badge with texture and depth",
    "Playful colorful creative agency",
];
const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#1e1e1e",
];

function buildLogoPrompt(opts: {
    brandName: string; tagline: string; style: string;
    primaryColor: string; secondaryColor: string;
    typographyStyle: string; industry: string;
    iconPreference: string; additionalPrompt: string;
}): string {
    const p: string[] = [`Design a professional logo for "${opts.brandName}".`];
    if (opts.tagline) p.push(`Tagline: "${opts.tagline}".`);

    const styleMap: Record<string, string> = {
        minimal: "Minimalist with clean lines and whitespace.",
        modern: "Modern contemporary with sleek geometry.",
        luxury: "Premium luxury with elegant serif details.",
        tech: "Technology-forward with digital precision.",
        mascot: "Character-based mascot, memorable and distinctive.",
        flat: "Flat design, bold solid colors, no gradients.",
        "3d": "Three-dimensional with depth and realistic lighting.",
        gradient: "Smooth modern gradients with flowing color transitions.",
        monogram: "Monogram lettermark using brand initials.",
        geometric: "Geometric shapes with mathematical harmony.",
    };
    if (styleMap[opts.style]) p.push(styleMap[opts.style]);
    if (opts.primaryColor) p.push(`Primary color: ${opts.primaryColor}.`);
    if (opts.secondaryColor) p.push(`Secondary color: ${opts.secondaryColor}.`);
    if (opts.typographyStyle) p.push(`Typography: ${opts.typographyStyle}.`);
    if (opts.industry) p.push(`Industry: ${opts.industry}.`);
    if (opts.iconPreference) p.push(`Layout: ${opts.iconPreference}.`);
    if (opts.additionalPrompt) p.push(opts.additionalPrompt);
    p.push("Render on clean solid background. Vector-quality, scalable, centered.");
    return p.join(" ");
}

export default function LogoGeneratorPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [brandName, setBrandName] = useState("");
    const [tagline, setTagline] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("minimal");
    const [primaryColor, setPrimaryColor] = useState("#6366f1");
    const [secondaryColor, setSecondaryColor] = useState("#06b6d4");
    const [typographyStyle, setTypographyStyle] = useState("Sans Serif");
    const [industry, setIndustry] = useState("");
    const [iconPreference, setIconPreference] = useState("Icon + Text");
    const [additionalPrompt, setAdditionalPrompt] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [previewBg, setPreviewBg] = useState<"dark" | "light" | "transparent">("light");
    const [showIndustryDd, setShowIndustryDd] = useState(false);
    const [savedLogos, setSavedLogos] = useState<any[]>([]);
    const [loadingLogos, setLoadingLogos] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchLogos = async () => {
        try {
            const res = await fetch("/api/marketing?action=list-assets&type=logo");
            const data = await res.json();
            setSavedLogos(data);
        } catch (e) {
            console.error("Failed to fetch logos", e);
        } finally {
            setLoadingLogos(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchLogos();
        }
    }, [isAuthenticated, authLoading]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, authLoading, router]);

    // Poll for result — same pattern as image-generator
    useEffect(() => {
        let interval: any;
        if (taskId && generating) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/marketing?action=poll&taskId=${taskId}&type=image`);
                    const status = await res.json();
                    if (status.state === "success") {
                        setResultImage(status.resultUrls[0]);
                        setGenerating(false);
                        setTaskId(null);
                        toast.success("Logo generated successfully!");
                        fetchLogos(); // Refresh list
                    } else if (status.state === "failed") {
                        setGenerating(false);
                        setTaskId(null);
                        const err = status.error?.toLowerCase() || "";
                        if (err.includes("credits insufficient") && window.location.href.includes("mounikai")) {
                            toast.error("In the demo, this feature is disabled");
                        } else if (err.includes("content polic") || err.includes("flagged")) {
                            toast.error("Prompt flagged by safety filter. Try rephrasing.");
                        } else {
                            toast.error(status.error || "Generation failed.");
                        }
                    }
                } catch (e) { console.error("Polling error:", e); }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [taskId, generating]);

    if (authLoading || !isAuthenticated) return null;

    const handleGenerate = async () => {
        if (!brandName.trim()) { toast.error("Enter a brand name"); return; }
        if (window.location.href.includes("mounikai")) { toast.error("In the demo, this feature is disabled"); return; }

        setGenerating(true);
        setResultImage(null);

        try {
            const basePrompt = buildLogoPrompt({
                brandName, tagline, style: selectedStyle,
                primaryColor, secondaryColor, typographyStyle,
                industry, iconPreference, additionalPrompt,
            });

            let finalPrompt = basePrompt;
            const filesUrl: string[] = [];
            if (selectedProduct) {
                filesUrl.push(selectedProduct.image_url);
                finalPrompt += `. Use the provided reference image/logo as design direction.`;
            }

            const res = await fetch("/api/marketing", {
                method: "POST",
                body: JSON.stringify({
                    action: "generate-image",
                    prompt: finalPrompt,
                    isLogo: true,
                    name: brandName,
                    options: { 
                        size: "1:1", 
                        isEnhance: true, 
                        filesUrl: filesUrl 
                    },
                }),
            });

            const data = await res.json();
            if (data.success) {
                setTaskId(data.taskId);
                toast.info("Generation started. Please wait...");
            } else {
                setGenerating(false);
                if (data.error?.toLowerCase().includes("credits insufficient") && window.location.href.includes("mounikai")) {
                    toast.error("In the demo, this feature is disabled");
                } else {
                    toast.error(data.error || "Failed to start generation");
                }
            }
        } catch {
            setGenerating(false);
            toast.error("An error occurred");
        }
    };

    const charCount = additionalPrompt.length;
    const maxChars = 500;

    const bgClass = previewBg === "dark" ? "bg-[#0a0a0f]"
        : previewBg === "light" ? "bg-white"
            : "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=')]";

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <div className="relative">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25">
                            <Gem className="w-7 h-7" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Logo Generator</h1>
                        <p className="text-sm text-muted-foreground">Craft distinctive brand marks with AI precision</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* LEFT: Controls */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-5 space-y-5">
                        {/* Brand Identity */}
                        <Card className={`border-border/50 bg-card/80 backdrop-blur-sm overflow-visible relative transition-all duration-300 ${showIndustryDd ? "z-50 shadow-2xl" : "z-0"}`}>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="w-4 h-4 text-primary" />Brand Identity</div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Name *</label>
                                    <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. NovaSpark" disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tagline</label>
                                    <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Ignite Your Potential" disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                                </div>
                                {/* Industry */}
                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry</label>
                                    <button onClick={() => setShowIndustryDd(!showIndustryDd)} disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-left flex items-center justify-between text-sm hover:border-primary/40 transition-colors">
                                        <span className={industry ? "text-foreground" : "text-muted-foreground/50"}>{industry || "Select industry..."}</span>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <AnimatePresence>
                                        {showIndustryDd && (
                                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                                className="absolute z-[100] top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden">
                                                {INDUSTRIES.map((ind) => (
                                                    <button key={ind} onClick={() => { setIndustry(ind); setShowIndustryDd(false); }}
                                                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors flex items-center justify-between ${industry === ind ? "text-primary font-medium" : "text-foreground"}`}>
                                                        {ind}{industry === ind && <Check className="w-3.5 h-3.5" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {/* Colors */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {PRESET_COLORS.slice(0, 5).map((c) => (
                                                <button key={c} onClick={() => setPrimaryColor(c)} style={{ backgroundColor: c }}
                                                    className={`w-7 h-7 rounded-lg border-2 transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secondary</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {PRESET_COLORS.slice(5).map((c) => (
                                                <button key={c} onClick={() => setSecondaryColor(c)} style={{ backgroundColor: c }}
                                                    className={`w-7 h-7 rounded-lg border-2 transition-all ${secondaryColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Style Selection */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-primary" />Logo Style</div>
                                <div className="grid grid-cols-5 gap-2">
                                    {LOGO_STYLES.map((s) => {
                                        const Icon = s.icon;
                                        return (
                                            <button key={s.id} onClick={() => setSelectedStyle(s.id)} disabled={generating}
                                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all duration-200 ${selectedStyle === s.id
                                                    ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                                                    : "border-border/40 hover:border-primary/30 hover:bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
                                                <Icon className="w-4 h-4" /><span className="text-[10px] font-medium leading-tight">{s.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reference Image */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5">
                                <ProductPicker 
                                    selectedId={selectedProduct?.id} 
                                    onSelect={setSelectedProduct} 
                                />
                            </CardContent>
                        </Card>

                        {/* Typography & Icon Preference */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold"><Type className="w-4 h-4 text-primary" />Typography & Layout</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {TYPOGRAPHY_STYLES.map((t) => (
                                        <button key={t} onClick={() => setTypographyStyle(t)} disabled={generating}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typographyStyle === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{t}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {ICON_PREFERENCES.map((p) => (
                                        <button key={p} onClick={() => setIconPreference(p)} disabled={generating}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${iconPreference === p ? "bg-secondary text-secondary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{p}</button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Creative Prompt */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-semibold"><PenTool className="w-4 h-4 text-primary" />Creative Direction</div>
                                    <span className={`text-[10px] font-mono ${charCount > maxChars ? "text-destructive" : "text-muted-foreground"}`}>{charCount}/{maxChars}</span>
                                </div>
                                <textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value.slice(0, maxChars))} placeholder="Add specific creative direction..." rows={3} disabled={generating}
                                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" />
                                <div className="flex flex-wrap gap-1.5">
                                    {PROMPT_SUGGESTIONS.map((s, i) => (
                                        <button key={i} onClick={() => setAdditionalPrompt(s)}
                                            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/30 transition-all">{s}</button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Button className="w-full btn-premium h-14 text-base gap-2.5 rounded-2xl" disabled={generating || !brandName.trim()} onClick={handleGenerate}>
                            {generating ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Generating...</span></>) : (<><Wand2 className="w-5 h-5" /><span>Generate Logo</span></>)}
                        </Button>
                    </motion.div>

                    {/* RIGHT: Preview */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="xl:col-span-7">
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full min-h-[600px] flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                                <span className="text-sm font-semibold">Preview</span>
                                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                                    {([["dark", Moon], ["light", Sun], ["transparent", Layers]] as const).map(([key, Icon]) => (
                                        <button key={key} onClick={() => setPreviewBg(key)}
                                            className={`p-1.5 rounded-md transition-all ${previewBg === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`flex-1 flex items-center justify-center p-8 transition-colors duration-300 ${bgClass}`}>
                                <AnimatePresence mode="wait">
                                    {resultImage ? (
                                        <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative group max-w-md w-full">
                                            <img src={resultImage} alt={`${brandName} logo`} className="w-full h-auto rounded-2xl shadow-2xl" />
                                            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                                <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={() => { downloadAsset(resultImage, `${brandName}-logo-${Date.now()}.png`); toast.success("Download started"); }}>
                                                    <Download className="w-4 h-4 mr-1.5" /> PNG
                                                </Button>
                                                <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={handleGenerate}>
                                                    <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ) : generating ? (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 text-center">
                                            <div className="relative">
                                                <div className="w-20 h-20 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                                                <Gem className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-foreground">Crafting your logo...</h3>
                                                <p className="text-sm text-muted-foreground max-w-[260px]">AI is designing a unique mark for <span className="font-semibold text-primary">{brandName}</span></p>
                                            </div>
                                            <div className="w-48 bg-muted/30 rounded-full h-1 overflow-hidden">
                                                <motion.div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 30, ease: "linear" }} />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
                                            <div className="p-6 rounded-full bg-muted/20 border border-border/20"><Gem className="w-10 h-10 text-muted-foreground/30" /></div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-semibold text-muted-foreground">Your logo awaits</h3>
                                                <p className="text-sm text-muted-foreground/60 max-w-[240px]">Configure your brand details and hit generate</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {resultImage && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-3 border-t border-border/40 flex items-center justify-between bg-muted/20">
                                    <span className="text-xs text-muted-foreground">Generated for <span className="font-semibold text-foreground">{brandName}</span></span>
                                    <Button size="sm" variant="outline" className="rounded-lg text-xs h-8" onClick={() => { downloadAsset(resultImage, `${brandName}-logo-${Date.now()}.png`); toast.success("Download started"); }}>
                                        <Download className="w-3.5 h-3.5 mr-1" /> Download PNG
                                    </Button>
                                </motion.div>
                            )}
                        </Card>
                    </motion.div>
                </div>

                {/* Your Work Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-8 pt-16 pb-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary/20 to-secondary/20 text-primary border border-primary/10">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Your Work</h2>
                            </div>
                            <p className="text-sm text-muted-foreground ml-1">Your personal collection of AI-crafted brand identities</p>
                        </div>
                        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 self-start md:self-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {savedLogos.length} {savedLogos.length === 1 ? 'Design' : 'Designs'}
                            </span>
                        </div>
                    </div>

                    {loadingLogos ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-square rounded-[2rem] bg-card/40 animate-pulse border border-border/20 shadow-inner" />
                            ))}
                        </div>
                    ) : savedLogos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {savedLogos.map((logo, idx) => (
                                <motion.div
                                    key={logo.id}
                                    initial="initial"
                                    animate="animate"
                                    whileHover="hover"
                                    variants={{
                                        initial: { opacity: 0, scale: 0.9 },
                                        animate: { opacity: 1, scale: 1, transition: { delay: idx * 0.05 } },
                                        hover: { y: -8, scale: 1.02 }
                                    }}
                                    className="relative aspect-square rounded-[2rem] overflow-hidden bg-gradient-to-b from-card/80 to-card/40 border border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 transition-all duration-500 ease-out cursor-pointer"
                                >
                                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px] pointer-events-none" />
                                    <motion.img
                                        src={logo.url}
                                        alt="Saved logo"
                                        variants={{ hover: { scale: 1.1 } }}
                                        transition={{ duration: 0.7 }}
                                        className="w-full h-full object-contain p-6"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    />

                                    <motion.div 
                                        variants={{
                                            initial: { opacity: 0, y: 16 },
                                            animate: { opacity: 0, y: 16 },
                                            hover: { opacity: 1, y: 0 }
                                        }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center justify-end p-5 text-center pointer-events-none z-50"
                                    >
                                        <p className="text-[11px] text-white font-bold mb-3 truncate w-full px-2">
                                            {logo.metadata?.name || 'Untitled Logo'}
                                        </p>
                                        <div className="flex gap-2 w-full justify-center pointer-events-auto">
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md" onClick={() => {
                                                setViewerIndex(idx);
                                                setViewerOpen(true);
                                            }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md" onClick={(e) => { e.stopPropagation(); downloadAsset(logo.url, `logo-${logo.id}.png`); toast.success("Download started"); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-primary/20 hover:bg-primary/30 border-primary/20 text-white backdrop-blur-md" onClick={(e) => {
                                                e.stopPropagation();
                                                setResultImage(logo.url);
                                                setBrandName(logo.metadata?.name || "");
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </motion.div>

                                    {/* New Badge */}
                                    {new Date(logo.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                                        <div className="absolute top-4 right-4 bg-primary text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter shadow-xl shadow-primary/40 pointer-events-none z-50">
                                            Latest
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/20 rounded-[3rem] border border-dashed border-border/40 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px]" />
                            <div className="relative p-6 rounded-[2rem] bg-background/50 border border-border/40 mb-5 shadow-xl shadow-black/5">
                                <Sparkles className="w-10 h-10 text-primary/40 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No masterpieces yet</h3>
                            <p className="text-sm text-muted-foreground max-w-[280px]">Your future brand icons will be archived here in high resolution</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={savedLogos}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
