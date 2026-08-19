"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { showDemoAlert } from "@/components/ui/demo-alert-dialog";
import { AVAILABLE_MODELS } from "@/lib/models";
import {
    Instagram,
    MessageSquare,
    Calendar,
    Settings,
    Send,
    RefreshCw,
    Plus,
    X,
    Search,
    Bot,
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    Sliders,
    MessageCircle,
    Info,
    Trash2,
    CalendarDays,
    Radio,
    Sparkles,
    CheckCheck,
    AlertTriangle,
    Eye,
    Film,
    Sparkle
} from "lucide-react";

interface InstagramSettings {
    user_email: string;
    is_active: boolean;
    instagram_business_account_id: string | null;
    page_access_token: string | null;
    username: string;
    system_prompt: string;
    model_id: string;
    tone: string;
    personality: string;
    dm_reply_behavior: 'auto' | 'manual';
    comment_reply_behavior: 'auto' | 'manual';
    response_delay: number;
}

interface InstagramPost {
    id: string;
    media_url: string;
    caption: string;
    scheduled_at: string;
    published_at: string | null;
    status: 'scheduled' | 'published' | 'failed';
    error_message: string | null;
}

interface DMLog {
    id: string;
    sender_id: string;
    sender_username: string;
    message_text: string;
    reply_text: string | null;
    tokens_consumed: number;
    status: 'success' | 'failed';
    error_message: string | null;
    created_at: string;
}

interface CommentLog {
    id: string;
    post_id: string;
    post_caption: string;
    comment_id: string;
    commenter_username: string;
    comment_text: string;
    reply_text: string | null;
    tokens_consumed: number;
    status: 'success' | 'failed';
    error_message: string | null;
    created_at: string;
}

export default function InstagramAgentPage() {
    // Tabs & views
    const [activeTab, setActiveTab] = useState<'scheduler' | 'dms' | 'comments' | 'settings'>('scheduler');
    
    // API State
    const [settings, setSettings] = useState<InstagramSettings | null>(null);
    const [posts, setPosts] = useState<InstagramPost[]>([]);
    const [dmLogs, setDmLogs] = useState<DMLog[]>([]);
    const [commentLogs, setCommentLogs] = useState<CommentLog[]>([]);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [runningCron, setRunningCron] = useState(false);
    const [schedulingPost, setSchedulingPost] = useState(false);

    // Form inputs
    const [systemPrompt, setSystemPrompt] = useState("");
    const [modelId, setModelId] = useState("gemini-2.5-flash");
    const [tone, setTone] = useState("friendly");
    const [personality, setPersonality] = useState("professional");
    const [dmReplyBehavior, setDmReplyBehavior] = useState<'auto' | 'manual'>("auto");
    const [commentReplyBehavior, setCommentReplyBehavior] = useState<'auto' | 'manual'>("auto");
    const [responseDelay, setResponseDelay] = useState(0);
    const [username, setUsername] = useState("mock_instagram_user");
    const [instagramBusinessAccountId, setInstagramBusinessAccountId] = useState("");
    const [pageAccessToken, setPageAccessToken] = useState("");

    // Create Scheduled Post inputs
    const [newMediaUrl, setNewMediaUrl] = useState("");
    const [newCaption, setNewCaption] = useState("");
    const [newScheduledAt, setNewScheduledAt] = useState("");
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // AI content generation states in Scheduler Modal
    const [mediaSource, setMediaSource] = useState<'manual' | 'ai-image' | 'ai-video'>('manual');
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [generatedMediaUrl, setGeneratedMediaUrl] = useState("");

    // Simulator states: DMs
    const [selectedContact, setSelectedContact] = useState<string | null>(null);
    const [dmSearchQuery, setDmSearchQuery] = useState("");
    const [simulatedMessageText, setSimulatedMessageText] = useState("");
    const [simulatingDM, setSimulatingDM] = useState(false);

    // Simulator states: Comments
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [simulatedCommenter, setSimulatedCommenter] = useState("happy_customer");
    const [simulatedCommentText, setSimulatedCommentText] = useState("");
    const [simulatingComment, setSimulatingComment] = useState(false);

    const { toast } = useToast();
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const isDemoMode = typeof window !== "undefined" && window.location.href.includes("mounikai.com");

    // Initial Fetch
    useEffect(() => {
        fetchAllData();
    }, []);

    // Scroll chat simulator to end
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [dmLogs, selectedContact]);

    // Cleanup background polling if modal is closed or component is unmounted
    useEffect(() => {
        return () => {
            if ((window as any)._schedulerModalPoll) {
                clearInterval((window as any)._schedulerModalPoll);
            }
        };
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchSettings(),
                fetchPosts(),
                fetchLogs()
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/social/instagram/settings");
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.settings) {
                setSettings(data.settings);
                setSystemPrompt(data.settings.system_prompt);
                setModelId(data.settings.model_id);
                setTone(data.settings.tone);
                setPersonality(data.settings.personality);
                setDmReplyBehavior(data.settings.dm_reply_behavior);
                setCommentReplyBehavior(data.settings.comment_reply_behavior);
                setResponseDelay(data.settings.response_delay);
                setUsername(data.settings.username);
                setInstagramBusinessAccountId(data.settings.instagram_business_account_id || "");
                setPageAccessToken(data.settings.page_access_token || "");
            }
        } catch (e: any) {
            toast({
                title: "Error fetching settings",
                description: e.message,
                variant: "destructive"
            });
        }
    };

    const fetchPosts = async () => {
        try {
            const res = await fetch("/api/social/instagram/schedule");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setPosts(data.posts || []);
        } catch (e: any) {
            console.error("Error loading posts:", e);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/social/instagram/logs");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDmLogs(data.dms || []);
            setCommentLogs(data.comments || []);
        } catch (e: any) {
            console.error("Error loading logs:", e);
        }
    };

    const handleSaveSettings = async () => {
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        setSavingSettings(true);
        try {
            const res = await fetch("/api/social/instagram/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemPrompt,
                    modelId,
                    tone,
                    personality,
                    dmReplyBehavior,
                    commentReplyBehavior,
                    responseDelay,
                    username,
                    instagramBusinessAccountId,
                    pageAccessToken,
                    isActive: settings?.is_active
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSettings(data.settings);
            toast({
                title: "Settings Saved",
                description: "Instagram Agent settings have been successfully updated."
            });
        } catch (e: any) {
            toast({
                title: "Save Failed",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleConnectAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        try {
            const res = await fetch("/api/social/instagram/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instagramBusinessAccountId,
                    pageAccessToken,
                    username
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSettings(data.settings);
            toast({
                title: "Connected",
                description: `Successfully linked to Instagram account @${username}.`
            });
        } catch (e: any) {
            toast({
                title: "Connection Failed",
                description: e.message,
                variant: "destructive"
            });
        }
    };

    const handleDisconnectAccount = async () => {
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        try {
            const res = await fetch("/api/social/instagram/connect", {
                method: "DELETE"
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSettings(data.settings);
            setInstagramBusinessAccountId("");
            setPageAccessToken("");
            toast({
                title: "Disconnected",
                description: "Instagram account unlinked successfully."
            });
        } catch (e: any) {
            toast({
                title: "Disconnect Failed",
                description: e.message,
                variant: "destructive"
            });
        }
    };

    const handleSchedulePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        if (!newMediaUrl.trim() || !newScheduledAt) {
            toast({
                title: "Missing Info",
                description: "Please specify media content (or generate with AI) and publication time.",
                variant: "destructive"
            });
            return;
        }

        setSchedulingPost(true);
        try {
            const res = await fetch("/api/social/instagram/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mediaUrl: newMediaUrl,
                    caption: newCaption,
                    scheduledAt: newScheduledAt
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast({
                title: "Post Scheduled",
                description: "Post queued successfully."
            });
            setShowScheduleModal(false);
            setNewMediaUrl("");
            setNewCaption("");
            setNewScheduledAt("");
            setMediaSource("manual");
            setAiPrompt("");
            setGeneratedMediaUrl("");
            fetchPosts();
        } catch (e: any) {
            toast({
                title: "Scheduling Failed",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setSchedulingPost(false);
        }
    };

    const handleDeletePost = async (id: string) => {
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        try {
            const res = await fetch(`/api/social/instagram/schedule?id=${id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast({
                title: "Post Canceled",
                description: "Post has been removed from the schedule."
            });
            fetchPosts();
        } catch (e: any) {
            toast({
                title: "Cancelation Failed",
                description: e.message,
                variant: "destructive"
            });
        }
    };

    const handleRunCron = async () => {
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        setRunningCron(true);
        try {
            const res = await fetch("/api/social/instagram/scheduler-cron", { method: "POST" });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast({
                title: "Scheduler Executed",
                description: `Processed ${data.processed} due posts. Check logs for status updates.`
            });
            fetchPosts();
        } catch (e: any) {
            toast({
                title: "Execution Failed",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setRunningCron(false);
        }
    };

    const handleGenerateAIMedia = async () => {
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please enter a vision prompt for the AI.",
                variant: "destructive"
            });
            return;
        }

        setAiGenerating(true);
        setGeneratedMediaUrl("");
        setNewMediaUrl("");

        try {
            const action = mediaSource === 'ai-image' ? 'generate-image' : 'generate-reel';
            const res = await fetch('/api/marketing', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    prompt: aiPrompt,
                    options: mediaSource === 'ai-image' ? {
                        size: '1:1',
                        isEnhance: true
                    } : {
                        ratio: '9:16',
                        resolution: '480p',
                        duration: 6,
                        mode: 'normal',
                        seed: Math.floor(Math.random() * 1000000)
                    }
                })
            });

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to start media generation.");
            }

            const taskId = mediaSource === 'ai-image' ? data.taskId : data.reelId;
            const type = mediaSource === 'ai-image' ? 'image' : 'reel';

            toast({
                title: "AI Production Started",
                description: "Media is rendering. Please wait..."
            });

            // Poll for results
            const pollInterval = setInterval(async () => {
                try {
                    const pollUrl = type === 'image' 
                        ? `/api/marketing?action=poll&taskId=${taskId}&type=image`
                        : `/api/marketing?action=poll-reel&reelId=${taskId}`;
                    
                    const pollRes = await fetch(pollUrl);
                    const pollData = await pollRes.json();

                    if (type === 'image') {
                        if (pollData.state === 'success') {
                            clearInterval(pollInterval);
                            const url = pollData.resultUrls[0];
                            setGeneratedMediaUrl(url);
                            setNewMediaUrl(url);
                            setAiGenerating(false);
                            toast({
                                title: "AI Image Ready",
                                description: "Visual successfully generated and attached to schedule."
                            });
                        } else if (pollData.state === 'failed') {
                            clearInterval(pollInterval);
                            setAiGenerating(false);
                            toast({
                                title: "Generation Failed",
                                description: pollData.error || "Image generation failed.",
                                variant: "destructive"
                            });
                        }
                    } else {
                        if (pollData.status === 'success') {
                            clearInterval(pollInterval);
                            const url = pollData.result_url;
                            setGeneratedMediaUrl(url);
                            setNewMediaUrl(url);
                            setAiGenerating(false);
                            toast({
                                title: "AI Reel Ready",
                                description: "Video successfully generated and attached to schedule."
                            });
                        } else if (pollData.status === 'failed') {
                            clearInterval(pollInterval);
                            setAiGenerating(false);
                            toast({
                                title: "Generation Failed",
                                description: "Reel generation failed.",
                                variant: "destructive"
                            });
                        }
                    }
                } catch (err: any) {
                    console.error("Polling error in scheduler modal:", err);
                }
            }, 5000);

            // Store in ref to cancel if modal is closed
            (window as any)._schedulerModalPoll = pollInterval;

        } catch (e: any) {
            setAiGenerating(false);
            toast({
                title: "Generation Failed",
                description: e.message,
                variant: "destructive"
            });
        }
    };

    const handleSimulateDM = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        if (!selectedContact || !simulatedMessageText.trim()) return;

        setSimulatingDM(true);
        try {
            const res = await fetch("/api/social/instagram/simulator/dm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senderUsername: selectedContact,
                    messageText: simulatedMessageText
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSimulatedMessageText("");
            await fetchLogs();
            toast({
                title: "Simulated message processed",
                description: "Check the conversation bubble for response."
            });
        } catch (e: any) {
            toast({
                title: "Simulation Error",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setSimulatingDM(false);
        }
    };

    const handleSimulateComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isDemoMode) {
            showDemoAlert();
            return;
        }
        if (!selectedPostId || !simulatedCommentText.trim()) return;

        setSimulatingComment(true);
        const post = posts.find(p => p.id === selectedPostId);
        try {
            const res = await fetch("/api/social/instagram/simulator/comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId: selectedPostId,
                    postCaption: post?.caption || 'Mock Instagram Post',
                    commenterUsername: simulatedCommenter,
                    commentText: simulatedCommentText
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSimulatedCommentText("");
            await fetchLogs();
            toast({
                title: "Comment reply simulated",
                description: "AI auto-reply added to comment logs."
            });
        } catch (e: any) {
            toast({
                title: "Simulation Error",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setSimulatingComment(false);
        }
    };

    // Helper: Group DM logs into conversations by sender_username
    const getConversations = () => {
        const groups: Record<string, { username: string; lastMessage: string; timestamp: string }> = {};
        dmLogs.forEach(log => {
            const key = log.sender_username;
            if (!groups[key] || new Date(log.created_at) > new Date(groups[key].timestamp)) {
                groups[key] = {
                    username: key,
                    lastMessage: log.reply_text ? `AI: ${log.reply_text}` : log.message_text,
                    timestamp: log.created_at
                };
            }
        });
        return Object.values(groups).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const getSelectedConversationMessages = () => {
        if (!selectedContact) return [];
        return dmLogs
            .filter(log => log.sender_username === selectedContact)
            .flatMap(log => {
                const msgs = [];
                // Client message
                msgs.push({
                    id: `${log.id}-in`,
                    text: log.message_text,
                    direction: 'inbound',
                    timestamp: log.created_at,
                    type: 'message'
                });
                // AI/Manual response
                if (log.reply_text) {
                    msgs.push({
                        id: `${log.id}-out`,
                        text: log.reply_text,
                        direction: 'outbound',
                        timestamp: log.created_at,
                        type: log.status === 'success' ? 'auto_reply' : 'error',
                        error: log.error_message,
                        tokens: log.tokens_consumed
                    });
                } else if (log.status === 'failed') {
                    msgs.push({
                        id: `${log.id}-err`,
                        text: `Auto-reply failed: ${log.error_message}`,
                        direction: 'system',
                        timestamp: log.created_at,
                        type: 'system'
                    });
                }
                return msgs;
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    // Filter conversations
    const filteredConversations = getConversations().filter(c => 
        c.username.toLowerCase().includes(dmSearchQuery.toLowerCase())
    );

    // Auto-select first contact if none selected
    useEffect(() => {
        const convs = getConversations();
        if (convs.length > 0 && !selectedContact) {
            setSelectedContact(convs[0].username);
        }
    }, [dmLogs]);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-rose-500/5 via-background to-background text-foreground font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-600/5 dark:bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-rose-600/5 dark:bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />

            {/* Top Bar / Header */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 px-6 py-4 bg-card/65 backdrop-blur-md">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white">
                            <Instagram className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 
                                className="text-2xl font-bold tracking-tight bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-500 bg-clip-text text-transparent"
                                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                            >
                                Instagram Agent Control
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                <Radio className={`w-3.5 h-3.5 ${settings?.is_active ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
                                <span>Status: {settings?.is_active ? `@${settings?.username || 'mock_instagram_user'} (Active)` : 'Offline'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Tabs Navigation */}
                <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border/80">
                    {[
                        { id: 'scheduler', label: 'Scheduler', icon: CalendarDays },
                        { id: 'dms', label: 'DMs Auto-Reply', icon: MessageSquare },
                        { id: 'comments', label: 'Comment Reply', icon: MessageCircle },
                        { id: 'settings', label: 'Settings', icon: Sliders },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    active 
                                        ? 'bg-gradient-to-tr from-fuchsia-600 to-rose-600 text-white shadow-md' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 justify-center relative z-10">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                        <p className="text-sm font-medium">Synchronizing Instagram Agent state...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        
                        {/* 1. SCHEDULER VIEW */}
                        {activeTab === 'scheduler' && (
                            <motion.div 
                                key="scheduler" 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -15 }} 
                                transition={{ duration: 0.25 }}
                                className="flex-1 flex flex-col min-h-0 gap-6"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Scheduled Post Queue</h2>
                                        <p className="text-xs text-muted-foreground">Create, monitor, and publish scheduled images and reels.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleRunCron}
                                            disabled={runningCron}
                                            className="border-border/60 bg-background text-foreground hover:bg-muted flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${runningCron ? 'animate-spin' : ''}`} />
                                            Run Cron
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                setShowScheduleModal(true);
                                                setMediaSource("manual");
                                                setNewMediaUrl("");
                                                setAiPrompt("");
                                                setGeneratedMediaUrl("");
                                            }}
                                            className="bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white flex items-center gap-2 shadow-md shadow-rose-600/10"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Schedule Post
                                        </Button>
                                    </div>
                                </div>

                                {/* Post Grid List */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                    {posts.length === 0 ? (
                                        <div className="h-64 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                            <Calendar className="w-12 h-12 stroke-[1.2] mb-3 text-muted-foreground/60" />
                                            <p className="text-sm font-semibold">No posts scheduled</p>
                                            <p className="text-xs max-w-sm mt-1">Get started by clicking the "Schedule Post" button and scheduling media content.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                                            {posts.map((post) => (
                                                <Card key={post.id} className="bg-card border border-border/60 overflow-hidden flex flex-col backdrop-blur-xl group hover:border-rose-500/20 transition-all duration-300 shadow-sm">
                                                    {/* Card Media Preview */}
                                                    <div className="h-48 relative overflow-hidden bg-muted">
                                                        {post.media_url.endsWith(".mp4") || post.media_url.includes("mp4") || post.media_url.includes("video") ? (
                                                            <video 
                                                                src={post.media_url} 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                muted
                                                                controls
                                                            />
                                                        ) : (
                                                            <img 
                                                                src={post.media_url} 
                                                                alt="Scheduled Media" 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600";
                                                                }}
                                                            />
                                                        )}
                                                        {/* Status overlay */}
                                                        <div className="absolute top-3 right-3">
                                                            {post.status === 'published' && (
                                                                <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Published
                                                                </Badge>
                                                            )}
                                                            {post.status === 'scheduled' && (
                                                                <Badge className="bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    Scheduled
                                                                </Badge>
                                                            )}
                                                            {post.status === 'failed' && (
                                                                <Badge className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Failed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                                                        <div className="space-y-2">
                                                            <p className="text-xs text-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
                                                                {post.caption || <span className="italic text-muted-foreground">No caption provided.</span>}
                                                            </p>
                                                        </div>

                                                        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5 text-rose-500/70" />
                                                                <span>
                                                                    {post.status === 'published' 
                                                                        ? `Published: ${new Date(post.published_at!).toLocaleString()}` 
                                                                        : `Schedule: ${new Date(post.scheduled_at).toLocaleString()}`}
                                                                </span>
                                                            </div>

                                                            {post.status === 'scheduled' && (
                                                                <button 
                                                                    onClick={() => handleDeletePost(post.id)}
                                                                    className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                                                                    title="Cancel Schedule"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {post.error_message && (
                                                            <div className="mt-2 p-2 rounded bg-red-500/5 border border-red-500/20 text-[10px] text-red-500 dark:text-red-400 flex items-start gap-1.5">
                                                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                                <span>{post.error_message}</span>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 2. DMs ACTIVE CHATS & SIMULATOR */}
                        {activeTab === 'dms' && (
                            <motion.div 
                                key="dms" 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -15 }} 
                                transition={{ duration: 0.25 }}
                                className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 border border-border/60 rounded-2xl overflow-hidden bg-card/35 backdrop-blur-xl shadow-xl"
                            >
                                {/* Left Panel: Active Conversations (Col span 3) */}
                                <div className="lg:col-span-3 flex flex-col min-h-0 border-r border-border/60 bg-muted/10">
                                    <div className="p-4 border-b border-border/20 space-y-3">
                                        <h3 className="text-sm font-semibold tracking-wide text-foreground/80" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                            Active DMs
                                        </h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
                                            <Input
                                                placeholder="Search user..."
                                                value={dmSearchQuery}
                                                onChange={(e) => setDmSearchQuery(e.target.value)}
                                                className="pl-9 h-9 text-xs bg-background border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-rose-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Conversations List */}
                                    <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/10">
                                        {filteredConversations.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-muted-foreground italic">
                                                No simulated chats found. Send a message on the simulator to start!
                                            </div>
                                        ) : (
                                            filteredConversations.map((conv) => {
                                                const active = selectedContact === conv.username;
                                                return (
                                                    <button
                                                        key={conv.username}
                                                        onClick={() => setSelectedContact(conv.username)}
                                                        className={`w-full flex items-start gap-3 p-4 text-left transition-all ${
                                                            active 
                                                                ? 'bg-rose-500/10 border-l-4 border-rose-500' 
                                                                : 'hover:bg-muted/40 border-l-4 border-transparent'
                                                        }`}
                                                    >
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-fuchsia-600 to-rose-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                                                            {conv.username.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className="text-xs font-bold text-foreground truncate">@{conv.username}</span>
                                                                <span className="text-[10px] text-muted-foreground/75 shrink-0">
                                                                    {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground truncate">{conv.lastMessage}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Center Panel: DM Log History (Col span 5) */}
                                <div className="lg:col-span-5 flex flex-col min-h-0 bg-background/50">
                                    {selectedContact ? (
                                        <>
                                            {/* Header */}
                                            <div className="px-6 py-4 border-b border-border/40 bg-card/40 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-600 to-rose-600 flex items-center justify-center font-bold text-xs text-white">
                                                        {selectedContact.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-foreground">@{selectedContact}</h3>
                                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            AI Reply Auto-active
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Messages */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-muted/5">
                                                {getSelectedConversationMessages().map((msg) => {
                                                    const isSystem = msg.type === 'system';
                                                    if (isSystem) {
                                                        return (
                                                            <div key={msg.id} className="flex justify-center">
                                                                <div className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-500 dark:text-red-400 max-w-xs text-center flex items-center gap-1.5">
                                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>{msg.text}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    const isInbound = msg.direction === 'inbound';
                                                    return (
                                                        <div key={msg.id} className={`flex w-full ${isInbound ? 'justify-start' : 'justify-end'}`}>
                                                            <div className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-md ${
                                                                isInbound 
                                                                    ? 'bg-muted/90 border border-border/60 text-foreground rounded-tl-none' 
                                                                    : msg.type === 'error'
                                                                        ? 'bg-red-500/10 border border-red-500/20 text-red-500 rounded-tr-none'
                                                                        : 'bg-gradient-to-tr from-fuchsia-600 to-rose-600 text-white rounded-tr-none'
                                                            }`}>
                                                                {isInbound && (
                                                                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-1">@{selectedContact}</div>
                                                                )}
                                                                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                                                                <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] opacity-75">
                                                                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    {!isInbound && (
                                                                        <>
                                                                            <Badge className="bg-black/35 text-[8px] py-0 border-none text-rose-300">
                                                                                AI {msg.tokens ? `(-${msg.tokens}T)` : ''}
                                                                            </Badge>
                                                                            <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div ref={chatEndRef} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                            <MessageSquare className="w-12 h-12 stroke-[1.2] mb-3 text-muted-foreground/60" />
                                            <p className="text-sm font-semibold">Select a conversation</p>
                                            <p className="text-xs max-w-xs mt-1">Click a contact on the left or use the sandbox simulator on the right to start a chat.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Panel: Sandbox Simulator (Col span 4) */}
                                <div className="lg:col-span-4 flex flex-col min-h-0 border-l border-border/60 bg-muted/10 p-4 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-foreground">
                                            <Sparkles className="w-4 h-4 text-rose-500" />
                                            <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                                DM Sandbox Simulator
                                            </h3>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-normal">
                                            Test your AI auto-replies instantly by sending simulated direct messages as a customer.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSimulateDM} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="sim-contact" className="text-xs text-muted-foreground">Simulator Client Name (Username)</Label>
                                            <Input
                                                id="sim-contact"
                                                placeholder="e.g. fashion_influencer"
                                                value={selectedContact || ""}
                                                onChange={(e) => setSelectedContact(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                className="bg-background border-border text-xs text-foreground h-9"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="sim-msg" className="text-xs text-muted-foreground">Incoming DM Text</Label>
                                            <Textarea
                                                id="sim-msg"
                                                placeholder="Type message as the client..."
                                                value={simulatedMessageText}
                                                onChange={(e) => setSimulatedMessageText(e.target.value)}
                                                rows={4}
                                                className="bg-background border-border text-xs text-foreground resize-none leading-relaxed"
                                                required
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={simulatingDM || !simulatedMessageText.trim()}
                                            className="w-full bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white text-xs h-9 shadow-md flex items-center justify-center gap-2"
                                        >
                                            {simulatingDM ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    AI Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-3.5 h-3.5" />
                                                    Send Message as Customer
                                                </>
                                            )}
                                        </Button>
                                    </form>

                                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                                        <div className="flex gap-2 items-start">
                                            <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                            <div className="text-[10px] text-muted-foreground leading-normal">
                                                <strong className="text-foreground">How it works:</strong> Clicking send hits the simulator API, generates a response with your prompt, charges 5 tokens, and updates logs.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 3. COMMENT AUTO-REPLY */}
                        {activeTab === 'comments' && (
                            <motion.div 
                                key="comments" 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -15 }} 
                                transition={{ duration: 0.25 }}
                                className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 border border-border/60 rounded-2xl overflow-hidden bg-card/35 backdrop-blur-xl shadow-xl"
                            >
                                {/* Left Panel: Published Posts list (Col span 4) */}
                                <div className="lg:col-span-4 flex flex-col min-h-0 border-r border-border/60 bg-muted/10 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold tracking-wide text-foreground/80" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                        Select Post
                                    </h3>
                                    
                                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
                                        {posts.filter(p => p.status === 'published').length === 0 ? (
                                            <div className="text-center text-xs text-muted-foreground italic py-10">
                                                No published posts found. Go to Scheduler to publish a post first.
                                            </div>
                                        ) : (
                                            posts.filter(p => p.status === 'published').map(post => {
                                                const active = selectedPostId === post.id;
                                                return (
                                                    <button
                                                        key={post.id}
                                                        onClick={() => setSelectedPostId(post.id)}
                                                        className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                                                            active 
                                                                ? 'bg-rose-500/10 border-rose-500/30 shadow-md' 
                                                                : 'bg-card border-border/40 hover:bg-muted/40'
                                                        }`}
                                                    >
                                                        <img 
                                                            src={post.media_url} 
                                                            alt="Post media" 
                                                            className="w-12 h-12 object-cover rounded-lg bg-muted shrink-0 border border-border/40"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] text-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                                                            <span className="text-[9px] text-muted-foreground mt-1 block">
                                                                Published: {new Date(post.published_at!).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Center Panel: Comments Thread log (Col span 4) */}
                                <div className="lg:col-span-4 flex flex-col min-h-0 bg-background/50">
                                    {selectedPostId ? (
                                        <>
                                            <div className="px-4 py-3.5 border-b border-border/40 bg-card/40">
                                                <h3 className="text-xs font-bold text-foreground">Comment Thread</h3>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-muted/5">
                                                {commentLogs.filter(log => log.post_id === selectedPostId).length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                                                        <MessageCircle className="w-8 h-8 stroke-[1.2] mb-2 opacity-30" />
                                                        <p className="text-xs italic">No comments simulated on this post.</p>
                                                    </div>
                                                ) : (
                                                    commentLogs
                                                        .filter(log => log.post_id === selectedPostId)
                                                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                                        .map(log => (
                                                            <div key={log.id} className="space-y-2 border-b border-border/20 pb-3">
                                                                {/* Incoming comment */}
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-foreground">@{log.commenter_username}</span>
                                                                        <span className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <p className="text-xs text-foreground leading-normal pl-0.5">{log.comment_text}</p>
                                                                </div>

                                                                {/* AI automated response */}
                                                                {log.reply_text ? (
                                                                    <div className="pl-4 border-l-2 border-rose-500 space-y-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                                                                                <Bot className="w-3.5 h-3.5" />
                                                                                AI Auto-reply
                                                                            </span>
                                                                            <Badge className="bg-black/35 text-[8px] py-0 border-none text-rose-300">
                                                                                -{log.tokens_consumed}T
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground leading-normal">{log.reply_text}</p>
                                                                    </div>
                                                                ) : log.status === 'failed' ? (
                                                                    <div className="pl-4 border-l-2 border-rose-500 text-[10px] text-red-500 italic">
                                                                        Auto-reply failed: {log.error_message}
                                                                    </div>
                                                                ) : (
                                                                    <div className="pl-4 border-l-2 border-border/60 text-[10px] text-muted-foreground italic">
                                                                        Manual review (AI reply offline).
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                            <Eye className="w-12 h-12 stroke-[1.2] mb-3 text-muted-foreground/60" />
                                            <p className="text-sm font-semibold">Select a published post</p>
                                            <p className="text-xs max-w-xs mt-1">Select a published media post on the left panel to manage its comment thread.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Panel: Comments Simulator (Col span 4) */}
                                <div className="lg:col-span-4 flex flex-col min-h-0 border-l border-border/60 bg-muted/10 p-4 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-foreground">
                                            <Sparkles className="w-4 h-4 text-rose-500" />
                                            <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                                Comments Sandbox Simulator
                                            </h3>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-normal">
                                            Simulate incoming user comments on your published posts to test the AI's automated thread responses.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSimulateComment} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="sim-comm-user" className="text-xs text-muted-foreground">Simulator Commenter Username</Label>
                                            <Input
                                                id="sim-comm-user"
                                                placeholder="e.g. food_blogger"
                                                value={simulatedCommenter}
                                                onChange={(e) => setSimulatedCommenter(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                className="bg-background border-border text-xs text-foreground h-9"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="sim-comm-text" className="text-xs text-muted-foreground">Comment Text</Label>
                                            <Textarea
                                                id="sim-comm-text"
                                                placeholder="Write a comment on the selected post..."
                                                value={simulatedCommentText}
                                                onChange={(e) => setSimulatedCommentText(e.target.value)}
                                                rows={4}
                                                className="bg-background border-border text-xs text-foreground resize-none leading-relaxed"
                                                required
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={simulatingComment || !selectedPostId || !simulatedCommentText.trim()}
                                            className="w-full bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white text-xs h-9 shadow-md flex items-center justify-center gap-2"
                                        >
                                            {simulatingComment ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    AI Replying...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-3.5 h-3.5" />
                                                    Simulate Comment Reply
                                                </>
                                            )}
                                        </Button>
                                    </form>

                                    {!selectedPostId && (
                                        <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>Please select a published post first to enable comment simulations.</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 4. SETTINGS VIEW */}
                        {activeTab === 'settings' && (
                            <motion.div 
                                key="settings" 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -15 }} 
                                transition={{ duration: 0.25 }}
                                className="flex-1 overflow-y-auto"
                            >
                                <div className="max-w-4xl space-y-6 pb-6">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div className="space-y-0.5">
                                            <h2 className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Agent Profile & Config</h2>
                                            <p className="text-xs text-muted-foreground">Configure AI personality variables, models, response behaviors, and access tokens.</p>
                                        </div>
                                        <Button
                                            onClick={handleSaveSettings}
                                            disabled={savingSettings}
                                            className="bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white text-xs h-9 shadow-lg shadow-rose-600/10"
                                        >
                                            {savingSettings ? 'Saving...' : 'Save Agent Config'}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* AI Persona Card */}
                                        <Card className="bg-card border border-border/60 backdrop-blur-xl shadow-sm">
                                            <CardHeader className="border-b border-border/40 py-4">
                                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <Bot className="w-4 h-4 text-rose-500" />
                                                    AI Persona Variables
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-4">
                                                
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="model" className="text-xs text-muted-foreground">AI Model</Label>
                                                    <Select value={modelId} onValueChange={setModelId}>
                                                        <SelectTrigger id="model" className="border-border bg-background text-xs text-foreground">
                                                            <SelectValue placeholder="Select model" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card border border-border text-foreground">
                                                            {AVAILABLE_MODELS.map(model => (
                                                                <SelectItem key={model.id} value={model.id} className="text-xs hover:bg-muted/40 focus:bg-muted/40 cursor-pointer">
                                                                    {model.name} ({model.provider})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="tone" className="text-xs text-muted-foreground">Tone</Label>
                                                        <Select value={tone} onValueChange={setTone}>
                                                            <SelectTrigger id="tone" className="border-border bg-background text-xs text-foreground">
                                                                <SelectValue placeholder="Select tone" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border border-border text-foreground text-xs">
                                                                {['friendly', 'professional', 'witty', 'empathetic', 'bold', 'minimalist'].map(t => (
                                                                    <SelectItem key={t} value={t} className="capitalize cursor-pointer">{t}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="personality" className="text-xs text-muted-foreground">Personality</Label>
                                                        <Select value={personality} onValueChange={setPersonality}>
                                                            <SelectTrigger id="personality" className="border-border bg-background text-xs text-foreground">
                                                                <SelectValue placeholder="Select personality" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border border-border text-foreground text-xs">
                                                                {['helpful', 'formal', 'casual', 'sales rep', 'expert'].map(p => (
                                                                    <SelectItem key={p} value={p} className="capitalize cursor-pointer">{p}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="prompt" className="text-xs text-muted-foreground">System Instruction Prompt</Label>
                                                    <Textarea
                                                        id="prompt"
                                                        value={systemPrompt}
                                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                                        rows={6}
                                                        className="border-border bg-background text-xs text-foreground resize-none leading-relaxed"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <Label htmlFor="delay" className="text-muted-foreground">Response Delay (seconds)</Label>
                                                        <span className="text-rose-500 font-bold">{responseDelay}s</span>
                                                    </div>
                                                    <Input
                                                        id="delay"
                                                        type="range"
                                                        min="0"
                                                        max="30"
                                                        value={responseDelay}
                                                        onChange={(e) => setResponseDelay(parseInt(e.target.value, 10))}
                                                        className="bg-transparent border-none h-6 p-0 cursor-pointer accent-rose-500"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Account credentials card */}
                                        <div className="space-y-6">
                                            <Card className="bg-card border border-border/60 backdrop-blur-xl shadow-sm">
                                                <CardHeader className="border-b border-border/40 py-4">
                                                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                        <Instagram className="w-4 h-4 text-rose-500" />
                                                        Instagram Integration Credentials
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <form onSubmit={handleConnectAccount} className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="acc-username" className="text-xs text-muted-foreground">Instagram Handle (Username)</Label>
                                                            <Input
                                                                id="acc-username"
                                                                placeholder="e.g. yourbrand_official"
                                                                value={username}
                                                                onChange={(e) => setUsername(e.target.value)}
                                                                className="bg-background border-border text-xs text-foreground h-9"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="acc-id" className="text-xs text-muted-foreground">Instagram Business Account ID</Label>
                                                            <Input
                                                                id="acc-id"
                                                                placeholder="1784140XXXXXXXXXX"
                                                                value={instagramBusinessAccountId}
                                                                onChange={(e) => setInstagramBusinessAccountId(e.target.value)}
                                                                className="bg-background border-border text-xs text-foreground h-9"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="acc-token" className="text-xs text-muted-foreground">Facebook Page Access Token</Label>
                                                            <Input
                                                                id="acc-token"
                                                                type="password"
                                                                placeholder="EAAGxxxxxxxxxxxxxxxx"
                                                                value={pageAccessToken}
                                                                onChange={(e) => setPageAccessToken(e.target.value)}
                                                                className="bg-background border-border text-xs text-foreground h-9"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="pt-2 flex gap-4">
                                                            <Button
                                                                type="submit"
                                                                className="flex-1 bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white text-xs h-9 shadow-md"
                                                            >
                                                                Connect Account
                                                            </Button>

                                                            {settings?.instagram_business_account_id && (
                                                                <Button
                                                                    type="button"
                                                                    onClick={handleDisconnectAccount}
                                                                    variant="outline"
                                                                    className="border-rose-500/30 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 text-xs h-9 bg-background"
                                                                >
                                                                    Disconnect
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </form>
                                                </CardContent>
                                            </Card>

                                            {/* Auto-Reply settings card */}
                                            <Card className="bg-card border border-border/60 backdrop-blur-xl shadow-sm">
                                                <CardHeader className="border-b border-border/40 py-4">
                                                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                        <Radio className="w-4 h-4 text-rose-500" />
                                                        Automation Event Rules
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <Label htmlFor="dm-reply" className="text-xs text-foreground font-semibold block">DM Auto-Reply</Label>
                                                            <span className="text-[10px] text-muted-foreground">Respond to incoming Instagram Direct Messages.</span>
                                                        </div>
                                                        <Select value={dmReplyBehavior} onValueChange={(val: any) => setDmReplyBehavior(val)}>
                                                            <SelectTrigger id="dm-reply" className="w-28 bg-background border-border text-xs text-foreground">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border border-border text-foreground text-xs">
                                                                <SelectItem value="auto" className="cursor-pointer">AI Auto</SelectItem>
                                                                <SelectItem value="manual" className="cursor-pointer">Manual</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <Label htmlFor="comment-reply" className="text-xs text-foreground font-semibold block">Comment Auto-Reply</Label>
                                                            <span className="text-[10px] text-muted-foreground">Respond to public comments on your media posts.</span>
                                                        </div>
                                                        <Select value={commentReplyBehavior} onValueChange={(val: any) => setCommentReplyBehavior(val)}>
                                                            <SelectTrigger id="comment-reply" className="w-28 bg-background border-border text-xs text-foreground">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border border-border text-foreground text-xs">
                                                                <SelectItem value="auto" className="cursor-pointer">AI Auto</SelectItem>
                                                                <SelectItem value="manual" className="cursor-pointer">Manual</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Scheduler Modal */}
            <AnimatePresence>
                {showScheduleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border border-border/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative text-foreground"
                        >
                            <button 
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    if ((window as any)._schedulerModalPoll) {
                                        clearInterval((window as any)._schedulerModalPoll);
                                    }
                                }}
                                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                    Schedule New Instagram Post
                                </h3>
                                <p className="text-xs text-muted-foreground">Queue an image or reel with a caption and date-time.</p>
                            </div>

                            {/* Media Source Tab Selector */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground font-semibold">Media Content Source</Label>
                                <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg border border-border/40">
                                    {[
                                        { id: 'manual', label: 'Manual URL' },
                                        { id: 'ai-image', label: 'AI Image' },
                                        { id: 'ai-video', label: 'AI Reel/Video' }
                                    ].map((source) => (
                                        <button
                                            key={source.id}
                                            type="button"
                                            onClick={() => {
                                                setMediaSource(source.id as any);
                                                setNewMediaUrl("");
                                                setGeneratedMediaUrl("");
                                                setAiPrompt("");
                                                setAiGenerating(false);
                                                if ((window as any)._schedulerModalPoll) {
                                                    clearInterval((window as any)._schedulerModalPoll);
                                                }
                                            }}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${
                                                mediaSource === source.id 
                                                    ? 'bg-gradient-to-tr from-fuchsia-600 to-rose-600 text-white shadow-sm' 
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {source.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSchedulePost} className="space-y-4">
                                
                                {/* Conditional Inputs based on Media Content Source */}
                                {mediaSource === 'manual' ? (
                                    <div className="space-y-1.5 animate-in fade-in duration-200">
                                        <Label htmlFor="media-url" className="text-xs text-muted-foreground">Media Image URL *</Label>
                                        <Input
                                            id="media-url"
                                            type="url"
                                            placeholder="https://images.unsplash.com/photo-..."
                                            value={newMediaUrl}
                                            onChange={(e) => setNewMediaUrl(e.target.value)}
                                            className="bg-background border-border text-xs text-foreground h-9"
                                            required
                                        />
                                        <span className="text-[10px] text-muted-foreground/80 block leading-normal">
                                            Use a public Unsplash/web image or video URL.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-in fade-in duration-200">
                                        {generatedMediaUrl ? (
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                                    Generated Media Preview
                                                </Label>
                                                <div className="border border-border/60 rounded-xl overflow-hidden aspect-video bg-muted max-h-40 flex items-center justify-center relative">
                                                    {mediaSource === 'ai-image' ? (
                                                        <img 
                                                            src={generatedMediaUrl} 
                                                            alt="AI Generated" 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <video 
                                                            src={generatedMediaUrl} 
                                                            className="w-full h-full object-cover" 
                                                            controls 
                                                            muted
                                                            autoPlay
                                                            loop
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGeneratedMediaUrl("");
                                                            setNewMediaUrl("");
                                                        }}
                                                        className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-1 rounded-full border border-white/20 transition-colors"
                                                        title="Remove Media"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : aiGenerating ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 border border-dashed border-border rounded-xl bg-muted/20">
                                                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-foreground">AI Generator Active</p>
                                                    <p className="text-[10px] text-muted-foreground max-w-[280px]">
                                                        Producing asset. Script, rendering, and content policies are being processed. This can take 15-30 seconds.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-prompt" className="text-xs text-muted-foreground">
                                                    {mediaSource === 'ai-image' ? 'Image Generation Prompt *' : 'Video/Reel Vision Prompt *'}
                                                </Label>
                                                <Textarea
                                                    id="ai-prompt"
                                                    placeholder={mediaSource === 'ai-image' 
                                                        ? "E.g. A gorgeous red velvet cupcake on a white cake stand, dramatic studio lighting..."
                                                        : "E.g. A fast-paced promotional reel for high-quality cupcake ingredients, baking visual..."
                                                    }
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                    rows={3}
                                                    className="bg-background border-border text-xs text-foreground resize-none leading-relaxed"
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={handleGenerateAIMedia}
                                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-border text-slate-200 text-xs h-9 flex items-center justify-center gap-2"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                                                    Produce with AI Generator
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="post-caption" className="text-xs text-muted-foreground">Post Caption</Label>
                                    <Textarea
                                        id="post-caption"
                                        placeholder="Write caption (emojis and hashtags are supported)..."
                                        value={newCaption}
                                        onChange={(e) => setNewCaption(e.target.value)}
                                        rows={3}
                                        className="bg-background border-border text-xs text-foreground resize-none leading-relaxed"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="scheduled-date" className="text-xs text-muted-foreground">Publication Date & Time *</Label>
                                    <Input
                                        id="scheduled-date"
                                        type="datetime-local"
                                        value={newScheduledAt}
                                        onChange={(e) => setNewScheduledAt(e.target.value)}
                                        className="bg-background border-border text-xs text-foreground h-9 cursor-pointer"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={schedulingPost || aiGenerating || !newMediaUrl.trim() || !newScheduledAt}
                                    className="w-full bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white text-xs h-9 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {schedulingPost ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Scheduling...
                                        </>
                                    ) : (
                                        <>
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            Queue Schedule
                                        </>
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
