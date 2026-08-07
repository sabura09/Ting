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
    Settings2, 
    Maximize2, 
    Layers, 
    History,
    Download,
    RefreshCw
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
import { AvatarPicker } from "@/components/marketing/AvatarPicker";
import { ProductPicker } from "@/components/marketing/ProductPicker";
import { MarketingAssetCard } from "@/components/marketing/MarketingAssetCard";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";

export default function ImageGeneratorPage() {
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [size, setSize] = useState<'1:1' | '3:2' | '2:3'>('1:1');
    const [style, setStyle] = useState("realistic");
    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [recentImages, setRecentImages] = useState<any[]>([]);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchRecentImages = async () => {
        try {
            const res = await fetch('/api/marketing?action=list-assets&type=image');
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecentImages(data);
            } else {
                console.error("API returned non-array data:", data);
                setRecentImages([]);
            }
        } catch (error) {
            console.error("Failed to load images", error);
            setRecentImages([]);
        }
    };

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentImages();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        let interval: any;
        if (taskId && generating) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/marketing?action=poll&taskId=${taskId}&type=image`);
                    const status = await res.json();
                    if (status.state === 'success') {
                        setResultImage(status.resultUrls[0]);
                        setGenerating(false);
                        setTaskId(null);
                        toast.success("Image generated successfully!");
                        fetchRecentImages();
                    } else if (status.state === 'failed') {
                        setGenerating(false);
                        setTaskId(null);
                        const errorMsg = status.error?.toLowerCase() || "";
                        const isContentPolicy = errorMsg.includes('content polic') || errorMsg.includes('flagged');
                        const isInsufficientCredits = errorMsg.includes('credits insufficient');

                        if (isInsufficientCredits && window.location.href.includes('mounikai')) {
                            toast.error("In the demo, this feature is disabled");
                            fetch('/api/notifications/credits-exhausted', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ domain: window.location.href })
                            }).catch(console.error);
                        } else if (isContentPolicy) {
                            toast.error("Your prompt was flagged by the AI safety filter. Try rephrasing — avoid mentioning real people, brands, or sensitive topics.");
                        } else {
                            toast.error(status.error || "Generation failed. Please try a different prompt.");
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

    const handleGenerate = async () => {

        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        setGenerating(true);
        setResultImage(null);

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
                    action: 'generate-image',
                    prompt: finalPrompt,
                    options: {
                        size,
                        isEnhance: true,
                        filesUrl: filesUrl
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                setTaskId(data.taskId);
                toast.info("Generation started. Please wait...");
            } else {
                setGenerating(false);
                if (data.error?.toLowerCase().includes('credits insufficient') && window.location.href.includes('mounikai')) {
                    toast.error("In the demo, this feature is disabled");
                    fetch('/api/notifications/credits-exhausted', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ domain: window.location.href })
                    }).catch(console.error);
                } else {
                    toast.error(data.error || "Failed to start generation");
                }
            }
        } catch (error) {
            console.log("error :", error);

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
                        <ImageIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight outfit">Text-to-Image Generator</h1>
                        <p className="text-muted-foreground">Create stunning marketing visuals with AI.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Controls */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card >
                            <CardContent className="p-6 space-y-6">
                                {/* Prompt Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        Imagine...
                                    </label>
                                </div>
                                    <Textarea
                                        placeholder="E.g. A futuristic luxury watch displayed on a marble pedestal with dramatic lighting..."
                                        className="min-h-[120px] rounded-xl resize-none bg-background border-2 border-muted/50 focus:border-primary transition-all text-lg p-4"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        disabled={generating}
                                    />

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

                                {/* Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Maximize2 className="w-3 h-3" />
                                            Resolution
                                        </label>
                                        <Select value={size} onValueChange={(val: any) => setSize(val)}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1:1">Square (1:1)</SelectItem>
                                                <SelectItem value="3:2">Landscape (3:2)</SelectItem>
                                                <SelectItem value="2:3">Portrait (2:3)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Layers className="w-3 h-3" />
                                            Style
                                        </label>
                                        <Select value={style} onValueChange={setStyle}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="realistic">Photorealistic</SelectItem>
                                                <SelectItem value="digital-art">Digital Art</SelectItem>
                                                <SelectItem value="cinematic">Cinematic</SelectItem>
                                                <SelectItem value="3d-render">3D Render</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full btn-premium h-14 text-lg gap-2"
                                    disabled={generating}
                                    onClick={handleGenerate}
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            <span>Generate Masterpiece</span>
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
                                {resultImage ? (
                                    <motion.div 
                                        key="result"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full h-full flex flex-col"
                                    >
                                        <div className="relative flex-1 p-4 cursor-pointer" onClick={() => {
                                            setViewerIndex(0);
                                            setViewerOpen(true);
                                        }}>
                                            <img 
                                                src={resultImage} 
                                                alt="Generated" 
                                                className="w-full h-full object-contain rounded-xl shadow-2xl transition-transform hover:scale-[1.01]"
                                            />
                                            <div className="absolute top-8 right-8 flex gap-2">
                                                <Button 
                                                    size="icon" 
                                                    variant="secondary" 
                                                    className="rounded-full shadow-lg" 
                                                    onClick={() => {
                                                        downloadAsset(resultImage, `ai-suite-gen-${Date.now()}.png`);
                                                        toast.success("Download started");
                                                    }}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="secondary" className="rounded-full shadow-lg" onClick={handleGenerate}>
                                                    <RefreshCw className="w-4 h-4" />
                                                </Button>
                                            </div>
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
                                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold outfit">Creating your vision...</h3>
                                            <p className="text-muted-foreground">Kie.ai is processing your high-resolution marketing image.</p>
                                        </div>
                                        <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-primary"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 30, ease: "linear" }}
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
                                            <ImageIcon className="w-12 h-12 opacity-20" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold text-foreground">Your creation will appear here</h3>
                                            <p className="max-w-[280px]">Fill in the prompt and settings on the left to start generating.</p>
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
                        <h2 className="text-2xl font-bold outfit">Generation History</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {recentImages?.map((asset: any, index: number) => (
                            <MarketingAssetCard 
                                key={asset.id} 
                                asset={asset} 
                                onClick={() => {
                                    setViewerIndex(index);
                                    setViewerOpen(true);
                                }}
                            />
                        ))}
                        {(!recentImages || recentImages.length === 0) && (
                            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
                                No history found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AssetViewer 
                open={viewerOpen} 
                close={() => setViewerOpen(false)} 
                assets={recentImages} 
                currentIndex={viewerIndex} 
            />
        </Layout>
    );
}
