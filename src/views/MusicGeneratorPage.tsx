"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Music, 
    Sparkles, 
    Mic2, 
    Settings2, 
    Play, 
    Pause, 
    Download, 
    Loader2, 
    History, 
    Zap, 
    Wand2, 
    Scissors, 
    Volume2,
    RefreshCw,
    ChevronRight,
    Music2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { generateMusicAction, getMusicStatusAction, isolateAudioAction, listMusicAssetsAction } from "@/actions/music-generator";
import { fadeIn, fadeInUp, fadeInLeft, fadeInRight, staggerContainer, staggerItem, scaleIn } from "@/lib/animations";

export default function MusicGeneratorPage() {
    // Form State
    const [mode, setMode] = useState<"normal" | "custom">("normal");
    const [prompt, setPrompt] = useState("");
    const [style, setStyle] = useState("");
    const [title, setTitle] = useState("");
    const [instrumental, setInstrumental] = useState(false);
    const [model, setModel] = useState("V5");

    // Processing State
    const [isLoading, setIsLoading] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "queuing" | "generating" | "processing" | "success" | "failed">("idle");
    const [results, setResults] = useState<string[]>([]);
    const [recentMusic, setRecentMusic] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Audio Player State
    const [currentAudio, setCurrentAudio] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { toast } = useToast();
    const { refreshUser } = useAuth();

    // Polling Effect
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setIsLoadingHistory(true);
            const res = await listMusicAssetsAction();
            if (res.success && res.assets) {
                setRecentMusic(res.assets);
            }
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        if (taskId && (status === "queuing" || status === "generating" || status === "processing")) {
            pollInterval = setInterval(async () => {
                try {
                    const res = await getMusicStatusAction(taskId);
                    if ('error' in res && !('success' in res)) {
                        console.error("Polling error:", res.error);
                        return;
                    }
                    if (res.success) {
                        if (res.state === "success" && res.resultUrls?.length) {
                            setResults(res.resultUrls);
                            setStatus("success");
                            clearInterval(pollInterval);
                            await refreshUser();
                            await fetchHistory();
                            toast({
                                title: "Music Generated!",
                                description: "Your masterpiece is ready to listen.",
                            });
                        } else if (res.state === "failed") {
                            setStatus("failed");
                            const errorMsg = res.error?.includes("Credits insufficient") && window.location.href.includes('mounikai')
                                ? "In the demo, we are not accepting this request."
                                : (res.error || "Generation failed");
                            setError(errorMsg);
                            clearInterval(pollInterval);
                        } else {
                            setStatus(res.state as any || "generating");
                        }
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [taskId, status, refreshUser, toast]);

    const handleGenerate = async () => {

        if (window.location.href.includes('mounikai')) {
            toast({
                title: "In the demo, we are not accepting this request.",
                description: "Please contact us to get access.",
                variant: "destructive",
            });
            return;
        }

        if (!prompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please enter a description or lyrics for your music.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults([]);
        setStatus("queuing");

        try {
            const res = await generateMusicAction({
                prompt,
                style,
                title,
                customMode: mode === "custom",
                instrumental,
                model
            });

            if (res.error) {
                throw new Error(res.error);
            }

            if (res.taskId) {
                setTaskId(res.taskId);
            }
        } catch (err: any) {
            console.error("Generation error:", err);
            setStatus("failed");
            setError(err.message || "Failed to start generation");
            toast({
                title: "Error",
                description: err.message || "Failed to start generation",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleIsolate = async (url: string) => {
        toast({
            title: "Starting Isolation",
            description: "Processing your audio with ElevenLabs...",
        });

        try {
            const res = await isolateAudioAction(url);
            if (res.error) throw new Error(res.error);
            
            toast({
                title: "Task Created",
                description: `Isolation task started: ${res.taskId}. You will see it in history soon.`,
            });
        } catch (err: any) {
            toast({
                title: "Isolation Failed",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const togglePlay = (url: string, id: string) => {
        if (playingId === id) {
            if (isPlaying) {
                audioRef.current?.pause();
            } else {
                audioRef.current?.play();
            }
            setIsPlaying(!isPlaying);
        } else {
            setPlayingId(id);
            setCurrentAudio(url);
            setIsPlaying(true);
            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
            }
        }
    };

    return (
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
            <motion.div 
                initial="hidden" 
                animate="visible" 
                variants={staggerContainer}
                className="space-y-8"
            >
                {/* Header */}
                <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                            AI Music Studio
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Turn your ideas into professional-grade soundtracks with Suno V5
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-purple-200 bg-purple-50 text-purple-700">
                            <Sparkles className="w-3 h-3 mr-1" /> Suno AI Engine
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-blue-200 bg-blue-50 text-blue-700">
                            <Volume2 className="w-3 h-3 mr-1" /> 48kHz Stereo
                        </Badge>
                    </div>
                </motion.div>
                <Tabs defaultValue="generator" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/50 rounded-xl h-12 max-w-md mx-auto">
                        <TabsTrigger value="generator" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-semibold flex items-center gap-2">
                            <Music className="w-4 h-4" /> Studio
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-semibold flex items-center gap-2">
                            <History className="w-4 h-4" /> My Creations
                            {recentMusic.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                    {recentMusic.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="generator" className="space-y-8 outline-none">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Input Controls */}
                    <motion.div variants={fadeInLeft} className="xl:col-span-5 space-y-6">
                        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-purple-500" />
                                        Configuration
                                    </CardTitle>
                                    <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-auto">
                                        <TabsList className="grid grid-cols-2 w-[160px] h-8 p-1">
                                            <TabsTrigger value="normal" className="text-xs">Normal</TabsTrigger>
                                            <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                                <CardDescription>
                                    Customize your track's style, lyrics, and metadata
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Prompt Area */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="prompt" className="text-sm font-semibold">
                                            {mode === "normal" ? "Music Description" : "Lyrics"}
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                                            {prompt.length} / {mode === "normal" ? 500 : 5000}
                                        </span>
                                    </div>
                                    <Textarea
                                        id="prompt"
                                        placeholder={mode === "normal" 
                                            ? "e.g. A lo-fi hip hop beat with a jazzy piano melody, cozy atmosphere for studying..." 
                                            : "Enter your song lyrics here..."
                                        }
                                        className="min-h-[160px] resize-none focus-visible:ring-purple-500 bg-background/50"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        maxLength={mode === "normal" ? 500 : 5000}
                                    />
                                </div>

                                {/* Style & Title */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="style" className="text-sm font-semibold">Style / Genre</Label>
                                        <Input
                                            id="style"
                                            placeholder="e.g. Synthwave, 80s, Dark"
                                            value={style}
                                            onChange={(e) => setStyle(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="title" className="text-sm font-semibold">Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="Track Name"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>

                                {/* Advanced Options */}
                                <div className="pt-4 border-t border-muted space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold">Instrumental Mode</Label>
                                            <p className="text-xs text-muted-foreground">Generate without any vocals</p>
                                        </div>
                                        <Switch 
                                            checked={instrumental}
                                            onCheckedChange={setInstrumental}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">AI Model</Label>
                                        <Select value={model} onValueChange={setModel}>
                                            <SelectTrigger className="bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="V5">Suno V5 (Highest Quality)</SelectItem>
                                                <SelectItem value="V4_5">Suno V4.5 (Classic)</SelectItem>
                                                <SelectItem value="V4_5PLUS">Suno V4.5 Plus</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    onClick={handleGenerate}
                                    disabled={status === "queuing" || status === "generating" || status === "processing" || !prompt.trim()}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg h-12 text-base font-bold"
                                >
                                    {status === "queuing" || status === "generating" || status === "processing" ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Composing...
                                        </>
                                    ) : (
                                        <>
                                            <Music2 className="w-5 h-5 mr-2" />
                                            Generate Music
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>

                    {/* Output & Status */}
                    <motion.div variants={fadeInRight} className="xl:col-span-7 space-y-6">
                        {/* Status Card (when loading) */}
                        <AnimatePresence mode="wait">
                            {(status === "queuing" || status === "generating" || status === "processing") && (
                                <motion.div
                                    key="status"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Card className="border-2 border-dashed border-purple-200 bg-purple-50/30">
                                        <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse" />
                                                <Loader2 className="w-16 h-16 text-purple-600 animate-spin relative z-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold text-purple-900 capitalize">
                                                    {status}...
                                                </h3>
                                                <p className="text-purple-700/70 max-w-sm mx-auto">
                                                    Our AI is composing your unique track. This usually takes 30-60 seconds.
                                                </p>
                                            </div>
                                            <div className="w-full max-w-md bg-purple-200/50 h-2 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-purple-600"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: status === "queuing" ? "30%" : "70%" }}
                                                    transition={{ duration: 10 }}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Results Card */}
                            {status === "success" && results.length > 0 && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-yellow-500" />
                                            Generated Masterpieces
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={() => setStatus("idle")} className="text-muted-foreground">
                                            <RefreshCw className="w-4 h-4 mr-2" /> New Track
                                        </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.map((url, idx) => (
                                            <Card key={idx} className="overflow-hidden border-none shadow-lg bg-card/80 backdrop-blur-sm group">
                                                <div className="relative aspect-video bg-gradient-to-br from-purple-900/10 to-blue-900/10 flex items-center justify-center">
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                        <Button 
                                                            variant="secondary" 
                                                            size="icon" 
                                                            className="rounded-full w-12 h-12 shadow-xl"
                                                            onClick={() => togglePlay(url, `result-${idx}`)}
                                                        >
                                                            {playingId === `result-${idx}` && isPlaying ? <Pause /> : <Play />}
                                                        </Button>
                                                    </div>
                                                    <Music className="w-12 h-12 text-purple-400 opacity-30" />
                                                    
                                                    {/* Waveform Visualization (Dummy) */}
                                                    <div className="absolute bottom-4 left-4 right-4 flex items-end gap-0.5 h-8">
                                                        {[...Array(40)].map((_, i) => (
                                                            <motion.div
                                                                key={i}
                                                                className="flex-1 bg-purple-500/30 rounded-t-sm"
                                                                animate={{
                                                                    height: playingId === `result-${idx}` && isPlaying 
                                                                        ? [Math.random() * 100 + "%", Math.random() * 100 + "%"]
                                                                        : "20%"
                                                                }}
                                                                transition={{ repeat: Infinity, duration: 0.5 }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <CardContent className="p-4 space-y-4">
                                                    <div>
                                                        <h4 className="font-bold truncate">{title || `Gen Track #${idx + 1}`}</h4>
                                                        <p className="text-xs text-muted-foreground truncate">{style || "Original Composition"}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(url, '_blank')}>
                                                            <Download className="w-4 h-4 mr-2" /> Download
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                            title="Audio Isolation"
                                                            onClick={() => handleIsolate(url)}
                                                        >
                                                            <Wand2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Idle State */}
                            {status === "idle" && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-[500px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-muted/5"
                                >
                                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                                        <Music2 className="w-10 h-10 text-muted-foreground/30" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Ready to compose?</h3>
                                    <p className="text-muted-foreground max-w-xs">
                                        Configure your track on the left and hit generate to start your journey into AI music.
                                    </p>
                                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                                        {["Lo-fi Study", "Cinematic Epic", "80s Pop", "Jazz Noir"].map((tag) => (
                                            <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-muted transition-colors" onClick={() => setStyle(tag)}>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Error State */}
                            {status === "failed" && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <Card className="border-red-200 bg-red-50">
                                        <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                                <History className="w-6 h-6 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-red-900">Generation Failed</h3>
                                                <p className="text-red-700/70">{error || "An unexpected error occurred"}</p>
                                            </div>
                                            <Button variant="outline" onClick={() => setStatus("idle")} className="border-red-200 text-red-700 hover:bg-red-100">
                                                Try Again
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Audio Isolation Info */}
                        <Card className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white border-none shadow-lg overflow-hidden">
                            <CardContent className="p-6 relative">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center shrink-0">
                                        <Scissors className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Audio Isolation Pro</h3>
                                        <p className="text-blue-50/80 text-sm mt-1">
                                            Need to separate vocals from background music? Our ElevenLabs-powered tool can isolate stems from any track with studio precision.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-6 outline-none">
                    <motion.div 
                        initial="initial"
                        animate="animate"
                        variants={fadeIn}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <History className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold outfit">Generation History</h2>
                                    <p className="text-xs text-muted-foreground">All your previous musical creations in one place</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoadingHistory} className="rounded-xl border-purple-200 text-purple-700">
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} /> 
                                {isLoadingHistory ? 'Refreshing...' : 'Refresh History'}
                            </Button>
                        </div>

                        {isLoadingHistory ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <Card key={i} className="animate-pulse bg-muted/50 border-none h-[350px]" />
                                ))}
                            </div>
                        ) : recentMusic.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                {recentMusic.map((asset: any) => {
                                    let meta = asset.metadata;
                                    if (typeof meta === 'string') {
                                        try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
                                    }
                                    
                                    return (
                                        <motion.div key={asset.id} variants={fadeInUp}>
                                            <Card className="overflow-hidden border-none shadow-md bg-card/40 backdrop-blur-sm group hover:shadow-xl transition-all duration-300">
                                                <div className="relative aspect-square bg-gradient-to-br from-purple-500/5 to-blue-500/5 flex items-center justify-center overflow-hidden">
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-10">
                                                            <Button 
                                                                variant="secondary" 
                                                                size="icon" 
                                                                className="rounded-full w-14 h-14 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300"
                                                                onClick={() => togglePlay(asset.url, asset.id)}
                                                            >
                                                                {playingId === asset.id && isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                                                            </Button>
                                                        </div>
                                                        
                                                        <div className="relative z-0 flex flex-col items-center">
                                                            <div className="w-20 h-20 rounded-2xl bg-white/50 backdrop-blur-md shadow-inner flex items-center justify-center mb-4">
                                                                <Music2 className="w-10 h-10 text-purple-400/50" />
                                                            </div>
                                                            
                                                            {playingId === asset.id && isPlaying && (
                                                                <div className="flex items-end gap-1 h-6">
                                                                    {[1, 2, 3, 4, 5].map(i => (
                                                                        <motion.div
                                                                            key={i}
                                                                            className="w-1 bg-purple-500/60 rounded-t-full"
                                                                            animate={{ height: ["20%", "100%", "40%", "80%", "20%"] }}
                                                                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                    <Badge className="absolute top-3 right-3 bg-white/80 text-purple-700 backdrop-blur-md border-none text-[10px] uppercase font-bold">
                                                        {meta?.model || "Suno V5"}
                                                    </Badge>
                                                </div>
                                                
                                                <CardContent className="p-4 space-y-3">
                                                    <div>
                                                        <h4 className="font-bold text-sm truncate">{meta?.title || asset.prompt || "Untitled Composition"}</h4>
                                                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider mt-0.5">
                                                            {meta?.style || "Original Audio"}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                                        <span>{asset.created_at ? new Date(asset.created_at).toLocaleDateString() : 'Recent'}</span>
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                className="hover:text-purple-600 transition-colors flex items-center gap-1"
                                                                onClick={() => window.open(asset.url, '_blank')}
                                                            >
                                                                <Download className="w-3 h-3" /> Save
                                                            </button>
                                                            <button 
                                                                className="hover:text-blue-600 transition-colors flex items-center gap-1"
                                                                onClick={() => handleIsolate(asset.url)}
                                                            >
                                                                <Wand2 className="w-3 h-3" /> Isolate
                                                            </button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center py-20 text-center">
                                <Music2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-semibold text-muted-foreground">No creations yet</h3>
                                <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
                                    Start by generating your first track in Normal or Custom mode.
                                </p>
                            </Card>
                        )}
                    </motion.div>
                </TabsContent>
            </Tabs>
            </motion.div>

            {/* Hidden Audio Element */}
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
    );
}
