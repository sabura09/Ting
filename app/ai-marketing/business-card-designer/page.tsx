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
    User,
    Mail,
    Phone,
    Globe,
    MapPin,
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

const BUSINESS_CARD_THEMES = [
    { id: "dark-minimalist", label: "Dark Minimalist" },
    { id: "gold-foil", label: "Gold Foil & Luxury" },
    { id: "corporate-blue", label: "Corporate Blue & Steel" },
    { id: "neon-tech", label: "Neon Tech & Cyberpunk" },
    { id: "creative-studio", label: "Creative Studio / Art" },
    { id: "textured-kraft", label: "Textured Kraft Paper" },
];

const RESOLUTIONS = [
    { id: "3:2", label: "Landscape (3:2)" },
    { id: "2:3", label: "Portrait (2:3)" },
    { id: "1:1", label: "Square Business Card (1:1)" },
];

const CONTRAST_MODES = [
    "High Contrast Dark & White",
    "Soft Pastel & Monochrome",
    "Matte Black & Gold Highlight",
    "Silver Foil & Slate Gray",
    "Vibrant Accent & Deep Charcoal",
];

function buildBusinessCardPrompt(opts: {
    name: string;
    title: string;
    company: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    layout: string;
    theme: string;
    colorPalette: string;
    additionalPrompt: string;
}): string {
    const contactParts = [
        opts.phone ? `Phone: ${opts.phone}` : "",
        opts.email ? `Email: ${opts.email}` : "",
        opts.website ? `Website: ${opts.website}` : "",
        opts.address ? `Address: ${opts.address}` : ""
    ].filter(Boolean);

    const contactStr = contactParts.length > 0 ? `Show beautiful minimal placements for contact info: ${contactParts.join(", ")}.` : "";

    const parts = [
        `Design a premium, professional business card mockup for "${opts.name}", working as "${opts.title}" at "${opts.company}".`,
        `The card design orientation is ${opts.layout}.`,
        `The visual design language is ${opts.theme} theme with a ${opts.colorPalette} color contrast.`,
        contactStr,
        opts.additionalPrompt ? `Visual details: ${opts.additionalPrompt}.` : "",
        `Rendered as a high-fidelity business card mockup on a clean, solid, neutral studio background with soft lighting, minimal layout, and modern layout geometry.`
    ];
    return parts.filter(Boolean).join(" ");
}

export default function BusinessCardDesignerPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState("");
    const [address, setAddress] = useState("");
    
    const [selectedTheme, setSelectedTheme] = useState("dark-minimalist");
    const [selectedPalette, setSelectedPalette] = useState(CONTRAST_MODES[0]);
    const [resolution, setResolution] = useState<"1:1" | "3:2" | "2:3">("3:2");
    const [additionalPrompt, setAdditionalPrompt] = useState("");

    const [generating, setGenerating] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const fetchCards = async () => {
        try {
            const res = await fetch("/api/marketing?action=list-assets&type=business-card");
            const data = await res.json();
            if (Array.isArray(data)) {
                setSavedCards(data);
            }
        } catch (e) {
            console.error("Failed to fetch business cards", e);
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
            fetchCards();
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
                        toast.success("Business card generated successfully!");
                        fetchCards();
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
        if (!name.trim()) {
            toast.error("Enter cardholder name");
            return;
        }
        if (!company.trim()) {
            toast.error("Enter company name");
            return;
        }
        if (window.location.href.includes("mounikai")) {
            toast.error("In the demo, this feature is disabled");
            return;
        }

        setGenerating(true);
        setResultImage(null);

        try {
            const prompt = buildBusinessCardPrompt({
                name,
                title,
                company,
                phone,
                email,
                website,
                address,
                layout: resolution === "3:2" ? "Landscape 3.5x2 inch standard" : (resolution === "2:3" ? "Portrait 2x3.5 inch standard" : "Square 2.5x2.5 inch layout"),
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
                    isBusinessCard: true,
                    name: name,
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
                toast.info("Business card generation started. Please wait...");
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
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/25">
                            <Palette className="w-7 h-7" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Business Card Designer</h1>
                        <p className="text-sm text-muted-foreground">Craft high-fidelity professional corporate business cards using AI</p>
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
                        {/* Personal Details */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <User className="w-4 h-4 text-primary" />
                                    Cardholder & Company Info
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name *</label>
                                        <input 
                                            type="text" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)} 
                                            placeholder="e.g. Marcus Aurelius" 
                                            disabled={generating}
                                            className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Title</label>
                                        <input 
                                            type="text" 
                                            value={title} 
                                            onChange={(e) => setTitle(e.target.value)} 
                                            placeholder="e.g. Marketing Lead" 
                                            disabled={generating}
                                            className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company / Brand *</label>
                                    <input 
                                        type="text" 
                                        value={company} 
                                        onChange={(e) => setCompany(e.target.value)} 
                                        placeholder="e.g. Imperial Digital Co." 
                                        disabled={generating}
                                        className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Information */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Mail className="w-4 h-4 text-primary" />
                                    Contact & Location Details
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value)} 
                                            placeholder="e.g. +1 (555) 019-2831" 
                                            disabled={generating}
                                            className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</label>
                                        <input 
                                            type="text" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                            placeholder="e.g. marcus@imperial.co" 
                                            disabled={generating}
                                            className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website URL</label>
                                        <input 
                                            type="text" 
                                            value={website} 
                                            onChange={(e) => setWebsite(e.target.value)} 
                                            placeholder="e.g. imperial.co" 
                                            disabled={generating}
                                            className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location / Address</label>
                                        <input 
                                            type="text" 
                                            value={address} 
                                            onChange={(e) => setAddress(e.target.value)} 
                                            placeholder="e.g. New York, NY" 
                                            disabled={generating}
                                            className="w-full h-11 px-4 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Style Customization */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Palette className="w-4 h-4 text-primary" />
                                    Visual Design Style
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Card Theme</label>
                                        <Select value={selectedTheme} onValueChange={setSelectedTheme} disabled={generating}>
                                            <SelectTrigger className="rounded-xl h-11 border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BUSINESS_CARD_THEMES.map((theme) => (
                                                    <SelectItem key={theme.id} value={theme.id}>{theme.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color & Texture</label>
                                        <Select value={selectedPalette} onValueChange={setSelectedPalette} disabled={generating}>
                                            <SelectTrigger className="rounded-xl h-11 border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CONTRAST_MODES.map((palette) => (
                                                    <SelectItem key={palette} value={palette}>{palette}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Card Format / Shape</label>
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
                                    placeholder="e.g. Include a geometric abstract triangle brand icon, clean fonts, minimal grid layout on front." 
                                    rows={3} 
                                    disabled={generating}
                                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none" 
                                />
                            </CardContent>
                        </Card>

                        <Button 
                            className="w-full btn-premium h-14 text-base gap-2.5 rounded-2xl" 
                            disabled={generating || !name.trim() || !company.trim()} 
                            onClick={handleGenerate}
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Designing Card...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Generate Business Card</span>
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
                                <span className="text-sm font-semibold">Business Card Preview</span>
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
                                            <img src={resultImage} alt={name} className="w-full h-auto rounded-2xl transition-transform duration-500 hover:scale-[1.01]" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="rounded-full shadow-lg" 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        downloadAsset(resultImage, `${name.replace(/\s+/g, '-')}-card.png`); 
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
                                                <Palette className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-foreground">Engraving Card...</h3>
                                                <p className="text-sm text-muted-foreground max-w-[260px]">AI is drawing a customized mockup design for <span className="font-semibold text-primary">{name}</span></p>
                                            </div>
                                            <div className="w-48 bg-muted/30 rounded-full h-1 overflow-hidden">
                                                <motion.div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 30, ease: "linear" }} />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
                                            <div className="p-6 rounded-full bg-muted/20 border border-border/20">
                                                <Palette className="w-10 h-10 text-muted-foreground/30" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-semibold text-muted-foreground">Mockup Preview</h3>
                                                <p className="text-sm text-muted-foreground/60 max-w-[240px]">Configure your corporate credentials, then tap generate to see your business card</p>
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
                            <p className="text-sm text-muted-foreground">Access your previously generated business card layouts</p>
                        </div>
                    </div>

                    {loadingHistory ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="aspect-[3/2] rounded-[2rem] bg-card/45 animate-pulse border border-border/20 shadow-inner" />
                            ))}
                        </div>
                    ) : savedCards.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {savedCards.map((card, idx) => (
                                <motion.div
                                    key={card.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    transition={{ duration: 0.4 }}
                                    className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-gradient-to-b from-card to-muted border border-border/40 shadow-sm group cursor-pointer"
                                >
                                    <img 
                                        src={card.url} 
                                        alt="Business Card layout" 
                                        className="w-full h-full object-cover"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white font-semibold truncate mb-2">{card.prompt || "Card Design"}</p>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30" onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30" onClick={() => { downloadAsset(card.url, `card-${card.id}.png`); toast.success("Download started"); }}>
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl bg-primary/30 backdrop-blur text-white hover:bg-primary/40" onClick={() => { 
                                                setResultImage(card.url);
                                                setName(card.metadata?.name || "");
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
                            <Palette className="w-10 h-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                            <p className="font-medium text-sm">No business card mockups in your catalog</p>
                            <p className="text-xs text-muted-foreground/60">Generate your first premium business card mockup to see it listed here.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AssetViewer
                open={viewerOpen}
                close={() => setViewerOpen(false)}
                assets={savedCards}
                currentIndex={viewerIndex}
            />
        </Layout>
    );
}
