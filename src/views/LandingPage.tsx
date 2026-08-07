"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
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
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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
            description: "Blend multiple genres seamlessly — from lo-fi jazz to cinematic synthwave and beyond.",
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
            description: "Download your tracks in high-quality 48kHz stereo — ready for streaming and production.",
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
            quote: `${settings?.metadata?.siteName || "This Ai suite"} has completely transformed how I create content. What used to take hours now takes minutes.`,

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

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const { scrollY } = useScroll();
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
        const scrollContainer = document.getElementById("main-scroll-container");
        const handleScroll = () => {
            const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
            setScrolled(scrollTop > 20);
        };
        const target = scrollContainer || window;
        target.addEventListener("scroll", handleScroll);
        return () => target.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

                {/* Gradient orbs */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/20 to-transparent blur-3xl opacity-50" />
                <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-radial from-ai-secondary/15 to-transparent blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-ai-tertiary/10 to-transparent blur-3xl opacity-40" />
            </div>

            {/* Header */}
            <motion.header
                className={`fixed left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl ${scrolled
                    ? "bg-background/80 border-b border-border/50 py-3"
                    : "bg-background/60 py-5"
                    }`}
                style={{ top: "var(--banner-height, 0px)" }}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg group-hover:bg-primary/40 transition-all" />
                            <div className="relative p-2 bg-gradient-to-br from-primary to-ai-secondary rounded-xl overflow-hidden w-9 h-9 flex items-center justify-center">
                                {settings?.metadata?.logoUrl ? (
                                    <img src={settings.metadata.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-white" />
                                )}
                            </div>
                        </div>
                        <span className="text-xl font-bold gradient-text-primary">{settings?.metadata?.siteName || "AI Suite"}</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </a>
                        <a href="#ai-marketing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            AI Marketing
                        </a>
                        <a href="#music-generation" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Music
                        </a>
                        <a href="#tools" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Tools
                        </a>
                        <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </a>
                        <div className="h-4 w-px bg-border" />
                        <ThemeToggle />
                        <div className="flex items-center gap-3">
                            {settings?.showDemoMode !== false && (
                                <Link href="https://mounikai.com/product/a9921866-35a4-41d0-a137-23483d06e0b7" target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                                        Buy Now
                                    </Button>
                                </Link>
                            )}
                            <Link href="/login" target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm">Log in</Button>
                            </Link>
                            <Link href="/register" target="_blank" rel="noopener noreferrer">
                                <Button size="sm">Get Started Free</Button>
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
                            className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden"
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
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
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
            <section className="py-12 border-y border-border/50 bg-muted/30 overflow-hidden">
                <div className="container mx-auto px-4 mb-8">
                    <p className="text-center text-sm text-muted-foreground">
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
                                <span key={`comp1-${index}`} className="text-xl md:text-2xl font-bold opacity-50 hover:opacity-100 transition-opacity duration-300 select-none">
                                    {company}
                                </span>
                            ))}
                        </div>
                        {/* Second group (duplicate) */}
                        <div className="flex shrink-0 justify-around items-center gap-12 md:gap-24 min-w-full px-4">
                            {["Google", "Microsoft", "Amazon", "Meta", "Netflix", "Spotify", "Apple", "Tesla", "NVIDIA", "OpenAI"].map((company, index) => (
                                <span key={`comp2-${index}`} className="text-xl md:text-2xl font-bold opacity-50 hover:opacity-100 transition-opacity duration-300 select-none">
                                    {company}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-4">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4">Features</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Everything You Need to Create
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Powerful AI tools designed to supercharge your productivity and creativity.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Zap,
                                title: "Lightning Fast",
                                description: "Powered by the latest AI models for sub-second response times.",
                            },
                            {
                                icon: Shield,
                                title: "Enterprise Secure",
                                description: "Your data is encrypted end-to-end and never used for training.",
                            },
                            {
                                icon: Rocket,
                                title: "Production Ready",
                                description: "Export clean, semantic outputs ready for immediate use.",
                            },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card variant="interactive" className="h-full">
                                    <CardContent className="p-8">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-ai-secondary/20 flex items-center justify-center mb-6">
                                            <feature.icon className="w-7 h-7 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                        <p className="text-muted-foreground">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Glow Divider */}
            <div className="section-divider-glow" />

            {/* AI Marketing Showcase Section */}
            <section id="ai-marketing" className="py-24 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 gradient-mesh-bg" />
                <div className="landing-glow-orb w-[400px] h-[400px] bg-blue-500/20 top-20 -left-40" />
                <div className="landing-glow-orb w-[350px] h-[350px] bg-cyan-500/15 bottom-20 right-0" style={{ animationDelay: '3s' }} />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 border-0 text-white">
                            <Megaphone className="w-3 h-3 mr-1" /> AI Marketing
                        </Badge>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5">
                            Supercharge Your{" "}
                            <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                                Marketing with AI
                            </span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                            From social media to SEO, email campaigns to ad copy — automate and elevate your entire marketing stack with AI-powered tools.
                        </p>
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Feature Cards Grid */}
                        <motion.div
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                        >
                            {aiMarketingFeatures.map((feature, index) => (
                                <motion.div key={index} variants={fadeInUp}>
                                    <Card variant="interactive" className="h-full card-shine group">
                                        <CardContent className="p-5">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                                <feature.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-base font-bold mb-1.5 group-hover:text-primary transition-colors">{feature.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Marketing Dashboard Mockup */}
                        <motion.div
                            className="relative"
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="relative rounded-2xl border bg-card/80 backdrop-blur-xl p-6 shadow-2xl overflow-hidden">
                                {/* Dashboard Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-lg">Marketing Dashboard</h3>
                                        <p className="text-xs text-muted-foreground">Real-time campaign analytics</p>
                                    </div>
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">● Live</Badge>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {[
                                        { label: "Engagement", value: "84.2%", change: "+12.5%", color: "text-green-500" },
                                        { label: "CTR", value: "6.8%", change: "+3.2%", color: "text-blue-500" },
                                        { label: "Conversions", value: "2,847", change: "+18.7%", color: "text-violet-500" },
                                    ].map((stat, i) => (
                                        <div key={i} className="marketing-metric-card text-center" style={{ animationDelay: `${i * 0.8}s` }}>
                                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                                            <p className="text-xl font-bold">{stat.value}</p>
                                            <p className={`text-xs font-medium ${stat.color}`}>{stat.change}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Fake Chart Area */}
                                <div className="h-32 rounded-xl bg-gradient-to-r from-blue-500/5 via-cyan-500/10 to-teal-500/5 border border-border/50 flex items-end justify-between px-4 pb-4 gap-1.5">
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
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
                            </div>

                            {/* Floating Metric Cards */}
                            <motion.div
                                className="absolute -top-4 -right-4 marketing-metric-card z-20"
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
                                className="absolute -bottom-4 -left-4 marketing-metric-card z-20"
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
                            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 shadow-lg group">
                                Explore AI Marketing
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Glow Divider */}
            <div className="section-divider-glow" />

            {/* Music Generation Showcase Section */}
            <section id="music-generation" className="py-24 relative overflow-hidden bg-muted/20">
                {/* Background Effects */}
                <div className="absolute inset-0 gradient-mesh-bg" />
                <div className="landing-glow-orb w-[500px] h-[500px] bg-purple-500/15 top-0 right-1/4" />
                <div className="landing-glow-orb w-[400px] h-[400px] bg-pink-500/10 bottom-0 left-10" style={{ animationDelay: '2s' }} />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 border-0 text-white">
                            <Music className="w-3 h-3 mr-1" /> AI Music Studio
                        </Badge>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5">
                            Create Professional{" "}
                            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                                Music with AI
                            </span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                            From text descriptions to full productions — generate studio-quality tracks with Suno V5. Custom lyrics, genre mixing, and audio isolation included.
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
                        <div className="relative rounded-2xl border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                            {/* Top gradient bar */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

                            <div className="p-6 md:p-8">
                                <div className="flex items-center gap-6">
                                    {/* Album Art Placeholder */}
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-xl shrink-0 pulse-ring">
                                        <Music2 className="w-10 h-10 text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                            {summerVibesSong ? "Featured Creation" : "Now Generating"}
                                        </p>
                                        <h3 className="text-lg md:text-xl font-bold truncate">
                                            {summerVibesSong
                                                ? (typeof summerVibesSong.metadata === 'string' ? JSON.parse(summerVibesSong.metadata).title : summerVibesSong.metadata?.title) || "Summer Vibes"
                                                : "Midnight Echoes"
                                            }
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {summerVibesSong
                                                ? (typeof summerVibesSong.metadata === 'string' ? JSON.parse(summerVibesSong.metadata).style : summerVibesSong.metadata?.style) || "English Pop"
                                                : "Cinematic Synthwave • Suno V5"
                                            }
                                            {summerVibesSong && " • Suno V5"}
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

                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
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
                                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-400">
                                            <Volume2 className="w-3 h-3 mr-1" /> 48kHz
                                        </Badge>
                                        <Badge variant="outline" className="text-xs border-pink-200 text-pink-600 bg-pink-50 dark:bg-pink-500/10 dark:border-pink-500/30 dark:text-pink-400">
                                            Stereo
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Music Feature Cards Grid */}
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        {musicFeatures.map((feature, index) => (
                            <motion.div key={index} variants={fadeInUp}>
                                <Card variant="interactive" className="h-full card-shine group">
                                    <CardContent className="p-6">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="text-center mt-12">
                        <Link href="/music-generator" target="_blank" rel="noopener noreferrer">
                            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white border-0 shadow-lg group">
                                <Music className="w-4 h-4 mr-2" />
                                Start Creating Music
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Glow Divider */}
            <div className="section-divider-glow" />

            {/* Tools Grid Section */}
            <section id="tools" className="py-24 bg-muted/30 relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4">{TOOLS_COUNT_DISPLAY} Tools</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            A Tool for Every Task
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Replace your fragmented subscription stack with one powerful suite.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        {features.map((feature, index) => (
                            <motion.div key={index} variants={fadeInUp}>
                                <Link href={feature.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                                    <Card variant="interactive" className="h-full group">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                                    <feature.icon className="w-6 h-6 text-white" />
                                                </div>
                                                {feature.isNew && (
                                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0">
                                                        New
                                                    </Badge>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="text-center mt-12">
                        <Link href="/dashboard" target="_blank" rel="noopener noreferrer">
                            <Button size="lg" variant="outline">
                                View All {TOOLS_COUNT_DISPLAY} Tools
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4">Testimonials</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Loved by Creators Worldwide
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card variant="glass" className="h-full">
                                    <CardContent className="p-8">
                                        <div className="flex gap-1 mb-4">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                            ))}
                                        </div>
                                        <p className="text-lg mb-6 leading-relaxed">"{testimonial.quote}"</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-ai-secondary flex items-center justify-center text-white font-bold">
                                                {testimonial.avatar}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{testimonial.author}</p>
                                                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <Badge className="mb-4">Pricing</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Start free and scale as you grow. No hidden fees.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {(plans.length > 0 ? plans : pricingPlans).map((plan, index) => {
                            const isEnterprise = plan.name.toLowerCase().includes('enterprise');
                            const displayPrice = typeof plan.price === 'number'
                                ? (plan.price === 0 && isEnterprise ? "Custom" : new Intl.NumberFormat('en-US', { style: 'currency', currency: settings?.metadata?.platformCurrency || 'USD', maximumFractionDigits: 0 }).format(plan.price))
                                : plan.price;

                            const displayPeriod = plan.period || (plan.price === 0 && plan.name.toLowerCase().includes('free') ? 'forever' : (plan.interval ? `/${plan.interval}` : ''));

                            return (
                                <motion.div
                                    key={index}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true }}
                                    variants={fadeInUp}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card
                                        variant={plan.popular ? "pricing" : "default"}
                                        className={`h-full relative ${plan.popular ? "border-primary shadow-glow ring-2 ring-primary ring-offset-2" : ""
                                            }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                                                <Badge className="bg-primary hover:bg-primary/90 border-0 shadow-xl text-white px-4 py-1 uppercase text-[10px] font-bold tracking-wider">
                                                    Most Popular
                                                </Badge>
                                            </div>
                                        )}
                                        <CardContent className="p-8">
                                            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1 mb-2">
                                                <span className="text-4xl font-bold">{displayPrice}</span>
                                                <span className="text-muted-foreground">{displayPeriod}</span>
                                            </div>
                                            <p className="text-muted-foreground mb-6">{plan.description}</p>
                                            <ul className="space-y-3 mb-8">
                                                {plan.features.map((feature: string, i: number) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <Check className="w-5 h-5 text-green-500" />
                                                        <span className="text-sm">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Link href="/register" target="_blank" rel="noopener noreferrer">
                                                <Button
                                                    className="w-full"
                                                    variant={plan.popular ? "default" : "outline"}
                                                >
                                                    {plan.cta || (isEnterprise ? "Contact Sales" : "Get Started")}
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary via-ai-secondary to-ai-tertiary rounded-3xl p-12 md:p-16 text-white shadow-2xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        <div className="relative z-10 text-center space-y-6">
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Ready to Transform Your Workflow?
                            </h2>
                            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                                Join 50,000+ creators and professionals using {settings?.metadata?.siteName || "AI Suite"} to work smarter.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <Link href="/register" target="_blank" rel="noopener noreferrer">
                                    <Button size="xl" variant="white">
                                        Get Started for Free
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </Link>
                                <Link href="/dashboard" target="_blank" rel="noopener noreferrer">
                                    <Button size="xl" variant="glass" className="border-white/30 text-white hover:bg-white/20">
                                        Explore Dashboard
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/40 bg-background pt-16 pb-8">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-primary to-ai-secondary rounded-xl overflow-hidden w-9 h-9 flex items-center justify-center">
                                    {settings?.metadata?.logoUrl ? (
                                        <img src={settings.metadata.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Sparkles className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <span className="text-xl font-bold">{settings?.metadata?.siteName || "AI Suite"}</span>
                            </Link>
                            <p className="text-muted-foreground max-w-sm">
                                {settings?.metadata?.siteDescription || "The complete AI toolkit for modern creators and professionals. Built with cutting-edge technology."}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                100+ AI Tools
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                                <li><a href="#ai-marketing" className="hover:text-foreground transition-colors">AI Marketing</a></li>
                                <li><a href="#music-generation" className="hover:text-foreground transition-colors">Music Studio</a></li>
                                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            © 2026 {settings?.metadata?.siteName || "AI Suite"}. All rights reserved.
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
