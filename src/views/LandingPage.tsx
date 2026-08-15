"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Sparkles,
    MessageSquare,
    PenTool,
    Code,
    FileText,
    Mail,
    Image,
    Database,
    Languages,
    Brain,
    FileUser,
    Share2,
    ArrowRight,
    Menu,
    X,
    LayoutTemplate,
    Zap,
    Shield,
    Rocket,
    Play,
    Check,
    Star,
    Users,
    Globe,
    Bot,
    Cpu,
    Wand2,
    Layers,
    TrendingUp,
    Award,
    Clock,
    Music,
    Music2,
    Megaphone,
    Target,
    BarChart3,
    Headphones,
    Mic2,
    Radio,
    LineChart,
    Hash,
    Newspaper,
    Palette,
    MousePointerClick,
    Volume2,
    Pause,
    Tag,
    type LucideIcon,
} from "lucide-react";
import VideoModal from "@/components/VideoModal";
import ChatWidget from "@/components/chat/ChatWidget";
import { useSettings } from "@/contexts/SettingsContext";
import { TOOLS_COUNT_DISPLAY } from "@/lib/constants";
import { getSummerVibesMusic } from "@/actions/music-generator";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { TechHeroScene } from "@/components/brand/TechHeroScene";

// --- Configuration ---

interface Feature {
    title: string;
    description: string;
    icon: LucideIcon;
    url: string;
    color: string;
    isNew?: boolean;
}




// Animation variants
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 26 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.52, ease: "easeOut" } },
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.055, delayChildren: 0.04 },
    },
};

export default function LandingPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [showCustomBubble, setShowCustomBubble] = useState(false);
    const [isBubbleMinimized, setIsBubbleMinimized] = useState(false);
    const { settings } = useSettings();

    useEffect(() => {
        if (typeof window !== "undefined" && !window.location.href.includes("mounikai")) {
            return;
        }

        const minimized = sessionStorage.getItem("custom-requirement-minimized") === "true";
        if (minimized) {
            setIsBubbleMinimized(true);
            setShowCustomBubble(true);
        } else {
            const timer = setTimeout(() => {
                setShowCustomBubble(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, []);

    const features: Feature[] = [
        {
            title: "Live Chat",
            description: "Intelligent live support agent for your queries.",
            icon: MessageSquare,
            url: "/support-agent",
            color: "from-teal-500 to-emerald-500",
            isNew: true,
        },
        {
            title: "AI Website Builder",
            description: "Generate full websites from a single prompt with modern designs.",
            icon: LayoutTemplate,
            url: "/website",
            color: "from-violet-500 to-purple-600",
            isNew: true,
        },
        {
            title: "AI Chat Assistant",
            description: "Intelligent conversations powered by advanced language models.",
            icon: MessageSquare,
            url: "/chat",
            color: "from-blue-500 to-cyan-500",
        },
        {
            title: "Code Generator",
            description: "Write, debug, and refactor code in any programming language.",
            icon: Code,
            url: "/code",
            color: "from-emerald-500 to-teal-500",
        },
        {
            title: "Content Writer",
            description: "Create blog posts, articles, and marketing copy instantly.",
            icon: PenTool,
            url: "/writer",
            color: "from-pink-500 to-rose-500",
        },
        {
            title: "Document Summarizer",
            description: "Turn lengthy documents into concise executive summaries.",
            icon: FileText,
            url: "/summary",
            color: "from-orange-500 to-amber-500",
        },
        {
            title: "Image Generator",
            description: "Create stunning visuals from text descriptions.",
            icon: Image,
            url: "/ai-marketing/image-generator",
            color: "from-indigo-500 to-violet-500",
        },
        {
            title: "SQL Architect",
            description: "Transform natural language into complex SQL queries.",
            icon: Database,
            url: "/sql",
            color: "from-slate-500 to-gray-600",
        },
        {
            title: "Translation Hub",
            description: "Professional translations in 50+ languages.",
            icon: Languages,
            url: "/translator",
            color: "from-teal-500 to-green-500",
        },
        {
            title: "Quiz Master",
            description: "Generate educational assessments and quizzes.",
            icon: Brain,
            url: "/quiz",
            color: "from-purple-500 to-pink-500",
        },
        {
            title: "Resume Builder",
            description: "Create ATS-optimized resumes and cover letters.",
            icon: FileUser,
            url: "/resume",
            color: "from-yellow-500 to-orange-500",
        },
        {
            title: "Social Suite",
            description: "Craft viral posts, captions, and hashtags.",
            icon: Share2,
            url: "/social",
            color: "from-cyan-500 to-blue-500",
        },
        {
            title: "Email Assistant",
            description: "Draft professional emails and responses.",
            icon: Mail,
            url: "/email",
            color: "from-red-500 to-pink-500",
        },
        {
            title: "AI Music Studio",
            description: "Generate professional tracks from text or lyrics with Suno V5.",
            icon: Music,
            url: "/music-generator",
            color: "from-purple-500 to-pink-500",
            isNew: true,
        },
        {
            title: "AI Marketing Suite",
            description: "Social media automation, SEO content, and ad copy generation.",
            icon: Megaphone,
            url: "/social",
            color: "from-blue-500 to-cyan-500",
            isNew: true,
        },
    ];

    const aiMarketingFeatures = [
        {
            icon: Share2,
            title: "Social Media Automation",
            description: "Auto-generate viral posts, captions, and hashtags for every platform. Schedule and optimize content at scale.",
            color: "from-blue-500 to-cyan-500",
        },
        {
            icon: Newspaper,
            title: "SEO Content Engine",
            description: "Create SEO-optimized blog posts, landing pages, and meta descriptions that rank on Google.",
            color: "from-emerald-500 to-teal-500",
        },
        {
            icon: Mail,
            title: "Email Campaigns",
            description: "Craft high-converting email sequences, newsletters, and drip campaigns powered by AI.",
            color: "from-pink-500 to-rose-500",
        },
        {
            icon: MousePointerClick,
            title: "Ad Copy Generator",
            description: "Generate compelling ad copy for Google, Meta, LinkedIn, and TikTok in seconds.",
            color: "from-amber-500 to-orange-500",
        },
        {
            icon: Target,
            title: "Brand Voice Analysis",
            description: "Train AI on your brand tone and style for consistent messaging across all channels.",
            color: "from-violet-500 to-purple-500",
        },
        {
            icon: BarChart3,
            title: "Marketing Analytics",
            description: "AI-powered insights on campaign performance with actionable optimization suggestions.",
            color: "from-indigo-500 to-blue-600",
        },
    ];

    const musicFeatures = [
        {
            icon: Music2,
            title: "Text-to-Music",
            description: "Describe any mood, genre, or vibe and get professional-quality tracks generated instantly.",
            color: "from-purple-500 to-violet-600",
        },
        {
            icon: Mic2,
            title: "Custom Lyrics Mode",
            description: "Write your own lyrics and let AI compose the perfect melody, harmony, and arrangement.",
            color: "from-pink-500 to-fuchsia-500",
        },
        {
            icon: Palette,
            title: "Genre Mixing",
            description: "Blend multiple genres seamlessly - from lo-fi jazz to cinematic synthwave and beyond.",
            color: "from-cyan-500 to-blue-500",
        },
        {
            icon: Wand2,
            title: "Audio Isolation",
            description: "Separate vocals, drums, bass, and instruments from any track with studio precision.",
            color: "from-emerald-500 to-green-500",
        },
        {
            icon: Radio,
            title: "Multi-Model Engine",
            description: "Choose between Suno V5, V4.5, and V4.5 Plus for the perfect sound quality.",
            color: "from-amber-500 to-yellow-500",
        },
        {
            icon: Headphones,
            title: "48kHz Stereo Export",
            description: "Download your tracks in high-quality 48kHz stereo - ready for streaming and production.",
            color: "from-rose-500 to-red-500",
        },
    ];

    const stats = [
        { value: TOOLS_COUNT_DISPLAY, label: "AI Tools" },
        { value: "50K+", label: "Active Users" },
        { value: "10M+", label: "Generations" },
        { value: "99.9%", label: "Uptime" },
    ];

    const testimonials = [
        {
            quote: `${settings?.metadata?.siteName || "TingAi"} has completely transformed how I create content. What used to take hours now takes minutes.`,

            author: "Sarah Chen",
            role: "Content Marketing Manager",
            avatar: "SC",
        },
        {
            quote: "The code generation feature saved our team countless hours. It's like having a senior developer on demand.",
            author: "Michael Torres",
            role: "Tech Lead at StartupXYZ",
            avatar: "MT",
        },
        {
            quote: "Best AI tool investment we've made. The ROI has been incredible for our agency.",
            author: "Emily Watson",
            role: "Agency Owner",
            avatar: "EW",
        },
    ];

    const pricingPlans = [
        {
            name: "Free",
            price: "$0",
            period: "forever",
            description: `Perfect for trying out our platform`,

            features: [
                "1,000 tokens",
                "Access to 10 AI tools",
                "Standard response time",
                "Community support",
            ],
            cta: "Get Started",
            popular: false,
        },
        {
            name: "Pro",
            price: "$19",
            period: "/month",
            description: "Best for professionals and creators",
            features: [
                "50,000 tokens/month",
                `Access to all ${TOOLS_COUNT_DISPLAY} AI tools`,
                "Priority response time",
                "API access",
                "Priority support",
                "Custom templates",
            ],
            cta: "Start Free Trial",
            popular: true,
        },
        {
            name: "Enterprise",
            price: "Custom",
            period: "",
            description: "For teams and organizations",
            features: [
                "Unlimited tokens",
                "All Pro features",
                "Dedicated account manager",
                "Custom AI training",
                "SLA guarantee",
                "On-premise deployment",
            ],
            cta: "Contact Sales",
            popular: true,
        },
    ];

    const [plans, setPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [summerVibesSong, setSummerVibesSong] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pageRef = useRef<HTMLDivElement>(null);

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const { scrollY, scrollYProgress } = useScroll({ container: pageRef });
    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
    const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch("/api/plans");
                if (res.ok) {
                    const data = await res.json();
                    if (data.plans && data.plans.length > 0) {
                        setPlans(data.plans.filter((p: any) => p.isActive));
                    } else {
                        setPlans(pricingPlans);
                    }
                } else {
                    setPlans(pricingPlans);
                }
            } catch (error) {
                setPlans(pricingPlans);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();

        const fetchSummerVibes = async () => {
            try {
                const res = await getSummerVibesMusic();
                if (res.success) {
                    setSummerVibesSong(res.song);
                }
            } catch (error) {
                console.error("Error fetching Summer Vibes:", error);
            }
        };
        fetchSummerVibes();
    }, []);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const scrollContainer = pageRef.current;
        const handleScroll = () => {
            const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
            setScrolled(scrollTop > 20);
        };
        const target = scrollContainer || window;
        target.addEventListener("scroll", handleScroll);
        return () => target.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div ref={pageRef} className="dark h-screen overflow-x-hidden overflow-y-auto bg-[#03040a] text-slate-100">
            <motion.div
                className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-cyan-300 via-primary to-fuchsia-400 shadow-[0_0_18px_hsl(var(--primary))]"
                style={{ scaleX: scrollYProgress }}
            />
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.24)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.24)_1px,transparent_1px)] bg-[size:52px_52px]" />
                <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,hsl(var(--primary)/0.09)_34%,transparent_56%,hsl(var(--ai-secondary)/0.08)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--foreground)/0.08),transparent_42%)] dark:bg-[radial-gradient(ellipse_at_top,hsl(var(--foreground)/0.055),transparent_44%)]" />
                <motion.div className="absolute -left-48 top-[14%] h-[30rem] w-[30rem] rounded-full bg-cyan-400/[0.08] blur-[110px]" animate={{ x: [0, 150, 25, 0], y: [0, 90, 180, 0], scale: [1, 1.16, 0.94, 1] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div className="absolute -right-56 top-[38%] h-[34rem] w-[34rem] rounded-full bg-fuchsia-500/[0.08] blur-[120px]" animate={{ x: [0, -130, -35, 0], y: [0, 160, -60, 0], scale: [0.9, 1.08, 1.2, 0.9] }} transition={{ duration: 29, repeat: Infinity, ease: "easeInOut" }} />
            </div>

            {/* Header */}
            <motion.header
                className={`fixed left-0 right-0 z-50 transition-all duration-300 backdrop-blur-2xl ${scrolled
                    ? "border-b border-white/10 bg-black/75 py-3 shadow-2xl shadow-black/30"
                    : "border-b border-white/5 bg-black/35 py-5"
                    }`}
                style={{ top: "var(--banner-height, 0px)" }}
                initial={false}
            >
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <BrandLogo imageClassName="h-9 max-w-[142px]" />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden items-center gap-7 md:flex">
                        <a href="#features" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                            Features
                        </a>
                        <a href="#ai-marketing" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                            AI Marketing
                        </a>
                        <a href="#music-generation" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                            Music
                        </a>
                        <a href="#tools" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                            Tools
                        </a>
                        <a href="#pricing" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                            Pricing
                        </a>
                        <div className="h-4 w-px bg-white/10" />
                        <ThemeToggle />
                        <div className="flex items-center gap-3">
                            {settings?.showDemoMode !== false && (
                                <Link href="https://mounikai.com/product/a9921866-35a4-41d0-a137-23483d06e0b7" target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" className="border border-amber-300/20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-950/30 hover:from-amber-400 hover:to-orange-400">
                                        Buy Now
                                    </Button>
                                </Link>
                            )}
                            <Link href="/login" target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="hover:bg-white/10">Log in</Button>
                            </Link>
                            <Link href="/register" target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="shadow-lg shadow-primary/20">Get Started Free</Button>
                            </Link>
                        </div>
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center gap-3">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden border-b border-white/10 bg-black/90 backdrop-blur-2xl md:hidden"
                        >
                            <nav className="container mx-auto px-4 py-6 space-y-4 flex flex-col">
                                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary">
                                    Features
                                </a>
                                <a href="#ai-marketing" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary">
                                    AI Marketing
                                </a>
                                <a href="#music-generation" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary">
                                    Music
                                </a>
                                <a href="#tools" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary">
                                    Tools
                                </a>
                                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary">
                                    Pricing
                                </a>
                                <hr className="border-border/50" />
                                {settings?.showDemoMode !== false && (
                                    <Link href="https://mounikai.com/product/a9921866-35a4-41d0-a137-23483d06e0b7" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
                                        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">Buy Now</Button>
                                    </Link>
                                )}
                                <Link href="/login" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full">Log in</Button>
                                </Link>
                                <Link href="/register" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full">Get Started Free</Button>
                                </Link>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>

            {/* Hero Section */}
            <section className="relative min-h-[calc(100dvh-var(--banner-height,0px))] overflow-hidden pt-28 lg:pt-32">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,#03040a_0%,transparent_38%,hsl(var(--primary)/0.08)_100%)]" />
                <div className="container relative z-10 mx-auto grid min-h-[calc(100dvh-7rem)] grid-cols-1 items-center gap-10 px-4 pb-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
                    <motion.div
                        className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55 }}
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase text-primary shadow-[0_0_24px_hsl(var(--primary)/0.16)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-ai-secondary shadow-[0_0_12px_hsl(var(--ai-secondary))]" />
                            TingAi Neural Workspace
                        </div>

                        <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-8xl">
                            Build with an AI cockpit, not another dashboard.
                        </h1>

                        <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg lg:text-xl">
                            TingAi brings chat, content, code, images, web creation, marketing, and automation into one sharp command center for serious creative work.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                            <Link href="/login" target="_blank" rel="noopener noreferrer">
                                <Button size="xl" className="w-full sm:w-auto">
                                    Launch Workspace
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="#tools">
                                <Button size="xl" variant="outline" className="w-full border-primary/25 bg-card/[0.55] sm:w-auto">
                                    Explore Tools
                                </Button>
                            </Link>
                        </div>

                        <div className="tech-border-flow mt-10 grid grid-cols-3 overflow-hidden rounded-2xl border border-border/70 bg-card/[0.58] text-left shadow-2xl shadow-black/20 backdrop-blur-2xl">
                            {[
                                { value: TOOLS_COUNT_DISPLAY, label: "AI tools" },
                                { value: "3D", label: "interface" },
                                { value: "24/7", label: "workspace" },
                            ].map((item) => (
                                <div key={item.label} className="border-r border-border/60 p-4 last:border-r-0 sm:p-5">
                                    <div className="text-2xl font-black text-foreground sm:text-3xl">{item.value}</div>
                                    <div className="mt-1 text-xs font-medium uppercase text-muted-foreground">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        className="relative mx-auto aspect-square w-full max-w-[680px]"
                        initial={false}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.12 }}
                    >
                        <div className="absolute inset-[5%] rounded-full bg-[radial-gradient(circle_at_48%_46%,rgba(139,92,246,0.2),rgba(7,13,24,0.72)_48%,rgba(3,4,10,0)_72%)] shadow-[0_0_140px_-45px_rgba(103,232,249,0.65)]" />
                        <motion.div className="absolute inset-[8%] rounded-full border border-cyan-300/20" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }}>
                            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_22px_rgb(103_232_249)]" />
                            <span className="absolute bottom-[9%] right-[13%] h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_rgb(244_114_182)]" />
                        </motion.div>
                        <motion.div className="absolute inset-[16%] rounded-full border border-dashed border-primary/25" animate={{ rotate: -360 }} transition={{ duration: 34, repeat: Infinity, ease: "linear" }} />
                        <TechHeroScene />

                        <div className="absolute left-[2%] top-[18%] flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/60 px-3 py-2 shadow-[0_12px_45px_-20px_rgb(34_211_238)] backdrop-blur-xl sm:left-[5%] sm:px-4">
                            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgb(110_231_183)]" />
                            <span className="whitespace-nowrap text-[10px] font-black uppercase text-cyan-100 sm:text-xs">12 models online</span>
                        </div>

                        <div className="absolute bottom-[14%] right-[1%] flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-black/60 px-3 py-2 shadow-[0_12px_45px_-20px_rgb(244_114_182)] backdrop-blur-xl sm:right-[5%] sm:px-4">
                            <BrandLogo variant="mark" className="h-7 w-7 ring-1 ring-white/10 sm:h-8 sm:w-8" />
                            <div><div className="whitespace-nowrap text-[10px] font-black text-white sm:text-xs">Neural pulse</div><div className="whitespace-nowrap text-[9px] text-muted-foreground sm:text-[10px]">124 workflows synced</div></div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Legacy Hero Section */}
            <section className="hidden">
                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="container mx-auto px-4 text-center relative z-10"
                >

                    {/* Main Heading */}
                    <motion.h1
                        className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <span className="text-foreground">The Ultimate</span>
                        <br />
                        <span className="gradient-text bg-gradient-to-r from-primary via-ai-secondary to-ai-tertiary bg-clip-text text-transparent">
                            AI Productivity Suite
                        </span>
                    </motion.h1>

                    {/* Subheading */}
                    <motion.p
                        className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Access {TOOLS_COUNT_DISPLAY} powerful AI tools. Generate content, code, images, websites,
                        and more with cutting-edge AI technology.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Link href="/login" target="_blank" rel="noopener noreferrer">
                            <Button size="xl" className="group">
                                Live Demo
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        {settings?.showDemoMode !== false && (
                            <Button
                                size="xl"
                                variant="outline"
                                onClick={() => setIsVideoOpen(true)}
                                className="group"
                            >
                                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Watch Demo
                            </Button>
                        )}
                        {settings?.showDemoMode !== false && (
                            <Link
                                href="https://mounikai.com/product/a9921866-35a4-41d0-a137-23483d06e0b7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative group inline-flex items-center justify-center select-none"
                            >
                                {/* Intense Glowing Aura behind the button */}
                                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 opacity-90 blur-lg group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 animate-pulse" />

                                {/* Festive Burst Rays */}
                                <div className="absolute -top-2.5 -left-2 z-30 pointer-events-none flex gap-0.5">
                                    <span className="w-1 h-2.5 bg-amber-400 rounded-full rotate-[-45deg] animate-pulse" />
                                    <span className="w-1 h-2 bg-red-500 rounded-full rotate-[-20deg]" />
                                    <span className="w-1 h-2 bg-orange-400 rounded-full rotate-[10deg]" />
                                </div>
                                <div className="absolute -top-2.5 -right-2 z-30 pointer-events-none flex gap-0.5">
                                    <span className="w-1 h-2 bg-orange-400 rounded-full rotate-[-10deg]" />
                                    <span className="w-1 h-2 bg-red-500 rounded-full rotate-[20deg]" />
                                    <span className="w-1 h-2.5 bg-amber-400 rounded-full rotate-[45deg] animate-pulse" />
                                </div>

                                {/* Top Ribbon Tab: SPECIAL OFFER */}
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                    <div className="px-2.5 py-[2px] rounded-t-md bg-gradient-to-b from-rose-500 via-red-600 to-rose-700 border-t border-x border-amber-300/80 shadow-[0_-2px_4px_rgba(225,29,72,0.6)] flex items-center gap-1 text-white font-black text-[8px] md:text-[9px] tracking-wider uppercase whitespace-nowrap leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                                        <Star className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300 animate-spin-slow shrink-0" />
                                        SPECIAL OFFER
                                    </div>
                                </div>

                                {/* Outer Golden Metallic Pill Frame */}
                                <div className="relative z-20 p-[2px] rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 shadow-[0_6px_18px_rgba(225,29,72,0.5),0_0_12px_rgba(251,191,36,0.5)] group-hover:scale-[1.03] active:scale-[0.98] transition-transform duration-300">
                                    {/* Inner Vibrant Pill Body */}
                                    <div className="relative flex items-center gap-2.5 md:gap-3 rounded-full px-4 py-2 h-[52px] bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 border border-amber-300/60 overflow-hidden shadow-[inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-3px_6px_rgba(0,0,0,0.5)]">
                                        {/* Glossy Top Reflection */}
                                        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />

                                        {/* Corner Specular Highlights */}
                                        <div className="absolute top-1 left-6 w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px]" />
                                        <div className="absolute top-1 right-6 w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px]" />

                                        {/* Left Medallion: Double Gold Ring + Tag with % */}
                                        <div className="relative shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full p-[2px] bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.9)] group-hover:scale-105 transition-transform duration-300">
                                            <div className="w-full h-full rounded-full bg-gradient-to-b from-stone-900 via-neutral-900 to-black flex items-center justify-center border border-amber-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                                                <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 text-white fill-white -rotate-12 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                                    <path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9a2 2 0 0 0 2.83 0l7-7a2 2 0 0 0 0-2.84zM6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 7.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm2-3l3.5-3.5m-1 6.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" stroke="currentColor" strokeWidth="0.5" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Stacked Italic Bold Typography */}
                                        <div className="flex flex-col text-left justify-center leading-none select-none pr-0.5">
                                            <span className="text-white font-black italic tracking-wider text-[9px] md:text-[10px] uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                                GET DISCOUNTED
                                            </span>
                                            <span className="text-yellow-300 font-black italic tracking-normal text-base md:text-lg uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                                PRICE
                                            </span>
                                        </div>

                                        {/* Right Circle Arrow */}
                                        <div className="relative shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white text-orange-600 shadow-[0_2px_6px_rgba(0,0,0,0.4)] flex items-center justify-center group-hover:translate-x-0.5 transition-transform duration-300">
                                            <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3]" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl md:text-4xl font-bold gradient-text-primary mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Floating Elements */}
                <div className="absolute top-1/4 left-10 hidden lg:block">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="p-3 bg-card rounded-2xl shadow-xl border"
                    >
                        <Code className="w-6 h-6 text-emerald-500" />
                    </motion.div>
                </div>
                <div className="absolute top-1/3 right-10 hidden lg:block">
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="p-3 bg-card rounded-2xl shadow-xl border"
                    >
                        <Image className="w-6 h-6 text-violet-500" />
                    </motion.div>
                </div>
                <div className="absolute bottom-1/4 left-20 hidden lg:block">
                    <motion.div
                        animate={{ y: [0, -15, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="p-3 bg-card rounded-2xl shadow-xl border"
                    >
                        <PenTool className="w-6 h-6 text-pink-500" />
                    </motion.div>
                </div>
                <div className="absolute bottom-1/3 right-20 hidden lg:block">
                    <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        className="p-3 bg-card rounded-2xl shadow-xl border"
                    >
                        <Music2 className="w-6 h-6 text-purple-500" />
                    </motion.div>
                </div>
                <div className="absolute top-1/2 left-32 hidden xl:block">
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                        className="p-3 bg-card rounded-2xl shadow-xl border"
                    >
                        <Megaphone className="w-6 h-6 text-cyan-500" />
                    </motion.div>
                </div>
            </section>

            {/* Trusted By Section */}
            <section className="relative overflow-hidden border-y border-white/10 bg-black/35 py-12 backdrop-blur-xl">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.08),transparent)]" />
                <div className="container mx-auto px-4 mb-8">
                    <p className="relative text-center text-xs font-bold uppercase text-muted-foreground">
                        Trusted by 50,000+ professionals worldwide
                    </p>
                </div>
                <div 
                    className="relative w-full overflow-hidden"
                    style={{
                        maskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)'
                    }}
                >
                    <div className="flex whitespace-nowrap marquee-scroll min-w-full">
                        {/* First group */}
                        <div className="flex shrink-0 justify-around items-center gap-12 md:gap-24 min-w-full px-4">
                            {["Google", "Microsoft", "Amazon", "Meta", "Netflix", "Spotify", "Apple", "Tesla", "NVIDIA", "OpenAI"].map((company, index) => (
                                <span key={`comp1-${index}`} className="bg-gradient-to-r from-white via-white/70 to-white/35 bg-clip-text text-xl font-black text-transparent opacity-60 transition-opacity duration-300 select-none hover:opacity-100 md:text-2xl">
                                    {company}
                                </span>
                            ))}
                        </div>
                        {/* Second group (duplicate) */}
                        <div className="flex shrink-0 justify-around items-center gap-12 md:gap-24 min-w-full px-4">
                            {["Google", "Microsoft", "Amazon", "Meta", "Netflix", "Spotify", "Apple", "Tesla", "NVIDIA", "OpenAI"].map((company, index) => (
                                <span key={`comp2-${index}`} className="bg-gradient-to-r from-white via-white/70 to-white/35 bg-clip-text text-xl font-black text-transparent opacity-60 transition-opacity duration-300 select-none hover:opacity-100 md:text-2xl">
                                    {company}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative overflow-hidden py-28">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,hsl(var(--primary)/0.055),transparent)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="container relative z-10 mx-auto px-4">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4 border-primary/25 bg-primary/10 text-primary">Core System</Badge>
                        <h2 className="mx-auto mb-4 max-w-3xl text-4xl font-black leading-tight text-foreground md:text-6xl">
                            Everything runs from one polished AI command layer
                        </h2>
                        <p className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground">
                            Fast, secure, production-ready tools with a darker visual system built for focus and repeat work.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid auto-rows-[minmax(220px,auto)] gap-5 lg:grid-cols-6"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <motion.div variants={fadeInUp} className="tech-border-flow tech-scan-surface group relative overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-[#07111b]/80 p-6 shadow-[0_34px_120px_-58px_rgb(34_211_238)] backdrop-blur-2xl lg:col-span-4 lg:row-span-2">
                            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
                            <div className="absolute -right-20 top-10 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
                            <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase text-cyan-100">
                                        <Zap className="h-3.5 w-3.5" />
                                        Neural response layer
                                    </div>
                                    <h3 className="max-w-xl text-3xl font-black leading-tight md:text-4xl">Fast work feels like a control room, not a form.</h3>
                                    <p className="mt-4 max-w-xl leading-8 text-muted-foreground">Chat, code, writing, images and automation share one dark operational surface with clear states and readable hierarchy.</p>
                                </div>
                                <div className="grid w-full max-w-xs grid-cols-2 gap-3">
                                    {[
                                        { label: "Latency", value: "0.8s" },
                                        { label: "Models", value: "12+" },
                                        { label: "Exports", value: "Clean" },
                                        { label: "Status", value: "Live" },
                                    ].map((metric) => (
                                        <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                                            <p className="text-[11px] font-bold uppercase text-muted-foreground">{metric.label}</p>
                                            <p className="mt-1 text-2xl font-black">{metric.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    <span className="ml-3 text-xs font-bold uppercase text-muted-foreground">TingAi Pipeline</span>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {["Prompt analysis", "Model routing", "Production output"].map((step, index) => (
                                        <div key={step} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                                                <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-primary to-ai-secondary" />
                                            </div>
                                            <p className="font-bold">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="tech-border-flow relative overflow-hidden rounded-[1.75rem] border border-lime-300/20 bg-[#08130b]/80 p-6 shadow-[0_34px_110px_-64px_rgb(132_204_22)] backdrop-blur-2xl lg:col-span-2">
                            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/80 to-transparent" />
                            <Shield className="mb-5 h-9 w-9 text-lime-300" />
                            <h3 className="text-2xl font-black">Secure by default</h3>
                            <p className="mt-3 leading-7 text-muted-foreground">Clear permissions, encrypted flows, and enterprise-ready controls for serious teams.</p>
                            <div className="mt-6 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-bold text-lime-100">Risk status: protected</div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="tech-border-flow relative overflow-hidden rounded-[1.75rem] border border-fuchsia-300/20 bg-[#140716]/80 p-6 shadow-[0_34px_110px_-64px_rgb(217_70_239)] backdrop-blur-2xl lg:col-span-2">
                            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-300/20 blur-2xl" />
                            <Rocket className="mb-5 h-9 w-9 text-fuchsia-200" />
                            <h3 className="text-2xl font-black">Production output</h3>
                            <p className="mt-3 leading-7 text-muted-foreground">Outputs are structured for handoff: copy, code, assets, plans and campaigns ready to use.</p>
                            <div className="mt-6 flex gap-2">
                                {["Copy", "Code", "Media"].map((item) => (
                                    <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold">{item}</span>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Glow Divider */}
            <div className="tech-line-runner" />

            {/* AI Marketing Showcase Section */}
            <section id="ai-marketing" className="relative overflow-hidden py-28">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.05),transparent_42%,hsl(var(--ai-secondary)/0.08))]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.14)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.14)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
                <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full border border-primary/20 bg-primary/10 blur-3xl" />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4 border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
                            <Megaphone className="w-3 h-3 mr-1" /> AI Marketing
                        </Badge>
                        <h2 className="mx-auto mb-5 max-w-4xl text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
                            Supercharge Your{" "}
                            <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                                Marketing with AI
                            </span>
                        </h2>
                        <p className="mx-auto max-w-3xl text-lg leading-8 text-muted-foreground">
                            From social media to SEO, email campaigns to ad copy - automate and elevate your entire marketing stack with AI-powered tools.
                        </p>
                    </motion.div>

                    <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
                        {/* Feature Cards Grid */}
                        <motion.div
                            className="space-y-3"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                        >
                            {aiMarketingFeatures.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    variants={fadeInUp}
                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-3 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-cyan-300/40 hover:bg-cyan-300/[0.055]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br ${feature.color} shadow-lg shadow-black/30`}>
                                            <feature.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <h3 className="truncate text-base font-black transition-colors group-hover:text-cyan-200">{feature.title}</h3>
                                                <span className="hidden h-1.5 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 opacity-70 sm:block" />
                                            </div>
                                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Marketing Dashboard Mockup */}
                        <motion.div
                            className="relative"
                            initial={{ opacity: 0, y: 28 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="tech-border-flow tech-scan-surface relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070a13]/85 p-5 shadow-[0_40px_120px_-55px_rgb(34_211_238)] backdrop-blur-2xl md:p-6">
                                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
                                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
                                {/* Dashboard Header */}
                                <div className="relative mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black">Marketing Dashboard</h3>
                                        <p className="text-xs text-muted-foreground">Real-time campaign analytics</p>
                                    </div>
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">● Live</Badge>
                                </div>

                                {/* Stats Row */}
                                <div className="relative mb-6 grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Engagement", value: "84.2%", change: "+12.5%", color: "text-green-500" },
                                        { label: "CTR", value: "6.8%", change: "+3.2%", color: "text-blue-500" },
                                        { label: "Conversions", value: "2,847", change: "+18.7%", color: "text-violet-500" },
                                    ].map((stat, i) => (
                                        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center" style={{ animationDelay: `${i * 0.8}s` }}>
                                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                                            <p className="text-xl font-bold">{stat.value}</p>
                                            <p className={`text-xs font-medium ${stat.color}`}>{stat.change}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Fake Chart Area */}
                                <div className="relative flex h-36 items-end justify-between gap-1.5 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/5 via-cyan-500/10 to-teal-500/5 px-4 pb-4">
                                    {[40, 65, 45, 80, 55, 70, 85, 60, 90, 75, 95, 68].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex-1 rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-400"
                                            initial={{ height: 0 }}
                                            whileInView={{ height: `${h}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.1 * i }}
                                        />
                                    ))}
                                </div>

                                {/* Gradient overlay at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#070a13] to-transparent" />
                            </div>

                            {/* Floating Metric Cards */}
                            <motion.div
                                className="absolute -right-3 -top-4 z-20 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-xl"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-bold">+247%</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">ROI this month</p>
                            </motion.div>

                            <motion.div
                                className="absolute -bottom-4 -left-3 z-20 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-xl"
                                animate={{ y: [0, 6, 0] }}
                                transition={{ duration: 5, repeat: Infinity }}
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-bold">12.4K</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">New followers</p>
                            </motion.div>
                        </motion.div>
                    </div>

                    <div className="text-center mt-12">
                        <Link href="/social" target="_blank" rel="noopener noreferrer">
                            <Button size="lg" className="group border border-cyan-300/20 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_18px_60px_-24px_rgb(34_211_238)] hover:from-blue-500 hover:to-cyan-400">
                                Explore AI Marketing
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Glow Divider */}
            <div className="tech-line-runner" />

            {/* Music Generation Showcase Section */}
            <section id="music-generation" className="relative overflow-hidden border-y border-white/10 bg-black/25 py-28">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.14),transparent_44%),linear-gradient(180deg,transparent,hsl(var(--ai-tertiary)/0.065))]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.12)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.12)_1px,transparent_1px)] bg-[size:64px_64px] opacity-50" />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4 border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200">
                            <Music className="w-3 h-3 mr-1" /> AI Music Studio
                        </Badge>
                        <h2 className="mx-auto mb-5 max-w-4xl text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
                            Create Professional{" "}
                            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                                Music with AI
                            </span>
                        </h2>
                        <p className="mx-auto max-w-3xl text-lg leading-8 text-muted-foreground">
                            From text descriptions to full productions - generate studio-quality tracks with Suno V5. Custom lyrics, genre mixing, and audio isolation included.
                        </p>
                    </motion.div>

                    {/* Music Player Mockup */}
                    <motion.div
                        className="max-w-3xl mx-auto mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="tech-border-flow tech-scan-surface relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#090711]/85 shadow-[0_38px_120px_-55px_rgb(217_70_239)] backdrop-blur-2xl">
                            {/* Top gradient bar */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 shadow-[0_0_30px_rgb(236_72_153)]" />

                            <div className="p-6 md:p-8">
                                <div className="flex items-center gap-6">
                                    {/* Album Art Placeholder */}
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-purple-600 to-pink-500 shadow-[0_18px_60px_-24px_rgb(236_72_153)] pulse-ring md:h-24 md:w-24">
                                        <Music2 className="w-10 h-10 text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                            {summerVibesSong ? "Featured Creation" : "Now Generating"}
                                        </p>
                                        <h3 className="truncate text-lg font-black md:text-xl">
                                            {summerVibesSong
                                                ? (typeof summerVibesSong.metadata === 'string' ? JSON.parse(summerVibesSong.metadata).title : summerVibesSong.metadata?.title) || "Summer Vibes"
                                                : "Midnight Echoes"
                                            }
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {summerVibesSong
                                                ? (typeof summerVibesSong.metadata === 'string' ? JSON.parse(summerVibesSong.metadata).style : summerVibesSong.metadata?.style) || "English Pop"
                                                : "Cinematic Synthwave - Suno V5"
                                            }
                                            {summerVibesSong && " - Suno V5"}
                                        </p>

                                        {/* Waveform Equalizer */}
                                        <div className="flex items-end gap-[3px] h-8 mt-3">
                                            {Array.from({ length: 32 }).map((_, i) => {
                                                // Deterministic pseudo-random values based on index to avoid hydration mismatch
                                                const seed1 = ((i * 7 + 3) % 13) / 13;  // 0-1 range
                                                const seed2 = ((i * 11 + 5) % 17) / 17;
                                                const seed3 = ((i * 13 + 7) % 19) / 19;
                                                return (
                                                    <div
                                                        key={i}
                                                        className="waveform-bar"
                                                        style={{
                                                            '--waveform-duration': `${0.6 + seed1 * 0.8}s`,
                                                            '--waveform-delay': `${i * 0.05}s`,
                                                            '--waveform-min': `${4 + seed2 * 6}px`,
                                                            '--waveform-max': `${16 + seed3 * 16}px`,
                                                        } as React.CSSProperties}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg transition-transform hover:scale-105"
                                            onClick={() => {
                                                if (summerVibesSong?.url) {
                                                    if (!audioRef.current) {
                                                        audioRef.current = new Audio(summerVibesSong.url);
                                                        audioRef.current.onended = () => {
                                                            setIsPlaying(false);
                                                            setCurrentTime(0);
                                                        };
                                                        audioRef.current.ontimeupdate = () => {
                                                            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                                                        };
                                                        audioRef.current.onloadedmetadata = () => {
                                                            if (audioRef.current) setDuration(audioRef.current.duration);
                                                        };
                                                    }

                                                    if (isPlaying) {
                                                        audioRef.current.pause();
                                                        setIsPlaying(false);
                                                    } else {
                                                        audioRef.current.play();
                                                        setIsPlaying(true);
                                                    }
                                                }
                                            }}
                                        >
                                            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <span className="text-foreground font-medium">
                                                {summerVibesSong ? formatTime(currentTime) : "1:24"}
                                            </span> / {summerVibesSong ? (duration > 0 ? formatTime(duration) : "3:12") : "3:47"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-purple-400/25 bg-purple-400/10 text-xs text-purple-200">
                                            <Volume2 className="w-3 h-3 mr-1" /> 48kHz
                                        </Badge>
                                        <Badge variant="outline" className="border-pink-400/25 bg-pink-400/10 text-xs text-pink-200">
                                            Stereo
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Music Feature Cards Grid */}
                    <motion.div
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        {musicFeatures.map((feature, index) => (
                            <motion.div key={index} variants={fadeInUp}>
                                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-300/35 hover:bg-fuchsia-300/[0.055]">
                                    <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                    <div className="mb-5 flex items-center justify-between gap-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br ${feature.color} shadow-lg shadow-black/30 transition-transform duration-300 group-hover:scale-110`}>
                                            <feature.icon className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex h-9 items-end gap-1">
                                            {[4, 7, 11, 6, 9].map((height, barIndex) => (
                                                <span
                                                    key={barIndex}
                                                    className="w-1.5 rounded-full bg-gradient-to-t from-fuchsia-500 to-pink-300"
                                                    style={{ height: `${height * 3}px` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <h3 className="mb-2 text-lg font-black transition-colors group-hover:text-fuchsia-200">{feature.title}</h3>
                                    <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="text-center mt-12">
                        <Link href="/music-generator" target="_blank" rel="noopener noreferrer">
                            <Button size="lg" className="group border border-fuchsia-300/20 bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_18px_60px_-24px_rgb(236_72_153)] hover:from-purple-500 hover:to-pink-400">
                                <Music className="w-4 h-4 mr-2" />
                                Start Creating Music
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Glow Divider */}
            <div className="tech-line-runner" />

            {/* Tools Command Matrix */}
            <section id="tools" className="relative overflow-hidden py-28">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.2),rgba(8,12,24,0.96))]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:44px_44px]" />
                <div className="absolute left-1/2 top-24 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="container relative z-10 mx-auto px-4">
                    <motion.div className="mb-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                        <div>
                            <Badge className="mb-4 border-primary/25 bg-primary/10 text-primary">{TOOLS_COUNT_DISPLAY} Tools</Badge>
                            <h2 className="max-w-xl text-4xl font-black leading-tight md:text-6xl">
                                A command matrix for every AI workflow
                            </h2>
                        </div>
                        <div className="tech-border-flow rounded-[1.75rem] border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-muted-foreground">Workspace bus</span>
                                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">all modules online</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-4">
                                {["Write", "Build", "Create", "Automate"].map((mode, index) => (
                                    <div key={mode} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                                        <div className="mb-3 h-1.5 rounded-full bg-gradient-to-r from-primary to-ai-secondary" style={{ opacity: 0.45 + index * 0.14 }} />
                                        <p className="text-sm font-black">{mode}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div className="grid gap-5 lg:grid-cols-[280px_1fr_320px]" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }}>
                        <motion.div variants={fadeInUp} className="tech-border-flow relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#050812]/90 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                            <div className="mb-4 flex items-center gap-2 px-2">
                                <Bot className="h-5 w-5 text-primary" />
                                <span className="text-xs font-black uppercase text-muted-foreground">Module rail</span>
                            </div>
                            <div className="space-y-2">
                                {features.slice(0, 8).map((feature, index) => (
                                    <Link key={feature.title} href={feature.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl border border-transparent bg-white/[0.035] p-3 transition-all hover:border-primary/30 hover:bg-primary/10">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}>
                                            <feature.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-black">{feature.title}</p>
                                            <p className="text-[11px] uppercase text-muted-foreground">node {String(index + 1).padStart(2, "0")}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="tech-border-flow tech-scan-surface relative min-h-[580px] overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#06101a]/90 p-5 shadow-[0_44px_140px_-65px_rgb(34_211_238)] backdrop-blur-2xl">
                            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
                            <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
                            <div className="relative mb-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase text-cyan-200">Live orchestration canvas</p>
                                    <h3 className="mt-2 text-3xl font-black">Route any job through the right AI engine</h3>
                                </div>
                                <Cpu className="h-9 w-9 text-cyan-200" />
                            </div>
                            <div className="relative grid gap-4 md:grid-cols-2">
                                {features.slice(8, 14).map((feature, index) => (
                                    <Link key={feature.title} href={feature.url} target="_blank" rel="noopener noreferrer" className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-5 transition-all hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-cyan-300/[0.06] ${index === 0 || index === 5 ? "md:col-span-2" : ""}`}>
                                        <div className={`absolute inset-x-5 top-0 h-px bg-gradient-to-r ${feature.color}`} />
                                        <div className="flex items-start justify-between gap-5">
                                            <div>
                                                <p className="mb-2 text-[11px] font-black uppercase text-muted-foreground">pipeline / {String(index + 9).padStart(2, "0")}</p>
                                                <h4 className="text-xl font-black">{feature.title}</h4>
                                                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{feature.description}</p>
                                            </div>
                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg shadow-black/30`}>
                                                <feature.icon className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="mt-5 flex items-center gap-2">
                                            <span className="h-1.5 w-20 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300" />
                                            <span className="text-xs font-bold uppercase text-muted-foreground">ready</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="space-y-5">
                            <div className="tech-border-flow overflow-hidden rounded-[1.75rem] border border-fuchsia-300/20 bg-[#150719]/90 p-5 shadow-[0_34px_120px_-70px_rgb(217_70_239)] backdrop-blur-2xl">
                                <p className="text-xs font-black uppercase text-fuchsia-200">Command preview</p>
                                <div className="mt-5 rounded-2xl border border-white/10 bg-black/45 p-4 font-mono text-xs leading-6 text-slate-300">
                                    <p><span className="text-emerald-300">$</span> ting run campaign</p>
                                    <p className="text-cyan-200">routing: writer + image + social</p>
                                    <p className="text-fuchsia-200">status: production ready</p>
                                </div>
                            </div>
                            <div className="tech-border-flow overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-2xl">
                                <div className="mb-5 flex items-center justify-between">
                                    <p className="text-xs font-black uppercase text-muted-foreground">Quick launch</p>
                                    <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {features.slice(0, 6).map((feature) => (
                                        <Link key={feature.title} href={feature.url} target="_blank" rel="noopener noreferrer" className={`flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${feature.color} transition-transform hover:-translate-y-1`}>
                                            <feature.icon className="h-5 w-5 text-white" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <Link href="/dashboard" target="_blank" rel="noopener noreferrer">
                                <Button size="lg" className="w-full">
                                    Open Full Workspace
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Signal Board */}
            <section className="relative overflow-hidden py-28">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#04050b,#070b15)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <motion.div className="absolute left-[7%] top-24 h-80 w-80 rounded-full bg-amber-300/[0.08] blur-[100px]" animate={{ scale: [0.8, 1.18, 0.8], opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
                <div className="container relative z-10 mx-auto px-4">
                    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="tech-border-flow group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-2xl shadow-black/30 backdrop-blur-2xl md:p-10">
                            <motion.div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" animate={{ x: [0, -45, 0], y: [0, 55, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
                            <Badge className="mb-6 border-amber-300/20 bg-amber-300/10 text-amber-200">User Signals</Badge>
                            <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">Proof flowing through a live signal board</h2>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">Real creator feedback, usage momentum and generation volume, presented as one living data surface.</p>
                            <div className="mt-10 grid gap-4 md:grid-cols-3">
                                {["5.0 avg rating", "50K+ creators", "10M+ generations"].map((item, index) => (
                                    <motion.div key={item} whileHover={{ y: -7, rotateX: 4 }} className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-xl shadow-black/20">
                                        <div className="mb-7 flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-500">0{index + 1}</span><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgb(110_231_183)]" /></div>
                                        <p className="text-sm font-black">{item}</p>
                                        <motion.div className="mt-3 h-1.5 origin-left rounded-full bg-gradient-to-r from-amber-300 to-primary" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, delay: index * 0.16 }} />
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div className="grid gap-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
                            {testimonials.map((testimonial, index) => (
                                <motion.div key={testimonial.author} variants={fadeInUp} whileHover={{ x: -8, scale: 1.015 }} className="tech-border-flow relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/45 p-5 backdrop-blur-2xl transition-colors hover:border-primary/35">
                                    <motion.div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary to-transparent" animate={{ y: ["-100%", "100%"] }} transition={{ duration: 3.4 + index, repeat: Infinity, ease: "linear" }} />
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary to-ai-secondary font-black text-white shadow-lg shadow-primary/20">{testimonial.avatar}</div><div><p className="font-black">{testimonial.author}</p><p className="text-xs text-muted-foreground">{testimonial.role}</p></div></div>
                                        <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-300 text-amber-300" />)}</div>
                                    </div>
                                    <p className="leading-7 text-slate-300">"{testimonial.quote}"</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Pricing OS */}
            <section id="pricing" className="relative overflow-hidden border-y border-white/10 bg-black py-28">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.16),transparent_42%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:9%_100%]" />
                <div className="container relative z-10 mx-auto px-4">
                    <motion.div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                        <div><Badge className="mb-4 border-primary/25 bg-primary/10 text-primary">Pricing OS</Badge><h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">Choose your workspace deployment</h2></div>
                        <p className="max-w-md text-lg leading-8 text-muted-foreground">Start free, then scale tokens and access as your workflow grows.</p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="tech-border-flow overflow-hidden rounded-[2rem] border border-white/10 bg-[#050812]/90 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                        <div className="grid border-b border-white/10 bg-white/[0.035] px-5 py-4 text-xs font-black uppercase text-muted-foreground md:grid-cols-[1fr_0.8fr_1.3fr_auto]">
                            <span>Plan</span><span className="hidden md:block">Cost</span><span className="hidden md:block">Included stack</span><span className="hidden md:block">Action</span>
                        </div>
                        {(plans.length > 0 ? plans : pricingPlans).map((plan, index) => {
                            const isEnterprise = plan.name.toLowerCase().includes('enterprise');
                            const displayPrice = typeof plan.price === 'number'
                                ? (plan.price === 0 && isEnterprise ? "Custom" : new Intl.NumberFormat('en-US', { style: 'currency', currency: settings?.metadata?.platformCurrency || 'USD', maximumFractionDigits: 0 }).format(plan.price))
                                : plan.price;

                            const displayPeriod = plan.period || (plan.price === 0 && plan.name.toLowerCase().includes('free') ? 'forever' : (plan.interval ? `/${plan.interval}` : ''));

                            return (
                                <motion.div key={index} variants={fadeInUp} whileHover={{ backgroundColor: "rgba(139,92,246,0.09)" }} className={`group relative grid gap-5 border-b border-white/10 p-5 last:border-b-0 md:grid-cols-[1fr_0.8fr_1.3fr_auto] md:items-center ${plan.popular ? "bg-primary/[0.055]" : "bg-transparent"}`}>
                                    {plan.popular && <motion.div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-300 via-primary to-fuchsia-400" animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.2, repeat: Infinity }} />}
                                    <div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 font-mono text-xs font-black text-primary">0{index + 1}</div><div><div className="flex items-center gap-2"><h3 className="text-xl font-black">{plan.name}</h3>{plan.popular && <Badge className="bg-primary/15 text-primary">Popular</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{plan.description}</p></div></div>
                                    <div><span className="text-3xl font-black">{displayPrice}</span><span className="ml-1 text-sm text-muted-foreground">{displayPeriod}</span></div>
                                    <div className="flex flex-wrap gap-2">{plan.features.slice(0, 4).map((feature: string, i: number) => <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"><Check className="h-3 w-3 text-emerald-300" />{feature}</span>)}</div>
                                    <Link href="/register" target="_blank" rel="noopener noreferrer"><Button className="w-full whitespace-nowrap md:w-auto" variant={plan.popular ? "default" : "outline"}>{plan.cta || (isEnterprise ? "Contact Sales" : "Deploy plan")}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Button></Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* Launch Console */}
            <section className="relative overflow-hidden py-28">
                <motion.div className="absolute inset-x-[15%] bottom-0 h-80 rounded-full bg-primary/15 blur-[120px]" animate={{ scaleX: [0.75, 1.15, 0.75], opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
                <div className="container relative z-10 mx-auto px-4">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="tech-border-flow relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#070910]/90 shadow-[0_54px_180px_-70px_hsl(var(--primary))] backdrop-blur-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 bg-black/35 px-5 py-3"><div className="flex gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div><span className="font-mono text-[10px] font-bold uppercase text-slate-500">ting://launch-workspace</span><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgb(110_231_183)]" /></div>
                        <div className="grid gap-8 p-7 md:p-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
                            <div><Badge className="mb-5 border-cyan-300/20 bg-cyan-300/10 text-cyan-200">Ready to launch</Badge><h2 className="text-4xl font-black leading-tight md:text-6xl">Turn the whole AI stack on.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">Join 50,000+ creators using {settings?.metadata?.siteName || "TingAi"} to move from first idea to finished work in one connected environment.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/register" target="_blank" rel="noopener noreferrer"><Button size="xl" className="group w-full shadow-xl shadow-primary/25 sm:w-auto">Start free<Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12 group-hover:scale-110" /></Button></Link><Link href="/dashboard" target="_blank" rel="noopener noreferrer"><Button size="xl" variant="outline" className="w-full border-white/15 bg-white/[0.04] sm:w-auto">Explore workspace<ArrowRight className="h-5 w-5" /></Button></Link></div></div>
                            <div className="relative mx-auto aspect-square w-full max-w-[330px]">
                                <motion.div className="absolute inset-[12%] rounded-full border border-primary/35" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}><span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_22px_rgb(103_232_249)]" /></motion.div>
                                <motion.div className="absolute inset-[25%] rounded-[2rem] border border-fuchsia-300/30 bg-gradient-to-br from-primary/20 to-fuchsia-400/10 shadow-2xl shadow-primary/25 backdrop-blur-xl" animate={{ rotate: [0, 8, -6, 0], y: [0, -12, 7, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
                                <div className="absolute inset-0 flex items-center justify-center"><div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/20 bg-black/60 shadow-[0_0_65px_hsl(var(--primary)/0.55)]"><Sparkles className="h-11 w-11 text-white" /></div></div>
                            </div>
                        </div>
                        <div className="grid border-t border-white/10 bg-white/[0.025] sm:grid-cols-2 lg:grid-cols-4">{["100+ modules", "Realtime routing", "Secure workspace", "Global access"].map((item, index) => <div key={item} className="flex items-center gap-3 border-b border-white/10 p-4 last:border-b-0 sm:border-r lg:border-b-0"><motion.span className="h-2 w-2 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, delay: index * 0.3, repeat: Infinity }} /><span className="text-xs font-black uppercase text-slate-400">{item}</span></div>)}</div>
                    </motion.div>
                </div>
            </section>

            {/* Footer Dock */}
            <footer className="relative overflow-hidden bg-black pb-8 pt-8">
                <div className="container relative z-10 mx-auto px-4">
                    <div className="tech-border-flow overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
                    <div className="grid gap-8 p-7 md:grid-cols-[1.5fr_1fr_1fr] md:p-10">
                        <div><Link href="/" className="inline-flex"><BrandLogo imageClassName="h-9 max-w-[142px]" /></Link><p className="mt-5 max-w-md leading-7 text-muted-foreground">{settings?.metadata?.siteDescription || "The complete AI toolkit for modern creators and professionals. Built with cutting-edge technology."}</p><div className="mt-5 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgb(110_231_183)]" /><span className="text-xs font-black uppercase text-slate-500">All systems operational</span></div></div>
                        <div><h4 className="mb-4 text-xs font-black uppercase text-slate-500">Product nodes</h4><div className="flex flex-wrap gap-2">{[["Features", "#features"], ["Marketing", "#ai-marketing"], ["Music", "#music-generation"], ["Pricing", "#pricing"], ["Tools", "#tools"]].map(([label, href]) => <a key={label} href={href} className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-white">{label}</a>)}</div></div>
                        <div><h4 className="mb-4 text-xs font-black uppercase text-slate-500">Protocol</h4><div className="space-y-2">{["Privacy Policy", "Terms of Service", "Cookie Policy"].map(item => <a key={item} href="#" className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"><span>{item}</span><ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" /></a>)}</div></div>
                    </div>
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 px-7 py-5 md:flex-row">
                        <p className="text-sm text-muted-foreground">
                            © 2026 {settings?.metadata?.siteName || "TingAi"}. All rights reserved.
                        </p>

                        <div className="flex gap-6">
                            {settings?.metadata?.social && Object.entries(settings.metadata.social).map(([platform, url]) => {
                                if (!url) return null;
                                return (
                                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors capitalize">
                                        {platform}
                                    </a>
                                );
                            })}
                            {(!settings?.metadata?.social || Object.values(settings.metadata.social).every(url => !url)) && (
                                <>
                                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                        Twitter
                                    </a>
                                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                        GitHub
                                    </a>
                                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                        Discord
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            </footer>

            {/* Video Modal */}
            <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
            
            {/* Customization Request Bubble */}
            <AnimatePresence>
                {showCustomBubble && (
                    !isBubbleMinimized ? (
                        <motion.div
                            key="expanded-bubble"
                            initial={{ opacity: 0, x: -100, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -100, y: 100, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 260, damping: 25 }}
                            className="fixed bottom-6 left-6 z-50 max-w-sm w-[90%] sm:w-[350px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden backdrop-blur-xl"
                        >
                            {/* Close button */}
                            <button
                                onClick={() => {
                                    setIsBubbleMinimized(true);
                                    sessionStorage.setItem("custom-requirement-minimized", "true");
                                }}
                                className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors text-foreground"
                                aria-label="Minimize notification"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>

                            {/* Top Gradient Banner */}
                            <div className="relative p-6 text-white bg-gradient-to-br from-primary via-ai-secondary to-ai-tertiary overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                                
                                <div className="relative z-10 space-y-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                                        <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                        Bespoke AI
                                    </span>
                                    <h3 className="text-xl font-bold tracking-tight">Custom Development</h3>
                                    <p className="text-xs text-white/80">Tailored solutions for your business</p>
                                </div>
                            </div>

                            {/* Bottom Content */}
                            <div className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <h4 className="font-bold text-foreground text-sm">Need Tailored AI Features?</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Our core team can build custom models, autonomous agents, and integrations specific to your needs.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <Link href="/custom-requirement" target="_blank" className="w-full">
                                        <Button size="sm" className="w-full btn-premium py-4 text-xs font-bold shadow-md flex items-center justify-center gap-1.5">
                                            <span>Request Customization</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <Link href="/custom-requirement" target="_blank" key="minimized-bubble">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 50 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="fixed bottom-6 left-6 z-50 p-4 rounded-full bg-gradient-to-r from-primary to-ai-secondary text-white shadow-2xl border border-white/20 cursor-pointer flex items-center justify-center hover:shadow-glow transition-all"
                                title="Request Customization"
                            >
                                <Sparkles className="w-6 h-6 animate-pulse text-white" />
                            </motion.div>
                        </Link>
                    )
                )}
            </AnimatePresence>

            <ChatWidget />
        </div>
    );
}
