"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { 
    Megaphone, 
    Image as ImageIcon, 
    Video, 
    UserCircle, 
    ArrowRight, 
    Sparkles, 
    Zap, 
    TrendingUp,
    LayoutDashboard,
    Plus,
    History,
    Palette,
    ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingAssetCard } from "@/components/marketing/MarketingAssetCard";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import Link from "next/link";
import { toast } from "sonner";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

export default function MarketingDashboard() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentAssets();
        }
    }, [isAuthenticated]);

    if (authLoading || !isAuthenticated) {
        return null;
    }

    const fetchRecentAssets = async () => {
        try {
            const res = await fetch('/api/marketing?action=list-assets');
            const data = await res.json();
            if (Array.isArray(data)) {
                const visualAssets = data.filter((a: any) => a.type === 'image' || a.type === 'video');
                setAssets(visualAssets.slice(0, 8));
            } else {
                console.error("API returned non-array data:", data);
                setAssets([]);
            }
        } catch (error) {
            console.error("Failed to load recent assets", error);
            setAssets([]);
            toast.error("Failed to load recent assets");
        } finally {
            setLoading(false);
        }
    };

    const marketingTools = [
        {
            id: "image-gen",
            title: "Text-to-Image",
            description: "Create high-quality marketing visuals from simple text prompts.",
            icon: ImageIcon,
            url: "/ai-marketing/image-generator",
            color: "from-purple-500 to-indigo-600",
            badge: "Pro"
        },
        {
            id: "video-gen",
            title: "Product Video",
            description: "Transform product images into cinematic marketing videos.",
            icon: Video,
            url: "/ai-marketing/video-generator",
            color: "from-pink-500 to-rose-600",
            badge: "New"
        },
        {
            id: "avatar-studio",
            title: "Avatar Studio",
            description: "Generate and manage AI avatars for your marketing campaigns.",
            icon: UserCircle,
            url: "/ai-marketing/avatar-studio",
            color: "from-cyan-500 to-blue-600",
            badge: "Creative"
        },
        {
            id: "flyer-designer",
            title: "Flyer Designer",
            description: "Design high-converting business and event flyers using AI.",
            icon: ImageIcon,
            url: "/ai-marketing/flyer-designer",
            color: "from-violet-600 to-indigo-700",
            badge: "New"
        },
        {
            id: "business-card-designer",
            title: "Business Card Designer",
            description: "Create premium professional business card mockups in seconds.",
            icon: Palette,
            url: "/ai-marketing/business-card-designer",
            color: "from-amber-500 to-orange-600",
            badge: "Creative"
        },
        {
            id: "brochure-designer",
            title: "Brochure Designer",
            description: "Draft gorgeous multi-panel brochure layout designs with AI.",
            icon: ScrollText,
            url: "/ai-marketing/brochure-designer",
            color: "from-teal-500 to-emerald-600",
            badge: "Pro"
        }
    ];

    return (
        <Layout>
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-10 max-w-[1400px] mx-auto"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                                <Megaphone className="w-6 h-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight outfit">AI Marketing Studio</h1>
                        </div>
                        <p className="text-muted-foreground text-lg">
                            Supercharge your brand with professional AI-generated assets.
                        </p>
                    </div>
                    <Link href="/ai-marketing/image-generator">
                        <Button size="lg" className="btn-premium gap-2 group shadow-lg shadow-primary/25">
                            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span>New Campaign</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </motion.div>

                {/* Main Tools Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketingTools.map((tool) => (
                        <Link key={tool.id} href={tool.url} className="group">
                            <Card className="premium-card h-full hover:border-primary/50 transition-colors">
                                <CardContent className="p-8 space-y-6">
                                    <div className={`p-4 rounded-2xl w-fit bg-gradient-to-br ${tool.color} shadow-lg group-hover:scale-110 transition-transform`}>
                                        <tool.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold outfit">{tool.title}</h3>
                                            <span className="badge-premium">{tool.badge}</span>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {tool.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center text-primary font-semibold gap-2 group-hover:translate-x-2 transition-transform">
                                        Launch Studio <ArrowRight className="w-4 h-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </motion.div>

                {/* Quick Stats / Info */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">120%</p>
                            <p className="text-xs text-muted-foreground">Ad ROI Increase</p>
                        </div>
                    </Card>
                    <Card className="glass-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">10x</p>
                            <p className="text-xs text-muted-foreground">Faster Production</p>
                        </div>
                    </Card>
                    <Card className="glass-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">85%</p>
                            <p className="text-xs text-muted-foreground">Creative Efficiency</p>
                        </div>
                    </Card>
                    <Card className="glass-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">24/7</p>
                            <p className="text-xs text-muted-foreground">Always Generating</p>
                        </div>
                    </Card>
                </motion.div>

                {/* Recent Assets Section */}
                <motion.div variants={itemVariants} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            <h2 className="text-2xl font-bold outfit">Recent Assets</h2>
                        </div>
                        <Button variant="ghost" className="gap-2">
                            View All Gallery <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square rounded-2xl skeleton" />
                            ))}
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="premium-card p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold">No assets yet</h3>
                            <p className="text-muted-foreground">Start generating your first marketing assets to see them here.</p>
                            <Button className="btn-premium" asChild>
                                <Link href="/ai-marketing/image-generator">Create New Asset</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {assets?.map((asset: any, index: number) => (
                                <MarketingAssetCard 
                                    key={asset.id} 
                                    asset={asset} 
                                    onClick={() => {
                                        setViewerIndex(index);
                                        setViewerOpen(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>

                <AssetViewer 
                    open={viewerOpen} 
                    close={() => setViewerOpen(false)} 
                    assets={assets} 
                    currentIndex={viewerIndex} 
                />
            </motion.div>
        </Layout>
    );
}
