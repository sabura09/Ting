"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import {
    Film,
    Sparkles,
    Send,
    Loader2,
    History,
    Download,
    Play,
    Music,
    Mic,
    Type,
    CheckCircle2,
    Clock,
    ChevronRight,
    Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, PremiumCard, GlassCard } from "@/components/ui/card";
import { Textarea, Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MarketingAssetCard } from "@/components/marketing/MarketingAssetCard";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";
import { AvatarPicker } from "@/components/marketing/AvatarPicker";
import { ProductPicker } from "@/components/marketing/ProductPicker";

export default function ReelGeneratorPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [ratio, setRatio] = useState("9:16");
    const [resolution, setResolution] = useState("480p");
    const [duration, setDuration] = useState(6);
    const [mode, setMode] = useState("normal");
    const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));

    const [generating, setGenerating] = useState(false);
    const [reelId, setReelId] = useState<string | null>(null);
    const [reelData, setReelData] = useState<any>(null);
    const [recentReels, setRecentReels] = useState<any[]>([]);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [showSettings, setShowSettings] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentReels();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        let interval: any;
        if (reelId && generating) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/marketing?action=poll-reel&reelId=${reelId}`);
                    const data = await res.json();
                    setReelData(data);

                    if (data.status === 'success') {
                        setGenerating(false);
                        setReelId(null);
                        toast.success("AI Reel generated successfully!");
                        fetchRecentReels();
                    } else if (data.status === 'failed') {
                        setGenerating(false);
                        setReelId(null);
                        toast.error("Generation failed");
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [reelId, generating]);

    if (authLoading || !isAuthenticated) {
        return null;
    }

    const fetchRecentReels = async () => {
        try {
            const res = await fetch('/api/marketing?action=list-reels');
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecentReels(data);
            }
        } catch (error) {
            console.error("Failed to load reels", error);
        }
    };

    const handleGenerate = async () => {

        if (window.location.href.includes('mounikai')) {
            toast.error("In the demo, this feature is disabled");
            return;
        }

        if (!prompt.trim()) {
            toast.error("Please enter a reel topic or product description");
            return;
        }

        setGenerating(true);
        setReelData(null);

        try {
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

            const res = await fetch('/api/marketing', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'generate-reel',
                    prompt: finalPrompt,
                    options: {
                        ratio,
                        resolution,
                        duration,
                        mode,
                        seed,
                        filesUrl: filesUrl
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                setReelId(data.reelId);
                toast.info("AI Reel generation started. This involves script, voiceover, and scene creation.");
            } else {
                setGenerating(false);
                toast.error(data.error || "Failed to start generation");
            }
        } catch (error) {
            setGenerating(false);
            toast.error("An error occurred");
        }
    };

    const getProgress = () => {
        if (!reelData) return 0;
        let progress = 10; // Script started
        if (reelData.script) progress += 30; // Script done
        if (reelData.voiceover_url) progress += 20; // VO done
        if (reelData.music_url) progress += 10; // Music done
        if (reelData.status === 'success') progress = 100;
        else if (reelData.script) {
            // Check scene progress
            const scenes = Array.isArray(reelData.script) ? reelData.script : [];
            const doneScenes = scenes.filter((s: any) => s.video_url).length;
            if (scenes.length > 0) {
                progress += (doneScenes / scenes.length) * 30;
            }
        }
        return reelData.status === 'success' ? 100 : Math.min(progress, 99);
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-10 pb-20">
                {/* Header Section - Uniform Style */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary via-ai-secondary to-ai-tertiary text-white shadow-lg shadow-primary/20">
                            <Film className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight outfit gradient-text">
                                AI Reel Generator
                            </h1>
                            <p className="text-muted-foreground text-lg">Generate viral short-form videos with AI.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-2"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Sparkles className="w-4 h-4 text-primary" />
                            Settings
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Panel: Configuration */}
                    <div className="lg:col-span-5 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <PremiumCard className="overflow-hidden shadow-xl p-8 space-y-8">
                                <div className="space-y-8">
                                    {/* Vision Input */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                Step 1: Your Vision
                                            </label>
                                        </div>
                                        <div className="relative group">
                                            <Textarea
                                                placeholder="Describe your reel vision... e.g. 'A high-energy promotional reel for a new luxury skincare line.'"
                                                className="min-h-[180px] rounded-2xl p-6 text-lg border-border/50 bg-muted/30 focus:bg-background transition-all resize-none"
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Product Picker */}
                                    <ProductPicker 
                                        selectedId={selectedProduct?.id} 
                                        onSelect={setSelectedProduct} 
                                    />

                                    {/* Avatar Picker */}
                                    <AvatarPicker 
                                        selectedId={selectedAvatar?.id} 
                                        onSelect={setSelectedAvatar} 
                                    />

                                    {/* Advanced Settings Drawer */}
                                    <AnimatePresence>
                                        {showSettings && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t border-border/50 pt-8 space-y-6"
                                            >
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Mode</label>
                                                        <Select value={mode} onValueChange={setMode}>
                                                            <SelectTrigger className="w-full bg-background/30 border-border/50 rounded-xl hover:border-primary/40 transition-all">
                                                                <SelectValue placeholder="Select Mode" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="normal">Normal (Balanced)</SelectItem>
                                                                <SelectItem value="fun">Fun (Creative)</SelectItem>
                                                                <SelectItem value="spicy">Spicy (Dynamic)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Aspect Ratio</label>
                                                        <Select value={ratio} onValueChange={setRatio}>
                                                            <SelectTrigger className="w-full bg-background/30 border-border/50 rounded-xl hover:border-primary/40 transition-all">
                                                                <SelectValue placeholder="Select Ratio" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                                                                <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                                                                <SelectItem value="1:1">Square (1:1)</SelectItem>
                                                                <SelectItem value="3:2">Landscape (3:2)</SelectItem>
                                                                <SelectItem value="2:3">Portrait (2:3)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Resolution</label>
                                                        <Select value={resolution} onValueChange={setResolution}>
                                                            <SelectTrigger className="w-full bg-background/30 border-border/50 rounded-xl hover:border-primary/40 transition-all">
                                                                <SelectValue placeholder="Select Resolution" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="480p">Standard (480p)</SelectItem>
                                                                <SelectItem value="720p">HD (720p)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Duration (6-30s)</label>
                                                        <Input
                                                            type="number"
                                                            min={6}
                                                            max={30}
                                                            value={isNaN(duration) ? "" : duration}
                                                            onChange={(e) => setDuration(Math.min(30, Math.max(6, parseInt(e.target.value) || 6)))}
                                                            className="w-full bg-background/30 border-border/50 rounded-xl h-11 focus:border-primary/40 transition-all"
                                                            variant="default"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Button
                                        variant="premium"
                                        size="xl"
                                        className="w-full rounded-2xl gap-3 text-lg"
                                        disabled={generating}
                                        onClick={handleGenerate}
                                    >
                                        {generating ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span>Producing Reel...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-6 h-6" />
                                                <span>Generate Viral Reel</span>
                                            </>
                                        )}
                                    </Button>

                                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/30 text-xs text-muted-foreground italic flex gap-3">
                                        <div className="p-1 rounded-full bg-primary/20 text-primary h-fit">
                                            <CheckCircle2 className="w-3 h-3" />
                                        </div>
                                        Uses Grok for high-performance cinematic video rendering.
                                    </div>
                                </div>
                            </PremiumCard>
                        </motion.div>
                    </div>

                    {/* Right Panel: Output Gallery / Status */}
                    <div className="lg:col-span-7">
                        <GlassCard className="h-full min-h-[600px] flex flex-col relative overflow-hidden p-8">
                            {generating || reelData ? (
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-bold outfit">Production Progress</h3>
                                        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                            Live Generation
                                        </div>
                                    </div>

                                    <div className="space-y-10 flex-1">
                                        {/* Progress Bar */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                <span>Completion</span>
                                                <span className="text-primary">{Math.round(getProgress())}%</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-primary via-ai-secondary to-ai-tertiary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: `${getProgress()}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Status Steps */}
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { label: "Scene Rendering", icon: Film, done: reelData?.script?.every((s: any) => s.video_url) }
                                            ].map((step, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-6 rounded-2xl border transition-all duration-500 flex items-center gap-6 ${step.done
                                                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600"
                                                            : "border-border/50 bg-background/50 text-muted-foreground"
                                                        }`}
                                                >
                                                    <div className={`p-4 rounded-2xl ${step.done ? "bg-emerald-500/20" : "bg-muted"}`}>
                                                        <step.icon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="text-base font-bold">{step.label}</div>
                                                        <div className="text-[10px] font-mono opacity-60">
                                                            {step.done ? "COMPLETED" : "RENDERING_VIDEO..."}
                                                        </div>
                                                    </div>
                                                    {step.done && <CheckCircle2 className="w-6 h-6 ml-auto text-emerald-500" />}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Script Preview */}
                                        {reelData?.script && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-4"
                                            >
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Production Scenes</h4>
                                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {(Array.isArray(reelData.script) ? reelData.script : []).map((scene: any, idx: number) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border/50 flex gap-4 hover:border-primary/30 transition-colors">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="space-y-1 flex-1">
                                                                <p className="text-sm leading-relaxed italic text-foreground/80">"{scene.text}"</p>
                                                            </div>
                                                            {scene.video_url && (
                                                                <div className="shrink-0">
                                                                    <video
                                                                        src={scene.video_url || undefined}
                                                                        className="w-10 h-14 object-cover rounded-lg border border-border/50 shadow-sm"
                                                                        muted
                                                                        autoPlay
                                                                        loop
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {reelData?.status === 'success' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mt-8 p-6 rounded-2xl bg-primary text-primary-foreground flex items-center justify-between shadow-xl shadow-primary/20"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-white/20">
                                                    <Play className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold">Reel is Ready!</div>
                                                    <div className="text-sm opacity-80">Final export complete.</div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="white"
                                                size="sm"
                                                className="rounded-xl font-bold h-10 px-6 text-primary"
                                                onClick={() => {
                                                    setViewerIndex(0);
                                                    setViewerOpen(true);
                                                }}
                                            >
                                                Preview Final
                                            </Button>
                                        </motion.div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-8 p-12 text-center">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-3xl bg-muted/50 flex items-center justify-center border border-border/50">
                                            <Film className="w-16 h-16 opacity-20" />
                                        </div>
                                        <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary rotate-12 border border-primary/20 backdrop-blur-sm">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold outfit">Production Studio</h3>
                                        <p className="text-muted-foreground max-w-sm text-sm">Enter a vision on the left to start the multi-step AI production pipeline. Your masterpiece will appear here.</p>
                                    </div>
                                    <div className="flex gap-3 opacity-40">
                                        <div className="p-3 rounded-xl border border-border/50 bg-background"><Film className="w-5 h-5" /></div>
                                        <ChevronRight className="w-4 h-4 mt-3" />
                                        <div className="p-3 rounded-xl border border-border/50 bg-background text-primary"><Sparkles className="w-5 h-5" /></div>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>

                {/* Archive Section */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-border/50 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <History className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold outfit">Reel Archive</h2>
                                <p className="text-sm text-muted-foreground">Access your previously generated viral reels.</p>
                            </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-muted text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {recentReels.length} Items
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {recentReels?.map((reel: any, index: number) => (
                            <motion.div
                                key={reel.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover="hover"
                                onMouseEnter={(e) => {
                                    const vid = e.currentTarget.querySelector('video');
                                    if (vid) vid.play();
                                }}
                                onMouseLeave={(e) => {
                                    const vid = e.currentTarget.querySelector('video');
                                    if (vid) {
                                        vid.pause();
                                        vid.currentTime = 0;
                                    }
                                }}
                                className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-black border border-white/10 shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer"
                            >
                                {reel.result_url ? (
                                    <video
                                        src={reel.result_url || undefined}
                                        className="w-full h-full object-cover transition-transform duration-700 pointer-events-none"
                                        muted
                                        playsInline
                                        loop
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-background/50 flex items-center justify-center text-muted-foreground animate-pulse">
                                            {reel.status === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Film className="w-6 h-6" />}
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
                                            {reel.status === 'processing' ? 'Generating...' : 'No Preview'}
                                        </span>
                                    </div>
                                )}
                                <motion.div 
                                    variants={{ hover: { opacity: 1 } }}
                                    initial={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-5 z-50 pointer-events-none"
                                >
                                    <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-2 line-clamp-2">
                                        {reel.prompt}
                                    </div>
                                    <div className="flex gap-2 pointer-events-auto">
                                        <Button
                                            size="sm"
                                            variant="white"
                                            className="flex-1 rounded-xl font-bold text-[10px] h-8"
                                            onClick={() => {
                                                setViewerIndex(index);
                                                setViewerOpen(true);
                                            }}
                                        >
                                            <Play className="w-3 h-3 mr-1" />
                                            PLAY
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="white"
                                            className="w-8 h-8 rounded-xl shrink-0"
                                            onClick={() => {
                                                downloadAsset(reel.result_url, `ai-reel-${reel.id}.mp4`);
                                                toast.success("Download started");
                                            }}
                                        >
                                            <Download className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </motion.div>
                                <div className="absolute top-4 left-4 flex items-center gap-2 z-50">
                                    <div className="p-2 rounded-xl bg-black/40 backdrop-blur-md text-white border border-white/10">
                                        <Film className="w-4 h-4" />
                                    </div>
                                    {reel.metadata?.options?.mode && (
                                        <div className="px-2 py-1 rounded-lg bg-primary/20 backdrop-blur-md text-[8px] font-bold text-primary border border-primary/20 uppercase">
                                            {reel.metadata.options.mode}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {(!recentReels || recentReels.length === 0) && (
                        <div className="py-32 text-center rounded-3xl border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center gap-4">
                            <div className="p-6 rounded-2xl bg-card shadow-sm">
                                <Film className="w-12 h-12 opacity-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold">Archive is Empty</h3>
                                <p className="text-muted-foreground text-sm max-w-xs">Your generated reels will be saved here for easy sharing and downloads.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={recentReels.map(r => ({ ...r, url: r.result_url, type: 'video' }))}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
