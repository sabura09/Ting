"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import {
    Palette, Sparkles, Wand2, Loader2, Download, RefreshCw,
    Check, ChevronDown, Type, Play, Youtube, Video, 
    Monitor, Tv, Gamepad2, BookOpen, Briefcase, Music,
    Eye, Layers, Zap, Crown, Star, Box, Hexagon, Shapes, 
    Minimize2, PenTool, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { AvatarPicker } from "@/components/marketing/AvatarPicker";
import { ProductPicker } from "@/components/marketing/ProductPicker";

const THUMBNAIL_STYLES = [
    { id: "clickbait", label: "Clickbait", icon: Zap },
    { id: "minimalist", label: "Minimalist", icon: Minimize2 },
    { id: "educational", label: "Educational", icon: BookOpen },
    { id: "gaming", label: "Gaming", icon: Gamepad2 },
    { id: "vlog", label: "Vlog", icon: Video },
    { id: "tech", label: "Tech", icon: Monitor },
    { id: "tutorial", label: "Tutorial", icon: PenTool },
    { id: "review", label: "Review", icon: Star },
    { id: "news", label: "News", icon: Tv },
    { id: "cinematic", label: "Cinematic", icon: Box },
];

const THEMES = [
    "Modern", "Retro", "Neon", "Minimal", "Nature", 
    "Urban", "Corporate", "Playful", "Dark", "Vibrant"
];

const PROMPT_SUGGESTIONS = [
    "Intense reaction with bright background",
    "Product showcase with floating elements",
    "Coding tutorial with syntax highlighting",
    "Travel vlog with scenic mountains",
    "Fitness workout with high energy",
];

function buildThumbnailPrompt(opts: {
    videoTitle: string; subtitle: string; style: string;
    theme: string; additionalPrompt: string;
}): string {
    const p: string[] = [`Create a high-quality YouTube thumbnail for a video titled "${opts.videoTitle}".`];
    if (opts.subtitle) p.push(`Subtitle: "${opts.subtitle}".`);

    const styleMap: Record<string, string> = {
        clickbait: "Clickbait style with high contrast, vibrant colors, bold typography, and expressive elements.",
        minimalist: "Minimalist style with clean composition, ample whitespace, and elegant sans-serif fonts.",
        educational: "Educational style, professional and clear, with organized text and informative visuals.",
        gaming: "Gaming style, dynamic and high-energy with neon accents and action-oriented composition.",
        vlog: "Vlog style, personal and relatable with a lifestyle feel and natural lighting.",
        tech: "Tech style, futuristic and sleek with digital elements and dark themes.",
        tutorial: "Tutorial style, clear and practical showing a process or result.",
        review: "Review style focusing on a product with clear presentation and quality lighting.",
        news: "News style, authoritative with headline-focused layout and professional graphics.",
        cinematic: "Cinematic style with dramatic lighting, deep shadows, and movie-poster composition."
    };
    if (styleMap[opts.style]) p.push(styleMap[opts.style]);
    if (opts.theme) p.push(`Theme: ${opts.theme}.`);
    if (opts.additionalPrompt) p.push(opts.additionalPrompt);
    p.push("Optimized for 16:9 aspect ratio. Eye-catching, professional, and visually engaging for YouTube.");
    return p.join(" ");
}

export default function YouTubeThumbnailPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [videoTitle, setVideoTitle] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [subtitle, setSubtitle] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("clickbait");
    const [theme, setTheme] = useState("");
    const [additionalPrompt, setAdditionalPrompt] = useState("");

    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [showThemeDd, setShowThemeDd] = useState(false);
    const [savedThumbnails, setSavedThumbnails] = useState<any[]>([]);
    const [loadingThumbnails, setLoadingThumbnails] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchThumbnails = async () => {
        try {
            const res = await fetch("/api/marketing?action=list-assets&type=thumbnail");
            const data = await res.json();
            setSavedThumbnails(data);
        } catch (e) {
            console.error("Failed to fetch thumbnails", e);
        } finally {
            setLoadingThumbnails(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchThumbnails();
        }
    }, [isAuthenticated, authLoading]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, authLoading, router]);

    // Poll for result
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
                        toast.success("Thumbnail generated successfully!");
                        fetchThumbnails(); // Refresh list
                    } else if (status.state === "failed") {
                        setGenerating(false);
                        setTaskId(null);
                        toast.error(status.error || "Generation failed.");
                    }
                } catch (e) { console.error("Polling error:", e); }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [taskId, generating]);

    if (authLoading || !isAuthenticated) return null;

    const handleGenerate = async () => {
        if (window.location.href.includes('mounikai')) {
            toast.error("In the demo, we are not accepting this request.");
            return;
        }
        if (!videoTitle.trim()) { toast.error("Enter a video title"); return; }

        setGenerating(true);
        setResultImage(null);

        try {
            const prompt = buildThumbnailPrompt({
                videoTitle, subtitle, style: selectedStyle,
                theme, additionalPrompt,
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
                    isThumbnail: true,
                    name: videoTitle,
                    options: { 
                        size: "16:9", 
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
                toast.error(data.error || "Failed to start generation");
            }
        } catch {
            setGenerating(false);
            toast.error("An error occurred");
        }
    };

    const charCount = additionalPrompt.length;
    const maxChars = 500;

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <div className="relative">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 text-white shadow-lg shadow-red-500/25">
                            <Youtube className="w-7 h-7" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">YouTube Thumbnail Maker</h1>
                        <p className="text-sm text-muted-foreground">Create viral-worthy thumbnails with AI power</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* LEFT: Controls */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-5 space-y-5">
                        {/* Video Content */}
                        <Card className={`border-border/50 bg-card/80 backdrop-blur-sm overflow-visible relative transition-all duration-300 ${showThemeDd ? "z-50 shadow-2xl" : "z-0"}`}>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold"><Video className="w-4 h-4 text-primary" />Video Content</div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Video Title *</label>
                                    <input type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="e.g. 10 Secret AI Tools" disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtitle / Tagline</label>
                                    <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. You won't believe #7!" disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                                </div>
                                {/* Theme */}
                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Theme / Mood</label>
                                    <button onClick={() => setShowThemeDd(!showThemeDd)} disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-left flex items-center justify-between text-sm hover:border-primary/40 transition-colors">
                                        <span className={theme ? "text-foreground" : "text-muted-foreground/50"}>{theme || "Select theme..."}</span>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <AnimatePresence>
                                        {showThemeDd && (
                                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                                className="absolute z-[100] top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden">
                                                {THEMES.map((t) => (
                                                    <button key={t} onClick={() => { setTheme(t); setShowThemeDd(false); }}
                                                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors flex items-center justify-between ${theme === t ? "text-primary font-medium" : "text-foreground"}`}>
                                                        {t}{theme === t && <Check className="w-3.5 h-3.5" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Style Selection */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-primary" />Thumbnail Style</div>
                                <div className="grid grid-cols-5 gap-2">
                                    {THUMBNAIL_STYLES.map((s) => {
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

                        {/* Creative Prompt */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-semibold"><PenTool className="w-4 h-4 text-primary" />Custom Instructions</div>
                                    <span className={`text-[10px] font-mono ${charCount > maxChars ? "text-destructive" : "text-muted-foreground"}`}>{charCount}/{maxChars}</span>
                                </div>
                                <textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value.slice(0, maxChars))} placeholder="e.g. Use a red arrow pointing to the AI logo..." rows={3} disabled={generating}
                                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" />
                                <div className="flex flex-wrap gap-1.5">
                                    {PROMPT_SUGGESTIONS.map((s, i) => (
                                        <button key={i} onClick={() => setAdditionalPrompt(s)}
                                            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/30 transition-all">{s}</button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Button className="w-full btn-premium h-14 text-base gap-2.5 rounded-2xl" disabled={generating || !videoTitle.trim()} onClick={handleGenerate}>
                            {generating ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Generating...</span></>) : (<><Wand2 className="w-5 h-5" /><span>Generate Thumbnail</span></>)}
                        </Button>
                    </motion.div>

                    {/* RIGHT: Preview */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="xl:col-span-7">
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full min-h-[600px] flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                                <span className="text-sm font-semibold">Preview (16:9)</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
                                        <Play className="w-3 h-3 fill-current" /> YouTube Ready
                                    </div>
                                </div>
                            </div>

                            <div className={`flex-1 flex items-center justify-center p-8 bg-white dark:bg-[#0a0a0f]`}>
                                <AnimatePresence mode="wait">
                                    {resultImage ? (
                                        <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative group w-full aspect-video">
                                            <img src={resultImage} alt={`${videoTitle} thumbnail`} className="w-full h-full object-cover rounded-2xl shadow-2xl" />
                                            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                                <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={() => { downloadAsset(resultImage, `${videoTitle}-thumbnail-${Date.now()}.png`); toast.success("Download started"); }}>
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
                                                <Youtube className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-foreground">Creating your thumbnail...</h3>
                                                <p className="text-sm text-muted-foreground max-w-[260px]">AI is designing a high-impact visual for <span className="font-semibold text-primary">{videoTitle}</span></p>
                                            </div>
                                            <div className="w-48 bg-muted/30 rounded-full h-1 overflow-hidden">
                                                <motion.div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 30, ease: "linear" }} />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
                                            <div className="p-8 rounded-[2rem] bg-muted/10 border border-border/10 aspect-video w-full max-w-md flex flex-col items-center justify-center gap-3">
                                                <div className="p-4 rounded-full bg-muted/20"><Youtube className="w-8 h-8 text-muted-foreground/30" /></div>
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-semibold text-muted-foreground">Your thumbnail awaits</h3>
                                                    <p className="text-xs text-muted-foreground/60">Fill in the details to generate a viral thumbnail</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {resultImage && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-3 border-t border-border/40 flex items-center justify-between bg-muted/20">
                                    <span className="text-xs text-muted-foreground">Generated for <span className="font-semibold text-foreground">{videoTitle}</span></span>
                                    <Button size="sm" variant="outline" className="rounded-lg text-xs h-8" onClick={() => { downloadAsset(resultImage, `${videoTitle}-thumbnail-${Date.now()}.png`); toast.success("Download started"); }}>
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
                                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-500/20 to-orange-500/20 text-red-500 border border-red-500/10">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Your Thumbnails</h2>
                            </div>
                            <p className="text-sm text-muted-foreground ml-1">Archive of your AI-generated YouTube thumbnails</p>
                        </div>
                        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 self-start md:self-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {savedThumbnails.length} {savedThumbnails.length === 1 ? 'Thumbnail' : 'Thumbnails'}
                            </span>
                        </div>
                    </div>

                    {loadingThumbnails ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-video rounded-[2rem] bg-card/40 animate-pulse border border-border/20 shadow-inner" />
                            ))}
                        </div>
                    ) : savedThumbnails.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedThumbnails.map((thumb, idx) => (
                                <motion.div 
                                    key={thumb.id} 
                                    initial="initial"
                                    animate="animate"
                                    whileHover="hover"
                                    variants={{
                                        initial: { opacity: 0, scale: 0.9 },
                                        animate: { opacity: 1, scale: 1, transition: { delay: idx * 0.05 } },
                                        hover: { y: -8, scale: 1.02 }
                                    }}
                                    className="relative aspect-video rounded-[2rem] overflow-hidden bg-gradient-to-b from-card/80 to-card/40 border border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 transition-all duration-500 ease-out cursor-pointer"
                                >
                                    <motion.img 
                                        src={thumb.url} 
                                        alt="Saved thumbnail" 
                                        variants={{ hover: { scale: 1.1 } }}
                                        transition={{ duration: 0.7 }}
                                        className="w-full h-full object-cover" 
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
                                            {thumb.metadata?.name || 'Untitled Thumbnail'}
                                        </p>
                                        <div className="flex gap-2 w-full justify-center pointer-events-auto">
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md" onClick={() => {
                                                setViewerIndex(idx);
                                                setViewerOpen(true);
                                            }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md" onClick={(e) => { e.stopPropagation(); downloadAsset(thumb.url, `thumbnail-${thumb.id}.png`); toast.success("Download started"); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-red-500/20 hover:bg-red-500/30 border-red-500/20 text-white backdrop-blur-md" onClick={(e) => {
                                                e.stopPropagation();
                                                setResultImage(thumb.url);
                                                setVideoTitle(thumb.metadata?.name || "");
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                    
                                    {new Date(thumb.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                                        <div className="absolute top-4 right-4 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter shadow-xl shadow-red-500/40 pointer-events-none z-50">
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
                            <h3 className="text-xl font-bold text-foreground mb-2">No thumbnails yet</h3>
                            <p className="text-sm text-muted-foreground max-w-[280px]">Your future viral thumbnails will be archived here</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AssetViewer 
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={savedThumbnails}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
