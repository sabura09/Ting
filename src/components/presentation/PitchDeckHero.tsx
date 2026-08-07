"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Presentation, SendHorizontal, Image as ImageIcon, Wand2, X, Sparkles, TrendingUp, DollarSign, Rocket, Briefcase, Clock, Trash2, Loader2, ArrowUpRight, Play } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const pitchDeckSuggestions = [
    {
        label: 'Fintech Seed Pitch Deck',
        prompt: 'Create a 8-slide seed pitch deck for a fintech startup raising $2M. Include problem, market size, product demo, business model, traction, team, and ask.',
        icon: DollarSign,
    },
    {
        label: 'TechStartup Landing & Deck',
        prompt: 'Create a modern TechStartup presentation deck showcasing our AI web builder platform, interactive playground, pricing tiers, and growth metrics.',
        icon: Rocket,
    },
    {
        label: 'B2B SaaS Series A Deck',
        prompt: 'Structure a 10-slide pitch deck for a B2B SaaS tool with $50K MRR, highlighting enterprise security, ARR growth, competitive matrix, and expansion roadmap.',
        icon: TrendingUp,
    },
    {
        label: 'Product Launch Showcase',
        prompt: 'Create a product launch presentation highlighting main features, customer testimonials, competitive advantages, and launch pricing.',
        icon: Briefcase,
    },
];

const floatingIcons = [
    { emoji: '📊', top: '8%', left: '8%', size: 'text-4xl', delay: 0 },
    { emoji: '🎨', bottom: '22%', left: '6%', size: 'text-5xl', delay: 0.3 },
    { emoji: '💡', top: '14%', right: '10%', size: 'text-3xl', delay: 0.5 },
    { emoji: '🚀', bottom: '18%', right: '7%', size: 'text-5xl', delay: 0.7 },
    { emoji: '⭐', bottom: '35%', left: '12%', size: 'text-3xl', delay: 0.4 },
    { emoji: '🎯', top: '25%', right: '5%', size: 'text-4xl', delay: 0.2 },
];

function stripHtml(html: string): string {
    if (!html) return "";
    return html.replace(/<\/?[^>]+(>|$)/g, "");
}

export function PitchDeckHero() {
    const [userInput, setUserInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();

    const [presentations, setPresentations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPresentations = React.useCallback(async () => {
        try {
            const res = await fetch('/api/presentation/save');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setPresentations(data);
                }
            }
        } catch (e) {
            console.error("Error fetching presentations:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchPresentations();
    }, [fetchPresentations]);

    const handleDelete = async () => {
        if (!presentationToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/presentation/save?id=${presentationToDelete}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Presentation deleted successfully");
                fetchPresentations();
            } else {
                toast.error("Failed to delete presentation");
            }
        } catch (e) {
            toast.error("Error deleting presentation");
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setPresentationToDelete(null);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleGenerateDeck = () => {
        if (!userInput.trim() && !selectedImage) return;
        if (selectedImage) {
            localStorage.setItem('initialPptImage', selectedImage);
        } else {
            localStorage.removeItem('initialPptImage');
        }
        router.push(`/ppt-playground?userprompt=${encodeURIComponent(userInput)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            handleGenerateDeck();
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[82vh] w-full py-16 md:py-24 overflow-hidden bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white transition-colors duration-300">
            {/* Font Import */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
            `}} />

            {/* Subtle grid background */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Subtle ambient light overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(124, 58, 237, 0.08), transparent)',
                }}
            />

            {/* Floating Emojis */}
            {floatingIcons.map((icon, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.3 + icon.delay }}
                    className={`absolute ${icon.size} select-none pointer-events-none hidden md:block z-0`}
                    style={{
                        top: icon.top,
                        left: icon.left,
                        right: icon.right,
                        bottom: icon.bottom,
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))',
                    } as React.CSSProperties}
                >
                    <motion.span
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="inline-block"
                    >
                        {icon.emoji}
                    </motion.span>
                </motion.div>
            ))}

            <div className="z-10 flex flex-col items-center w-full px-4 max-w-4xl mx-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-600 dark:text-violet-300 mb-6 shadow-sm"
                >
                    <Presentation size={14} className="text-pink-500" />
                    <span>AI Presentation & PowerPoint Builder</span>
                </motion.div>

                {/* Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="text-center"
                >
                    <h1
                        className="font-extrabold text-[2.5rem] leading-[1.1] sm:text-5xl md:text-[4rem] lg:text-[4.2rem] tracking-tight text-slate-900 dark:text-white"
                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                    >
                        Bring your{' '}
                        <span
                            className="text-transparent bg-clip-text"
                            style={{
                                backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 35%, #ec4899 70%, #f43f5e 100%)',
                                WebkitBackgroundClip: 'text',
                            }}
                        >
                            presentation
                        </span>
                        <br />
                        to reality.
                    </h1>

                    <p
                        className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal max-w-xl mx-auto leading-relaxed"
                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                    >
                        Describe your startup, product, market, or pitch idea. Our AI instantly generates a complete, professional PowerPoint deck.{' '}
                        <span className="block sm:inline font-medium text-slate-900 dark:text-white">Export to .pptx in 1-click.</span>
                    </p>
                </motion.div>

                {/* Prompt Card */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
                    className="w-full max-w-2xl mt-10 relative"
                >
                    <div
                        className={`
                            relative w-full rounded-2xl bg-white dark:bg-zinc-900
                            shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]
                            dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]
                            transition-all duration-300
                            ${isFocused
                                ? 'shadow-[0_6px_32px_-4px_rgba(139,92,246,0.18)] ring-2 ring-violet-400 dark:ring-violet-500/40'
                                : 'ring-1 ring-slate-200 dark:ring-white/[0.1]'
                            }
                        `}
                    >
                        <div className="flex flex-col px-5 pt-5 pb-3">
                            <AnimatePresence>
                                {selectedImage && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.85 }}
                                        className="relative w-20 h-20 mb-3"
                                    >
                                        <img
                                            src={selectedImage}
                                            alt="Upload preview"
                                            className="w-full h-full object-cover rounded-xl border border-violet-400 shadow-sm"
                                        />
                                        <button
                                            onClick={() => setSelectedImage(null)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <textarea
                                placeholder="Describe your presentation topic or pitch deck outline (e.g. Fintech seed deck raising $2M)..."
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={handleKeyDown}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none', fontFamily: '"DM Sans", sans-serif' }}
                                className="
                                    w-full h-24 resize-none bg-transparent
                                    text-slate-800 dark:text-slate-100
                                    placeholder-slate-400 dark:placeholder-slate-500
                                    text-base font-normal leading-relaxed focus:outline-none focus:ring-0
                                "
                            />

                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                            text-slate-600 dark:text-slate-300
                                            hover:bg-slate-100 dark:hover:bg-white/[0.06]
                                            transition-colors duration-200
                                        "
                                    >
                                        <ImageIcon size={14} />
                                        <span>Attach Image</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                            text-slate-600 dark:text-slate-300
                                            hover:bg-slate-100 dark:hover:bg-white/[0.06]
                                            transition-colors duration-200
                                        "
                                    >
                                        <Wand2 size={14} />
                                        <span>16:9 Presentation</span>
                                    </button>
                                </div>

                                <button
                                    disabled={!userInput.trim() && !selectedImage}
                                    onClick={handleGenerateDeck}
                                    className={`
                                        w-9 h-9 rounded-full flex items-center justify-center
                                        transition-all duration-300
                                        ${!userInput.trim() && !selectedImage
                                            ? 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed'
                                            : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/30 hover:scale-105 active:scale-95'
                                        }
                                    `}
                                >
                                    <SendHorizontal size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Suggestions */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
                    className="mt-6 flex flex-wrap items-center justify-center gap-2"
                >
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                        Try one preset&nbsp;&nbsp;→
                    </span>
                    {pitchDeckSuggestions.map((suggestion, index) => (
                        <motion.button
                            key={index}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                router.push(`/ppt-playground?userprompt=${encodeURIComponent(suggestion.prompt)}`);
                            }}
                            className="
                                px-3.5 py-1.5 rounded-full text-xs font-medium
                                text-slate-700 dark:text-slate-200
                                bg-white dark:bg-zinc-800
                                border border-slate-200 dark:border-white/[0.1]
                                hover:border-violet-400 dark:hover:border-violet-500/50
                                shadow-sm hover:shadow transition-all duration-200
                            "
                        >
                            {suggestion.label}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Saved Presentations Section */}
                <div className="w-full mt-20 border-t border-slate-200/50 dark:border-white/[0.08] pt-12">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
                                <Presentation size={18} />
                            </div>
                            <div className="text-left">
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                                    Your Saved Presentations
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Click to edit or present your saved decks
                                </p>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
                            <Loader2 className="animate-spin text-violet-500" size={24} />
                            <span className="text-sm font-medium">Loading saved presentations...</span>
                        </div>
                    ) : presentations.length > 0 ? (
                        <motion.div 
                            initial="hidden"
                            animate="show"
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.08
                                    }
                                }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left"
                        >
                            {presentations.map((p) => {
                                const slideCount = Array.isArray(p.slides) ? p.slides.length : 0;
                                return (
                                    <motion.div
                                        key={p.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 16 },
                                            show: { opacity: 1, y: 0 }
                                        }}
                                        whileHover={{ y: -4 }}
                                        className="
                                            group relative rounded-2xl bg-white dark:bg-zinc-900/50 backdrop-blur-md
                                            border border-slate-200 dark:border-white/[0.06] hover:border-violet-500/40 dark:hover:border-violet-500/40
                                            shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between
                                        "
                                    >
                                        <div className="p-5">
                                            {/* Preview Placeholder or First Slide Mini-Preview */}
                                            <div className="w-full h-32 rounded-xl mb-4 relative overflow-hidden bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-white/[0.04] flex items-center justify-center">
                                                {Array.isArray(p.slides) && p.slides.length > 0 ? (
                                                    <div 
                                                        className="w-full h-full p-3 select-none pointer-events-none overflow-hidden relative text-left flex flex-col justify-between"
                                                        style={{
                                                            ...(p.slides[0].backgroundGradient ? { background: p.slides[0].backgroundGradient } : {}),
                                                            ...(p.slides[0].backgroundColor && !p.slides[0].backgroundGradient ? { backgroundColor: p.slides[0].backgroundColor } : {}),
                                                            ...(!p.slides[0].backgroundGradient && !p.slides[0].backgroundColor ? { background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)' } : {})
                                                        }}
                                                    >
                                                        {/* Ambient lighting inside thumbnail */}
                                                        {!p.slides[0].backgroundGradient && !p.slides[0].backgroundColor && (
                                                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-violet-500/10 via-transparent to-pink-500/10" />
                                                        )}

                                                        {p.slides[0].image ? (
                                                            <div className="flex gap-2.5 h-full w-full items-center justify-between">
                                                                <div className="flex-1 flex flex-col justify-between h-full min-w-0 py-0.5">
                                                                    <div className="space-y-1">
                                                                        {p.slides[0].badge && (
                                                                            <span className="inline-block px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold text-[6px] uppercase tracking-wider truncate max-w-full">
                                                                                {p.slides[0].badge}
                                                                            </span>
                                                                        )}
                                                                        <div 
                                                                            className="font-bold text-slate-800 dark:text-slate-150 leading-tight text-[8px] sm:text-[9px] line-clamp-3"
                                                                            dangerouslySetInnerHTML={{ __html: p.slides[0].title || '' }}
                                                                        />
                                                                    </div>
                                                                    {p.slides[0].subtitle && (
                                                                        <div className="text-slate-550 dark:text-slate-400 truncate text-[6px] leading-tight font-medium">
                                                                            {stripHtml(p.slides[0].subtitle)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="w-[38%] h-[85%] rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 shrink-0 shadow-sm">
                                                                    <img 
                                                                        src={p.slides[0].image} 
                                                                        alt="" 
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            if (!target.src.endsWith('/1.jpg')) {
                                                                                target.src = '/1.jpg';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col justify-between h-full w-full py-0.5">
                                                                <div className="space-y-1">
                                                                    {p.slides[0].badge && (
                                                                        <span className="inline-block px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold text-[6px] uppercase tracking-wider truncate max-w-full">
                                                                            {p.slides[0].badge}
                                                                        </span>
                                                                    )}
                                                                    <div 
                                                                        className="font-extrabold text-slate-800 dark:text-slate-150 leading-snug text-[10px] sm:text-[11px] line-clamp-2"
                                                                        dangerouslySetInnerHTML={{ __html: p.slides[0].title || '' }}
                                                                    />
                                                                </div>
                                                                {p.slides[0].subtitle && (
                                                                    <div className="text-slate-555 dark:text-slate-450 line-clamp-2 text-[7px] leading-relaxed font-medium">
                                                                        {stripHtml(p.slides[0].subtitle)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="absolute flex items-center gap-1.5 bottom-2 left-2 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-white/[0.05] text-[8px] font-bold text-slate-600 dark:text-slate-350 font-mono">
                                                            <span>{slideCount} Slides</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-pink-500/5 group-hover:scale-105 transition-transform duration-500" />
                                                        {/* Mini mock slides display */}
                                                        <div className="flex gap-1 opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-300">
                                                            <div className="w-14 h-9 rounded bg-violet-500 rotate-[-8deg] translate-x-2" />
                                                            <div className="w-14 h-9 rounded bg-pink-500 z-10 scale-110 shadow-lg" />
                                                            <div className="w-14 h-9 rounded bg-fuchsia-500 rotate-[8deg] translate-x-[-8px]" />
                                                        </div>
                                                        <div className="absolute flex items-center gap-1.5 bottom-3 left-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/[0.05] text-[10px] font-bold text-slate-600 dark:text-slate-350 font-mono">
                                                            <span>{slideCount} Slides</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" title={stripHtml(p.name)}>
                                                {stripHtml(p.name)}
                                            </h3>
                                            
                                            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 dark:text-slate-550 font-mono">
                                                <Clock size={12} />
                                                <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between px-5 pb-5 pt-2 border-t border-slate-100 dark:border-white/[0.03]">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/ppt-playground?projectId=${p.id}`)}
                                                    className="
                                                        flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                                        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5
                                                        transition-colors duration-200
                                                    "
                                                >
                                                    <span>Edit</span>
                                                    <ArrowUpRight size={13} />
                                                </button>

                                                <button
                                                    onClick={() => router.push(`/ppt-playground?projectId=${p.id}&play=true`)}
                                                    className="
                                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                                                        bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-sm hover:shadow
                                                        transition-all duration-200
                                                    "
                                                >
                                                    <Play size={12} className="fill-current text-white" />
                                                    <span>Play</span>
                                                </button>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPresentationToDelete(p.id);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="
                                                    p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
                                                    transition-all duration-200
                                                "
                                                title="Delete Presentation"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <div className="w-full text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-white/30 dark:bg-zinc-900/10">
                            <Presentation className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                No saved presentations yet.
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                                Generate one using the prompt box above and save it to see it listed here!
                            </p>
                        </div>
                    )}
                </div>

                <ConfirmDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    onConfirm={handleDelete}
                    title="Delete Presentation"
                    description="Are you sure you want to delete this presentation? This action cannot be undone."
                    confirmText="Delete"
                    isDestructive={true}
                    isLoading={isDeleting}
                />
            </div>
        </div>
    );
}
