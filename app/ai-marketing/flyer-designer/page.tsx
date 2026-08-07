"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { 
    ImageIcon, 
    Sparkles, 
    Send, 
    Loader2, 
    Maximize2, 
    Layers, 
    History,
    Download,
    RefreshCw,
    Palette,
    FileText,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { AvatarPicker } from "@/components/marketing/AvatarPicker";
import { ProductPicker } from "@/components/marketing/ProductPicker";

const FLYER_THEMES = [
    { id: "corporate", label: "Corporate Business" },
    { id: "concert", label: "Concert & Music" },
    { id: "restaurant", label: "Food & Restaurant" },
    { id: "party", label: "Party & Club Night" },
    { id: "real-estate", label: "Real Estate Property" },
    { id: "sale", label: "Retail Sale & Promo" },
    { id: "fitness", label: "Fitness & Wellness" },
];

const VISUAL_STYLES = [
    { id: "modern-minimalist", label: "Modern Minimalist" },
    { id: "bold-colorful", label: "Bold & Colorful" },
    { id: "retro-vintage", label: "Retro & Vintage" },
    { id: "cyberpunk-neon", label: "Cyberpunk / Neon" },
    { id: "elegant-luxury", label: "Elegant / Luxury" },
    { id: "clean-corporate", label: "Clean Corporate" },
];

const COLOR_PALETTES = [
    "Neon Purple & Electric Blue",
    "Gold, Black & Charcoal",
    "Clean White, Gray & Indigo",
    "Earthy Greens & Soft Beige",
    "Sunset Orange, Red & Yellow",
    "Classic Corporate Navy & Silver",
];

const RESOLUTIONS = [
    { id: "2:3", label: "A4 Portrait (2:3)" },
    { id: "1:1", label: "Square Social (1:1)" },
    { id: "3:2", label: "Landscape Banner (3:2)" },
];

function buildFlyerPrompt(opts: {
    title: string;
    company: string;
    details: string;
    theme: string;
    style: string;
    colorPalette: string;
    additionalPrompt: string;
}): string {
    const parts = [
        `Design a professional, high-impact marketing flyer for "${opts.title}" by "${opts.company}".`,
        `The flyer category is ${opts.theme} designed with a ${opts.style} visual aesthetic.`,
        `Color scheme and mood palette: ${opts.colorPalette}.`,
        opts.details ? `Key details, time, location, and info: "${opts.details}".` : "",
        opts.additionalPrompt ? `Visual directions: ${opts.additionalPrompt}.` : "",
        `Ensure premium graphic layout, professional typography alignment, clean margins, and balanced illustration structure. Suitable for print and marketing.`
    ];
    return parts.filter(Boolean).join(" ");
}

export default function FlyerDesignerPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [company, setCompany] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [title, setTitle] = useState("");
    const [details, setDetails] = useState("");
    const [selectedTheme, setSelectedTheme] = useState("corporate");
    const [selectedStyle, setSelectedStyle] = useState("modern-minimalist");
    const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
    const [resolution, setResolution] = useState<"1:1" | "3:2" | "2:3">("2:3");
    const [additionalPrompt, setAdditionalPrompt] = useState("");

    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [savedFlyers, setSavedFlyers] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchFlyers = async () => {
        try {
            const res = await fetch("/api/marketing?action=list-assets&type=flyer");
            const data = await res.json();
            if (Array.isArray(data)) {
                setSavedFlyers(data);
            }
        } catch (e) {
            console.error("Failed to fetch flyers", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchFlyers();
        }
    }, [isAuthenticated]);

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
                        toast.success("Flyer generated successfully!");
                        fetchFlyers();
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
                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [taskId, generating]);

    if (authLoading || !isAuthenticated) {
        return null;
    }

    const handleGenerate = async () => {
        if (!title.trim()) {
            toast.error("Enter a flyer title or headline");
            return;
        }
        if (!company.trim()) {
            toast.error("Enter a business or brand name");
            return;
        }
        if (window.location.href.includes("mounikai")) {
            toast.error("In the demo, this feature is disabled");
            return;
        }

        setGenerating(true);
        setResultImage(null);

        try {
            const prompt = buildFlyerPrompt({
                title,
                company,
                details,
                theme: selectedTheme,
                style: selectedStyle,
                colorPalette: selectedPalette,
                additionalPrompt,
            });

            let finalPrompt = prompt;
            const filesUrl: string[] = [];

            if (selectedAvatar) {
                filesUrl.push(selectedAvatar.image_url);
                finalPrompt += `. Include the person shown in the provided reference photo as the main character.`;
            }

            if (selectedProduct) {
                filesUrl.push(selectedProduct.image_url);
                finalPrompt += `. Feature the product shown in the provided reference photo prominently.`;
            }

            if (selectedAvatar && selectedProduct) {
                finalPrompt += ` The person should be naturally interacting with or showcasing the product.`;
            }

            const res = await fetch("/api/marketing", {
                method: "POST",
                body: JSON.stringify({
                    action: "generate-image",
                    prompt: finalPrompt,
                    isFlyer: true,
                    name: title,
                    options: {
                        size: resolution,
                        isEnhance: true,
                        filesUrl: filesUrl
                    },
                }),
            });

            const data = await res.json();
            if (data.success) {
                setTaskId(data.taskId);
                toast.info("Flyer generation started. Please wait...");
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
            toast.error("An error occurred during generation");
        }
    };

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <div className="relative">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
                            <ImageIcon className="w-7 h-7" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Flyer Designer</h1>
                        <p className="text-sm text-muted-foreground">Create stunning commercial flyers and business promos with AI</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* LEFT: Controls */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: 0.1 }} 
                        className="xl:col-span-5 space-y-5"
                    >
                        {/* Core Details */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Flyer Copywriting
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business or Brand Name *</label>
                                    <input 
                                        type="text" 
                                        value={company} 
                                        onChange={(e) => setCompany(e.target.value)} 
                                        placeholder="e.g. Apex Fitness Studio" 
                                        disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Flyer Headline / Title *</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)} 
                                        placeholder="e.g. Grand Opening: Summer Challenge" 
                                        disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Core details, dates, discount, or offer info</label>
                                    <Textarea 
                                        value={details} 
                                        onChange={(e) => setDetails(e.target.value)} 
                                        placeholder="e.g. June 15th, 8:00 AM. Free coaching sessions, first month 50% off. Visit website apexfit.com to sign up." 
                                        rows={3} 
                                        disabled={generating}
                                        className="min-h-[90px] rounded-xl bg-background border-border/60 focus:border-primary focus:ring-primary/20 transition-all text-sm p-4"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Styles & Customization */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Palette className="w-4 h-4 text-primary" />
                                    Style & Visual Options
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Flyer Theme</label>
                                        <Select value={selectedTheme} onValueChange={setSelectedTheme} disabled={generating}>
                                            <SelectTrigger className="rounded-xl h-11 border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FLYER_THEMES.map((theme) => (
                                                    <SelectItem key={theme.id} value={theme.id}>{theme.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Design Style</label>
                                        <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={generating}>
                                            <SelectTrigger className="rounded-xl h-11 border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VISUAL_STYLES.map((style) => (
                                                    <SelectItem key={style.id} value={style.id}>{style.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color Palette Mood</label>
                                    <Select value={selectedPalette} onValueChange={setSelectedPalette} disabled={generating}>
                                        <SelectTrigger className="rounded-xl h-11 border-border/60">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLOR_PALETTES.map((palette) => (
                                                <SelectItem key={palette} value={palette}>{palette}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aspect Ratio / Size</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {RESOLUTIONS.map((res) => (
                                            <button
                                                key={res.id}
                                                onClick={() => setResolution(res.id as any)}
                                                disabled={generating}
                                                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${resolution === res.id 
                                                    ? "border-primary bg-primary/10 text-primary" 
                                                    : "border-border/40 hover:border-primary/30 hover:bg-muted/40 text-muted-foreground"}`}
                                            >
                                                {res.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reference Options */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-6">
                                <ProductPicker 
                                    selectedId={selectedProduct?.id} 
                                    onSelect={setSelectedProduct} 
                                />
                                <AvatarPicker 
                                    selectedId={selectedAvatar?.id} 
                                    onSelect={setSelectedAvatar} 
                                />
                            </CardContent>
                        </Card>

                        {/* Extra Instructions */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    Extra Details for AI
                                </div>
                                <textarea 
                                    value={additionalPrompt} 
                                    onChange={(e) => setAdditionalPrompt(e.target.value)} 
                                    placeholder="Add any specific graphics, illustration style, or layout elements you want the AI to design..." 
                                    rows={3} 
                                    disabled={generating}
                                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" 
                                />
                            </CardContent>
                        </Card>

                        <Button 
                            className="w-full btn-premium h-14 text-base gap-2.5 rounded-2xl" 
                            disabled={generating || !title.trim() || !company.trim()} 
                            onClick={handleGenerate}
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Designing Flyer...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Generate Flyer Design</span>
                                </>
                            )}
                        </Button>
                    </motion.div>

                    {/* RIGHT: Preview */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: 0.2 }} 
                        className="xl:col-span-7"
                    >
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full min-h-[600px] flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                                <span className="text-sm font-semibold">Flyer Preview</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Ready</span>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center p-8 bg-muted/20 relative">
                                <AnimatePresence mode="wait">
                                    {resultImage ? (
                                        <motion.div 
                                            key="result" 
                                            initial={{ opacity: 0, scale: 0.9 }} 
                                            animate={{ opacity: 1, scale: 1 }} 
                                            exit={{ opacity: 0, scale: 0.9 }} 
                                            className="relative group max-w-sm w-full shadow-2xl rounded-2xl overflow-hidden cursor-pointer"
                                            onClick={() => {
                                                setViewerIndex(0);
                                                setViewerOpen(true);
                                            }}
                                        >
                                            <img src={resultImage} alt={title} className="w-full h-auto rounded-2xl transition-transform duration-500 hover:scale-[1.01]" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="rounded-full shadow-lg" 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        downloadAsset(resultImage, `${title.replace(/\s+/g, '-')}-flyer.png`); 
                                                        toast.success("Download started"); 
                                                    }}
                                                >
                                                    <Download className="w-4 h-4 mr-1.5" /> Download
                                                </Button>
                                                <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); handleGenerate(); }}>
                                                    <RefreshCw className="w-4 h-4 mr-1.5" /> Re-design
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ) : generating ? (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 text-center">
                                            <div className="relative">
                                                <div className="w-20 h-20 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                                                <ImageIcon className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-foreground">Drafting Layout...</h3>
                                                <p className="text-sm text-muted-foreground max-w-[260px]">AI is drawing a customized marketing flyer for <span className="font-semibold text-primary">{company}</span></p>
                                            </div>
                                            <div className="w-48 bg-muted/30 rounded-full h-1 overflow-hidden">
                                                <motion.div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 30, ease: "linear" }} />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
                                            <div className="p-6 rounded-full bg-muted/20 border border-border/20">
                                                <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-semibold text-muted-foreground">Design Preview</h3>
                                                <p className="text-sm text-muted-foreground/60 max-w-[240px]">Configure your branding and details, then tap generate to see your design</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Gallery History */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3 }} 
                    className="space-y-6 pt-12 pb-16"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary/20 to-secondary/20 text-primary border border-primary/10">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Design History</h2>
                            <p className="text-sm text-muted-foreground">Access your previously generated flyer layouts</p>
                        </div>
                    </div>

                    {loadingHistory ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="aspect-[2/3] rounded-[2rem] bg-card/45 animate-pulse border border-border/20 shadow-inner" />
                            ))}
                        </div>
                    ) : savedFlyers.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {savedFlyers.map((flyer, idx) => (
                                <motion.div
                                    key={flyer.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    transition={{ duration: 0.4 }}
                                    className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-b from-card to-muted border border-border/40 shadow-sm group cursor-pointer"
                                >
                                    <img 
                                        src={flyer.url} 
                                        alt="Flyer layout" 
                                        className="w-full h-full object-cover"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white font-semibold truncate mb-2">{flyer.prompt || "Flyer Design"}</p>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30" onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30" onClick={() => { downloadAsset(flyer.url, `flyer-${flyer.id}.png`); toast.success("Download started"); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-primary/30 backdrop-blur text-white hover:bg-primary/40" onClick={() => { 
                                                setResultImage(flyer.url);
                                                setTitle(flyer.metadata?.name || "");
                                                window.scrollTo({ top: 0, behavior: "smooth" });
                                            }}>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-muted-foreground border border-dashed rounded-3xl border-border/40 bg-card/25 backdrop-blur-sm">
                            <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                            <p className="font-medium text-sm">No flyer layouts in your catalog</p>
                            <p className="text-xs text-muted-foreground/60">Generate your first business flyer to see it listed here.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={savedFlyers}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
