"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import {
    Palette, Sparkles, Wand2, Loader2, Download, RefreshCw,
    Sun, Moon, Check, ChevronDown, Type, Layers,
    Zap, Crown, Star, ScrollText, User, Ghost, Sword,
    Flame, Wind, Cloud, Camera, Monitor, PenTool, Eye,
    Hexagon, Box, Shapes, Minimize2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { AvatarPicker } from "@/components/marketing/AvatarPicker";
import { ProductPicker } from "@/components/marketing/ProductPicker";

const MANGA_STYLES = [
    { id: "shonen", label: "Shonen", icon: Sword },
    { id: "shojo", label: "Shojo", icon: Star },
    { id: "seinen", label: "Seinen", icon: Ghost },
    { id: "chibi", label: "Chibi", icon: User },
    { id: "cyberpunk", label: "Cyberpunk", icon: Zap },
    { id: "ink", label: "Ink Wash", icon: PenTool },
    { id: "watercolor", label: "Watercolor", icon: Palette },
    { id: "retro", label: "80s Retro", icon: Monitor },
];

const COMPOSITIONS = ["Dynamic Action", "Portrait", "Full Body", "Wide Shot", "Top-down", "Low Angle"];
const BACKGROUNDS = ["Urban Tokyo", "Fantasy Forest", "School", "Wasteland", "Dojo", "Space"];
const EMOTIONS = ["Determined", "Joyful", "Melancholy", "Enraged", "Mysterious", "Surprised"];

const PRESET_COLORS = [
    "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
    "#eab308", "#22c55e", "#06b6d4", "#1e1e1e", "#ffffff",
];

function buildMangaPrompt(opts: {
    characterDescription: string;
    style: string;
    composition: string;
    background: string;
    emotion: string;
    additionalPrompt: string;
}): string {
    const p: string[] = [`Professional manga illustration of ${opts.characterDescription}.`];
    
    const styleMap: Record<string, string> = {
        shonen: "Shonen manga style, bold action lines, high contrast, dynamic shading.",
        shojo: "Shojo manga style, delicate lines, expressive eyes, decorative patterns.",
        seinen: "Seinen manga style, detailed, realistic, atmospheric lighting.",
        chibi: "Chibi style, cute proportions, simplified details, thick outlines.",
        cyberpunk: "Cyberpunk manga, neon accents, mechanical details, futuristic city.",
        ink: "Traditional Japanese ink wash style, brush strokes, minimal color.",
        watercolor: "Manga watercolor style, soft pastel washes, artistic texture.",
        retro: "80s retro anime style, cel-shaded, classic line work.",
    };

    if (styleMap[opts.style]) p.push(styleMap[opts.style]);
    if (opts.emotion) p.push(`Emotion: ${opts.emotion}.`);
    if (opts.composition) p.push(`Composition: ${opts.composition}.`);
    if (opts.background) p.push(`Background: ${opts.background}.`);
    if (opts.additionalPrompt) p.push(opts.additionalPrompt);
    
    p.push("Masterpiece quality, clean lines, high resolution.");
    return p.join(" ");
}

export default function MangaGeneratorPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [charDesc, setCharDesc] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedStyle, setSelectedStyle] = useState("shonen");
    const [composition, setComposition] = useState("Dynamic Action");
    const [background, setBackground] = useState("Urban Tokyo");
    const [emotion, setEmotion] = useState("Determined");
    const [additionalPrompt, setAdditionalPrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [previewBg, setPreviewBg] = useState<"dark" | "light" | "transparent">("light");
    const [savedManga, setSavedManga] = useState<any[]>([]);
    const [loadingManga, setLoadingManga] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchManga = async () => {
        try {
            const res = await fetch("/api/marketing?action=list-assets&type=manga");
            const data = await res.json();
            setSavedManga(data);
        } catch (e) {
            console.error("Failed to fetch manga", e);
        } finally {
            setLoadingManga(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchManga();
        }
    }, [isAuthenticated, authLoading]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/login");
    }, [isAuthenticated, authLoading, router]);

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
                        toast.success("Manga generated successfully!");
                        fetchManga();
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
        if (!charDesc.trim()) { toast.error("Describe your character"); return; }

        setGenerating(true);
        setResultImage(null);

        try {
            const prompt = buildMangaPrompt({
                characterDescription: charDesc,
                style: selectedStyle,
                composition,
                background,
                emotion,
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
                    isManga: true,
                    name: charDesc.slice(0, 20),
                    options: { 
                        size: "2:3", 
                        isEnhance: true,
                        filesUrl: filesUrl
                    },
                }),
            });

            const data = await res.json();
            if (data.success) {
                setTaskId(data.taskId);
                toast.info("Generation started...");
            } else {
                setGenerating(false);
                const err :any = data.error?.toLowerCase() || "";
                if (err.includes("credits insufficient") && window.location.href.includes("mounikai")) {
                    toast.error("In the demo, this feature is disabled");
                }else {
                    toast.error(data.error || "Failed to start generation");
                }
            }
        } catch {
            setGenerating(false);
            toast.error("An error occurred");
        }
    };

    const bgClass = previewBg === "dark" ? "bg-[#0a0a0f]"
        : previewBg === "light" ? "bg-white"
            : "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=')]";

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto space-y-6">
                {/* Header - Uniform with Logo Generator */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <div className="relative">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-red-500/25">
                            <ScrollText className="w-7 h-7" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manga Generator</h1>
                        <p className="text-sm text-muted-foreground">Create professional manga illustrations from descriptions</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* LEFT: Controls */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-5 space-y-5">
                        {/* Concept */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><User className="w-4 h-4 text-primary" />Character Concept</div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description *</label>
                                    <textarea 
                                        value={charDesc} 
                                        onChange={(e) => setCharDesc(e.target.value)} 
                                        placeholder="Describe your character and scene..." 
                                        disabled={generating}
                                        className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" 
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Emotion</label>
                                        <Select value={emotion} onValueChange={setEmotion} disabled={generating}>
                                            <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background focus:ring-primary/20">
                                                <SelectValue placeholder="Select emotion" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EMOTIONS.map((e) => (
                                                    <SelectItem key={e} value={e}>{e}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Composition</label>
                                        <Select value={composition} onValueChange={setComposition} disabled={generating}>
                                            <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background focus:ring-primary/20">
                                                <SelectValue placeholder="Select composition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COMPOSITIONS.map((c) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Style Selection */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Palette className="w-4 h-4 text-primary" />Artistic Style</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {MANGA_STYLES.map((s) => {
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

                        {/* Setting */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Cloud className="w-4 h-4 text-primary" />Setting</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {BACKGROUNDS.map(bg => (
                                        <button key={bg} onClick={() => setBackground(bg)} disabled={generating}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${background === bg ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                                            {bg}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Extra Details</label>
                                    <input type="text" value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="e.g. dramatic shadows, rain..." 
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                                </div>
                            </CardContent>
                        </Card>

                        <Button className="w-full btn-premium h-14 text-base gap-2.5 rounded-2xl" disabled={generating || !charDesc.trim()} onClick={handleGenerate}>
                            {generating ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Generating...</span></>) : (<><Wand2 className="w-5 h-5" /><span>Generate Manga</span></>)}
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
                                        <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative group max-w-sm w-full">
                                            <img src={resultImage} alt="Manga result" className="w-full h-auto rounded-2xl shadow-2xl border border-border/20" />
                                            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                                <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={() => { downloadAsset(resultImage, `manga-${Date.now()}.png`); toast.success("Download started"); }}>
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
                                                <ScrollText className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-foreground">Creating your masterpiece...</h3>
                                                <p className="text-sm text-muted-foreground max-w-[260px]">The AI mangaka is inking your vision.</p>
                                            </div>
                                            <div className="w-48 bg-muted/30 rounded-full h-1 overflow-hidden">
                                                <motion.div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 45, ease: "linear" }} />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
                                            <div className="p-6 rounded-full bg-muted/20 border border-border/20"><ScrollText className="w-10 h-10 text-muted-foreground/30" /></div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-semibold text-muted-foreground">The Canvas Awaits</h3>
                                                <p className="text-sm text-muted-foreground/60 max-w-[240px]">Configure your manga settings and hit generate</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Gallery */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-8 pt-16 pb-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary/20 to-secondary/20 text-primary border border-primary/10">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Your Archive</h2>
                            </div>
                            <p className="text-sm text-muted-foreground ml-1">Your collection of AI-crafted manga illustrations</p>
                        </div>
                        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 self-start md:self-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {savedManga.length} {savedManga.length === 1 ? 'Illustration' : 'Illustrations'}
                            </span>
                        </div>
                    </div>

                    {loadingManga ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-[2/3] rounded-[2rem] bg-card/40 animate-pulse border border-border/20 shadow-inner" />
                            ))}
                        </div>
                    ) : savedManga.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {savedManga.map((m, idx) => (
                                <motion.div
                                    key={m.id}
                                    initial="initial"
                                    animate="animate"
                                    whileHover="hover"
                                    variants={{
                                        initial: { opacity: 0, scale: 0.9 },
                                        animate: { opacity: 1, scale: 1, transition: { delay: idx * 0.05 } },
                                        hover: { y: -8, scale: 1.02 }
                                    }}
                                    className="relative aspect-[2/3] rounded-[2rem] overflow-hidden bg-gradient-to-b from-card/80 to-card/40 border border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 transition-all duration-500 ease-out cursor-pointer"
                                >
                                    <motion.img
                                        src={m.url}
                                        alt="Saved manga"
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
                                            {m.prompt?.slice(0, 30)}...
                                        </p>
                                        <div className="flex gap-2 w-full justify-center pointer-events-auto">
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md" onClick={() => {
                                                setViewerIndex(idx);
                                                setViewerOpen(true);
                                            }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-9 w-full rounded-xl bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md" onClick={(e) => { e.stopPropagation(); downloadAsset(m.url, `manga-${m.id}.png`); toast.success("Download started"); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/20 rounded-[3rem] border border-dashed border-border/40 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px]" />
                            <div className="relative p-6 rounded-[2rem] bg-background/50 border border-border/40 mb-5 shadow-xl shadow-black/5">
                                <Sparkles className="w-10 h-10 text-primary/40 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No volumes yet</h3>
                            <p className="text-sm text-muted-foreground max-w-[280px]">Your future manga masterpieces will be archived here</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={savedManga}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
