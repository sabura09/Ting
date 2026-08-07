"use client";

import { motion } from "framer-motion";
import { Download, Play, Image as ImageIcon, Trash2, Share2, Copy, Eye, Music2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { downloadAsset } from "@/lib/utils";

interface MarketingAsset {
    id: string;
    type: 'image' | 'video' | 'avatar' | 'text' | 'music';
    url?: string;
    content?: string;
    prompt?: string;
    metadata?: any;
    created_at: string;
}

interface MarketingAssetCardProps {
    asset: MarketingAsset;
    onDelete?: (id: string) => void;
    onClick?: () => void;
}

export function MarketingAssetCard({ asset, onDelete, onClick }: MarketingAssetCardProps) {
    const isVideo = asset.type === 'video';
    const isMusic = asset.type === 'music';

    // Parse metadata for music assets
    let meta = asset.metadata;
    if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
    }
    
    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!asset.url) return;
        const ext = isVideo ? 'mp4' : isMusic ? 'mp3' : 'png';
        const filename = `marketing-${asset.type}-${asset.id.slice(0, 8)}.${ext}`;
        const success = await downloadAsset(asset.url, filename);
        if (success) {
            toast.success("Download started");
        }
    };

    const handleCopyUrl = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!asset.url) return;
        navigator.clipboard.writeText(asset.url);
        toast.success("Link copied to clipboard");
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) onDelete(asset.id);
    };

    // Gradient palettes for music cards based on hash of id
    const musicGradients = [
        'from-purple-600 via-violet-500 to-indigo-600',
        'from-rose-500 via-pink-500 to-fuchsia-600',
        'from-cyan-500 via-blue-500 to-indigo-500',
        'from-amber-500 via-orange-500 to-red-500',
        'from-emerald-500 via-teal-500 to-cyan-500',
        'from-violet-600 via-purple-500 to-pink-500',
    ];
    const gradientIndex = asset.id ? asset.id.charCodeAt(asset.id.length - 1) % musicGradients.length : 0;
    const musicGradient = musicGradients[gradientIndex];

    // Badge icon & label
    const getBadgeContent = () => {
        if (isMusic) return { icon: <Headphones className="w-3 h-3 mr-1" />, label: 'MUSIC' };
        if (isVideo) return { icon: <Play className="w-3 h-3 mr-1" />, label: 'VIDEO' };
        return { icon: <ImageIcon className="w-3 h-3 mr-1" />, label: asset.type.toUpperCase() };
    };
    const badge = getBadgeContent();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover="hover"
            className="premium-card cursor-pointer"
            onClick={onClick}
        >
            <div className="aspect-square relative overflow-hidden bg-muted">
                {isMusic ? (
                    /* Music-specific visual card */
                    <div className={`w-full h-full bg-gradient-to-br ${musicGradient} flex flex-col items-center justify-center relative`}>
                        {/* Decorative circles */}
                        <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute bottom-8 left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />

                        {/* Vinyl disc */}
                        <motion.div 
                            variants={{ hover: { rotate: 360 } }}
                            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                            className="relative mb-4"
                        >
                            <div className="w-20 h-20 rounded-full bg-black/30 backdrop-blur-md border-2 border-white/20 flex items-center justify-center shadow-2xl">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Music2 className="w-4 h-4 text-white" />
                                </div>
                                {/* Ring marks */}
                                <div className="absolute inset-3 rounded-full border border-white/10" />
                                <div className="absolute inset-5 rounded-full border border-white/5" />
                            </div>
                        </motion.div>

                        {/* Song title & style */}
                        <p className="text-white font-bold text-sm text-center px-4 truncate max-w-full drop-shadow-lg">
                            {meta?.title || 'Untitled Track'}
                        </p>
                        <p className="text-white/70 text-[10px] uppercase tracking-widest mt-1">
                            {meta?.style || 'Original'}
                        </p>

                        {/* Waveform bars */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-[2px] h-6">
                            {Array.from({ length: 24 }).map((_, i) => {
                                const height = 20 + Math.sin(i * 0.8) * 40 + Math.cos(i * 1.3) * 30;
                                return (
                                    <motion.div
                                        key={i}
                                        variants={{ hover: { backgroundColor: "rgba(255,255,255,0.5)" } }}
                                        className="flex-1 bg-white/30 rounded-t-sm"
                                        style={{ height: `${Math.max(15, Math.min(95, height))}%` }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : isVideo ? (
                    <video
                        src={asset.url}
                        className="w-full h-full object-cover pointer-events-none"
                        controls={false}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <motion.img
                        variants={{ hover: { scale: 1.1 } }}
                        transition={{ duration: 0.5 }}
                        src={asset.url || "/placeholder.png"}
                        alt={asset.prompt || "Marketing Asset"}
                        className="w-full h-full object-cover"
                    />
                )}
                
                {/* Overlays */}
                <motion.div 
                    variants={{ hover: { opacity: 1 } }}
                    initial={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 z-50"
                >
                    <Button size="icon" variant="secondary" onClick={onClick} className="rounded-full bg-primary text-white hover:bg-primary/90 pointer-events-auto">
                        {isMusic ? <Play className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="secondary" onClick={handleDownload} className="rounded-full pointer-events-auto">
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="secondary" onClick={handleCopyUrl} className="rounded-full pointer-events-auto">
                        <Share2 className="w-4 h-4" />
                    </Button>
                    {onDelete && (
                        <Button size="icon" variant="destructive" onClick={handleDelete} className="rounded-full pointer-events-auto">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </motion.div>

                {/* Type Badge */}
                <div className="absolute top-2 left-2 z-50">
                    <span className="badge-premium">
                        {badge.icon}
                        {badge.label}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
                    "{asset.prompt || "No prompt provided"}"
                </p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
