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
    ScrollText,
    FileText,
    BookOpen,
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

const BROCHURE_THEMES = [
    { id: "corporate-clean", label: "Corporate Clean Editorial" },
    { id: "modern-tech", label: "Modern Tech Minimalist" },
    { id: "luxury-real-estate", label: "Luxury Real Estate Grid" },
    { id: "organic-botanical", label: "Organic & Botanical" },
    { id: "creative-studio", label: "Creative Studio Portfolio" },
    { id: "industrial-bold", label: "Industrial & Bold" },
];

const BROCHURE_LAYOUTS = [
    { id: "tri-fold", label: "Tri-Fold Spread (Mockup)" },
    { id: "bi-fold", label: "Bi-Fold Center Spread" },
    { id: "multi-page", label: "4-Page Booklet Layout" },
    { id: "accordion", label: "Accordion Fold Mockup" },
];

const COLOR_PALETTES = [
    "Forest Greens, warm cream & stone gray",
    "Deep Navy Blue, copper accents & white",
    "Matte Black, clean gray & neon lime accents",
    "Warm terracotta, soft peach & white",
    "Minimalist monochrome black, white & slate",
    "Rich teal, gold foil & charcoal gray",
];

const RESOLUTIONS = [
    { id: "3:2", label: "Landscape Spread (3:2)" },
    { id: "2:3", label: "Portrait Panel (2:3)" },
    { id: "1:1", label: "Square Spread (1:1)" },
];

function buildBrochurePrompt(opts: {
    brand: string;
    title: string;
    sections: string;
    layout: string;
    theme: string;
    colorPalette: string;
    additionalPrompt: string;
}): string {
    const parts = [
        `Design a professional marketing brochure layout spread representing a ${opts.layout} for "${opts.brand}".`,
        `The primary brochure cover title is "${opts.title}".`,
        `The visual design style is ${opts.theme} theme with a color palette of ${opts.colorPalette}.`,
        opts.sections ? `The panels show clean structural grids representing sections for: ${opts.sections}.` : "",
        opts.additionalPrompt ? `Visual characteristics: ${opts.additionalPrompt}.` : "",
        `The brochure mockup should showcase clean panels, modern editorial typography, realistic page folding curves, and elegant corporate graphic layouts. Centered studio lighting, high resolution.`
    ];
    return parts.filter(Boolean).join(" ");
}

export default function BrochureDesignerPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [brand, setBrand] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [title, setTitle] = useState("");
    const [sections, setSections] = useState("");
    
    const [selectedTheme, setSelectedTheme] = useState("corporate-clean");
    const [selectedLayout, setSelectedLayout] = useState("tri-fold");
    const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
    const [resolution, setResolution] = useState<"1:1" | "3:2" | "2:3">("3:2");
    const [additionalPrompt, setAdditionalPrompt] = useState("");

    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [savedBrochures, setSavedBrochures] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchBrochures = async () => {
        try {
            const res = await fetch("/api/marketing?action=list-assets&type=brochure");
            const data = await res.json();
            if (Array.isArray(data)) {
                setSavedBrochures(data);
            }
        } catch (e) {
            console.error("Failed to fetch brochures", e);
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
            fetchBrochures();
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
                        toast.success("Brochure generated successfully!");
                        fetchBrochures();
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
            toast.error("Enter a brochure cover title");
            return;
        }
        if (!brand.trim()) {
            toast.error("Enter brand or business name");
            return;
        }
        if (window.location.href.includes("mounikai")) {
            toast.error("In the demo, this feature is disabled");
            return;
        }

        setGenerating(true);
        setResultImage(null);

        try {
            const prompt = buildBrochurePrompt({
                brand,
                title,
                sections,
                layout: selectedLayout === "tri-fold" ? "tri-fold panel layout mockup" : (selectedLayout === "bi-fold" ? "bi-fold center spread page" : (selectedLayout === "multi-page" ? "4-panel brochure booklet layout" : "accordion fold brochure layout")),
                theme: selectedTheme,
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
                    isBrochure: true,
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
                toast.info("Brochure generation started. Please wait...");
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
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/25">
                            <ScrollText className="w-7 h-7" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Brochure Designer</h1>
                        <p className="text-sm text-muted-foreground">Draft beautiful multi-panel brochures and marketing booklet spreads using AI</p>
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
                        {/* Copywriting Details */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Brochure Editorial Content
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand or Business Name *</label>
                                    <input 
                                        type="text" 
                                        value={brand} 
                                        onChange={(e) => setBrand(e.target.value)} 
                                        placeholder="e.g. Starlight Eco-Resort" 
                                        disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Main Cover Title / Headline *</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)} 
                                        placeholder="e.g. Escape to Sustainable Luxury" 
                                        disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brochure Sections / Content Plan</label>
                                    <Textarea 
                                        value={sections} 
                                        onChange={(e) => setSections(e.target.value)} 
                                        placeholder="e.g. About Us, Forest Cabins, Organic Dining, Wellness Spa, Ecological Activities." 
                                        rows={3} 
                                        disabled={generating}
                                        className="min-h-[90px] rounded-xl bg-background border-border/60 focus:border-primary focus:ring-primary/20 transition-all text-sm p-4"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Layout & Style */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Palette className="w-4 h-4 text-primary" />
                                    Brochure Layout & Theme
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folding Layout</label>
                                        <Select value={selectedLayout} onValueChange={setSelectedLayout} disabled={generating}>
                                            <SelectTrigger className="rounded-xl h-11 border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BROCHURE_LAYOUTS.map((layout) => (
                                                    <SelectItem key={layout.id} value={layout.id}>{layout.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Editorial Theme</label>
                                        <Select value={selectedTheme} onValueChange={setSelectedTheme} disabled={generating}>
                                            <SelectTrigger className="rounded-xl h-11 border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BROCHURE_THEMES.map((theme) => (
                                                    <SelectItem key={theme.id} value={theme.id}>{theme.label}</SelectItem>
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
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aspect Ratio / Shape</label>
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
                                    placeholder="e.g. Include soft botanical plant patterns, elegant editorial font, gold framing borders." 
                                    rows={3} 
                                    disabled={generating}
                                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" 
                                />
                            </CardContent>
                        </Card>

                        <Button 
                            className="w-full btn-premium h-14 text-base gap-2.5 rounded-2xl" 
                            disabled={generating || !title.trim() || !brand.trim()} 
                            onClick={handleGenerate}
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Designing Brochure...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Generate Brochure Spread</span>
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
                                <span className="text-sm font-semibold">Brochure Mockup Preview</span>
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
                                                        downloadAsset(resultImage, `${title.replace(/\s+/g, '-')}-brochure.png`); 
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
                                                <BookOpen className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-foreground">Assembling Panels...</h3>
                                                <p className="text-sm text-muted-foreground max-w-[260px]">AI is drawing a customized brochure mockup for <span className="font-semibold text-primary">{brand}</span></p>
                                            </div>
                                            <div className="w-48 bg-muted/30 rounded-full h-1 overflow-hidden">
                                                <motion.div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 30, ease: "linear" }} />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
                                            <div className="p-6 rounded-full bg-muted/20 border border-border/20">
                                                <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-semibold text-muted-foreground">Mockup Preview</h3>
                                                <p className="text-sm text-muted-foreground/60 max-w-[240px]">Configure your branding details, then tap generate to see your brochure spread design</p>
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
                            <p className="text-sm text-muted-foreground">Access your previously generated brochure spreads</p>
                        </div>
                    </div>

                    {loadingHistory ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="aspect-[3/2] rounded-[2rem] bg-card/45 animate-pulse border border-border/20 shadow-inner" />
                            ))}
                        </div>
                    ) : savedBrochures.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {savedBrochures.map((brochure, idx) => (
                                <motion.div
                                    key={brochure.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    transition={{ duration: 0.4 }}
                                    className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-gradient-to-b from-card to-muted border border-border/40 shadow-sm group cursor-pointer"
                                >
                                    <img 
                                        src={brochure.url} 
                                        alt="Brochure layout spread" 
                                        className="w-full h-full object-cover"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white font-semibold truncate mb-2">{brochure.prompt || "Brochure Design"}</p>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30" onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30" onClick={() => { downloadAsset(brochure.url, `brochure-${brochure.id}.png`); toast.success("Download started"); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-primary/30 backdrop-blur text-white hover:bg-primary/40" onClick={() => { 
                                                setResultImage(brochure.url);
                                                setTitle(brochure.metadata?.name || "");
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
                            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                            <p className="font-medium text-sm">No brochure layout spreads in your catalog</p>
                            <p className="text-xs text-muted-foreground/60">Generate your first double-sided or tri-fold brochure spread to see it listed here.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={savedBrochures}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
