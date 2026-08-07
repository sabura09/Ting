"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import {
    Video,
    Sparkles,
    Send,
    Loader2,
    History,
    Download,
    Play,
    Upload,
    ImageIcon as ImageIconIcon,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AvatarPicker } from "@/components/marketing/AvatarPicker";
import { ProductPicker } from "@/components/marketing/ProductPicker";
import { MarketingAssetCard } from "@/components/marketing/MarketingAssetCard";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";

export default function VideoGeneratorPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultVideo, setResultVideo] = useState<string | null>(null);
    const [recentVideos, setRecentVideos] = useState<any[]>([]);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const [mode, setMode] = useState("normal");
    const [duration, setDuration] = useState([6]);
    const [resolution, setResolution] = useState("480p");
    const [aspectRatio, setAspectRatio] = useState("16:9");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentVideos();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        let interval: any;
        if (taskId && generating) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/marketing?action=poll&taskId=${taskId}&type=video`);
                    const status = await res.json();
                    if (status.state === 'success') {
                        setResultVideo(status.resultUrl);
                        setGenerating(false);
                        setTaskId(null);
                        toast.success("Video generated successfully!");
                        fetchRecentVideos();
                    } else if (status.state === 'failed') {
                        setGenerating(false);
                        setTaskId(null);
                        if (status.error?.toLowerCase().includes('credits insufficient') && window.location.href.includes('mounikai')) {
                            toast.error("In the demo, this feature is disabled");
                        } else {
                            toast.error(status.error || "Generation failed");
                        }
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [taskId, generating]);

    if (authLoading || !isAuthenticated) {
        return null;
    }

    const fetchRecentVideos = async () => {
        try {
            const res = await fetch('/api/marketing?action=list-assets&type=video');
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecentVideos(data);
            } else {
                console.error("API returned non-array data:", data);
                setRecentVideos([]);
            }
        } catch (error) {
            console.error("Failed to load videos", error);
            setRecentVideos([]);
        }
    };


    const handleGenerate = async () => {
        const imageUrl = selectedProduct?.image_url || selectedAvatar?.image_url;

        if (!prompt.trim()) {
            toast.error("Please enter a movement prompt");
            return;
        }

        setGenerating(true);
        setResultVideo(null);

        try {
            let finalPrompt = prompt;
            if (selectedAvatar && selectedProduct) {
                finalPrompt = `An AI avatar (${selectedAvatar.name}) interacting with a product (${selectedProduct.name}). ${prompt}`;
            } else if (selectedAvatar) {
                finalPrompt = `An AI avatar (${selectedAvatar.name}) in the scene. ${prompt}`;
            } else if (selectedProduct) {
                finalPrompt = `The product (${selectedProduct.name}) in the scene. ${prompt}`;
            }

            const res = await fetch('/api/marketing', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'generate-video',
                    imageUrl: imageUrl, // Primary reference
                    avatarUrl: selectedAvatar?.image_url, // Optional secondary reference
                    prompt: finalPrompt,
                    mode,
                    duration: duration[0].toString(),
                    resolution,
                    aspect_ratio: aspectRatio
                })
            });

            const data = await res.json();
            if (data.success) {
                setTaskId(data.taskId);
                toast.info("Video generation started. This may take 2-3 minutes.");
            } else {
                setGenerating(false);
                if (data.error?.toLowerCase().includes('credits insufficient') && window.location.href.includes('mounikai')) {
                    toast.error("In the demo, this feature is disabled");
                } else {
                    toast.error(data.error || "Failed to start generation");
                }
            }
        } catch (error) {
            setGenerating(false);
            toast.error("An error occurred");
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Video className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight outfit">Product Video Generator</h1>
                        <p className="text-muted-foreground">Turn static product images into cinematic marketing videos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Controls */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                {/* Step 1: Select Asset */}
                                <div className="space-y-6">
                                    <ProductPicker
                                        selectedId={selectedProduct?.id}
                                        onSelect={(p) => setSelectedProduct(p)}
                                    />

                                    <AvatarPicker
                                        selectedId={selectedAvatar?.id}
                                        onSelect={(a) => setSelectedAvatar(a)}
                                    />
                                </div>

                                {/* Prompt Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        Step 2: Describe Movement
                                    </label>
                                    <Textarea
                                        placeholder="E.g. The camera circles the product smoothly with a slow zoom in, showing cinematic highlights and reflections..."
                                        className="min-h-[120px] rounded-xl resize-none bg-muted/50 focus:bg-background transition-colors"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">
                                        Tip: Use words like "cinematic", "slow rotation", "macro zoom", "smooth pan".
                                    </p>
                                </div>

                                {/* Video Settings */}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Mode</label>
                                        <Select value={mode} onValueChange={setMode}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select mode" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="fun">Fun</SelectItem>
                                                <SelectItem value="spicy">Spicy</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Resolution</label>
                                        <Select value={resolution} onValueChange={setResolution}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select resolution" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="480p">480p (Standard)</SelectItem>
                                                <SelectItem value="720p">720p (HD)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
                                        <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select aspect ratio" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                                <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                                <SelectItem value="3:2">3:2</SelectItem>
                                                <SelectItem value="2:3">2:3</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Duration ({duration[0]}s)</label>
                                        <div className="pt-3">
                                            <Slider 
                                                value={duration} 
                                                onValueChange={setDuration} 
                                                min={6} 
                                                max={30} 
                                                step={1} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full btn-premium h-14 text-lg gap-2"
                                    disabled={generating || uploading}
                                    onClick={handleGenerate}
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Directing Video...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5" />
                                            <span>Generate Video</span>
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Preview & Result */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="premium-card h-full min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden border-dashed border-2">
                            <AnimatePresence mode="wait">
                                {resultVideo ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full h-full flex flex-col p-4"
                                    >
                                        <div className="relative flex-1 cursor-pointer" onClick={() => {
                                            setViewerIndex(0);
                                            setViewerOpen(true);
                                        }}>
                                            <video
                                                src={resultVideo}
                                                className="w-full h-full object-contain rounded-xl shadow-2xl transition-transform hover:scale-[1.01]"
                                                controls={false}
                                                autoPlay
                                                loop
                                            />
                                        </div>
                                        <div className="absolute top-8 right-8 flex gap-2">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="rounded-full shadow-lg"
                                                onClick={() => {
                                                    downloadAsset(resultVideo, `ai-suite-video-${Date.now()}.mp4`);
                                                    toast.success("Download started");
                                                }}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="rounded-full shadow-lg" onClick={handleGenerate}>
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : generating ? (
                                    <motion.div
                                        key="generating"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-6 p-8 text-center"
                                    >
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                            <Video className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold outfit">Rendering Cinema...</h3>
                                            <p className="text-muted-foreground">Kie.ai is processing your high-end marketing video. This usually takes 2 minutes.</p>
                                        </div>
                                        <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-primary"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 120, ease: "linear" }}
                                            />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center gap-4 text-muted-foreground p-12 text-center"
                                    >
                                        <div className="p-6 rounded-full bg-muted/50">
                                            <Video className="w-12 h-12 opacity-20" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold text-foreground">Video Preview</h3>
                                            <p className="max-w-[280px]">Select an asset above and describe the movement to see the magic happen.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Background decoration */}
                            <div className="absolute inset-0 -z-10 bg-grid opacity-[0.03]" />
                        </Card>
                    </div>
                </div>

                {/* History Section */}
                <div className="space-y-6 pt-8">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        <h2 className="text-2xl font-bold outfit">Video Gallery</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {recentVideos?.map((asset: any, index: number) => (
                            <MarketingAssetCard
                                key={asset.id}
                                asset={asset}
                                onClick={() => {
                                    setViewerIndex(index);
                                    setViewerOpen(true);
                                }}
                            />
                        ))}
                        {(!recentVideos || recentVideos.length === 0) && (
                            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
                                No video history found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={recentVideos}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
